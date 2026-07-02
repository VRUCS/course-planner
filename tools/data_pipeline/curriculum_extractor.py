"""Extract a curriculum draft from documents and optionally approve it."""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from tools.data_pipeline.curriculum_pipeline import (
    CURRICULA_PATH,
    CurriculumProgram,
    CurriculumRegistry,
    build,
    json_text,
    read_json,
)

DEFAULT_MODEL = "google/gemini-2.5-flash"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
SUPPORTED_IMAGES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
SUPPORTED_FILES = {".pdf", ".txt", ".md", *SUPPORTED_IMAGES}
MAX_SOURCE_CHARS = 120_000
MAX_IMAGES = 12
MAX_IMAGE_BYTES = 20 * 1024 * 1024


@dataclass
class SourceBundle:
    text: str
    images: list[tuple[str, bytes]]
    files: list[str]


def source_paths(path: Path) -> list[Path]:
    if path.is_file():
        paths = [path]
    elif path.is_dir():
        paths = sorted(item for item in path.iterdir() if item.is_file())
    else:
        raise ValueError(f"source does not exist: {path}")
    supported = [item for item in paths if item.suffix.lower() in SUPPORTED_FILES]
    if not supported:
        raise ValueError("no supported PDF, image, TXT, or Markdown sources found")
    return supported


def collect_sources(path: Path) -> SourceBundle:
    """Collect text and page images; images are sent to the vision model, not ignored."""
    texts: list[str] = []
    images: list[tuple[str, bytes]] = []
    files: list[str] = []
    for source in source_paths(path):
        suffix = source.suffix.lower()
        files.append(str(source))
        if suffix in {".txt", ".md"}:
            texts.append(f"=== {source.name} ===\n{source.read_text(encoding='utf-8')}")
        elif suffix in SUPPORTED_IMAGES:
            images.append((SUPPORTED_IMAGES[suffix], source.read_bytes()))
        else:
            try:
                import fitz
            except ImportError as error:
                raise RuntimeError("PDF support requires: uv sync --extra ai-extract") from error
            with fitz.open(source) as document:
                for page_number, page in enumerate(document, start=1):
                    text = page.get_text().strip()
                    if text:
                        texts.append(f"=== {source.name}, page {page_number} ===\n{text}")
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
                    images.append(("image/jpeg", pixmap.tobytes("jpeg")))

    text = "\n\n".join(texts)
    if len(text) > MAX_SOURCE_CHARS:
        raise ValueError(
            f"extracted text is {len(text)} characters; split the source instead of truncating it"
        )
    if len(images) > MAX_IMAGES:
        raise ValueError(f"source has {len(images)} images/pages; maximum is {MAX_IMAGES}")
    image_bytes = sum(len(data) for _, data in images)
    if image_bytes > MAX_IMAGE_BYTES:
        raise ValueError("rendered source images exceed 20 MiB; split or compress the source")
    return SourceBundle(text=text, images=images, files=files)


def extraction_prompt(field_name: str, cohorts: list[str]) -> str:
    return f"""Extract every curriculum row exactly from the attached Persian source.
Return one JSON object with this shape:
{{
  "fieldName": {json.dumps(field_name, ensure_ascii=False)},
  "reviewStatus": "draft",
  "totalUnits": 140,
  "cohorts": {json.dumps(cohorts, ensure_ascii=False)},
  "sourceFiles": [],
  "courses": [{{
    "id": "short_lowercase_ascii_id",
    "name": "exact Persian course name",
    "units": 3,
    "semester": 1,
    "prereqs": ["id_of_prerequisite"],
    "type": "core|general|elective|lab",
    "codes": {{"cohort": "exact_course_code"}},
    "sourceRef": "filename/page/row"
  }}]
}}

Rules:
- Preserve every row, number, semester, prerequisite, and course code from the source.
- `codes` must use only these cohort keys: {json.dumps(cohorts, ensure_ascii=False)}, or `*`.
- Course codes contain ASCII digits only and never include a section suffix.
- Convert prerequisite row numbers to course ids. Do not invent prerequisites.
- Use `general` for عمومی, `elective` for اختیاری, `lab` for laboratories, and `core`
  for پایه/اصلی/تخصصی/الزامی.
- If a code is genuinely absent, use an empty `codes` object.
- Do not merge different courses and do not infer rows hidden or missing from the source.
- Return JSON only."""


def call_ai(api_key: str, model: str, bundle: SourceBundle, prompt: str) -> dict:
    from openai import OpenAI

    content: list[dict] = [{"type": "text", "text": prompt}]
    if bundle.text:
        content.append({"type": "text", "text": f"Extracted text:\n{bundle.text}"})
    for mime_type, data in bundle.images:
        encoded = base64.b64encode(data).decode("ascii")
        content.append(
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}}
        )
    client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You transcribe university curricula. Source fidelity is more important than "
                    "guessing. Return valid JSON only."
                ),
            },
            {"role": "user", "content": content},
        ],
        temperature=0,
        max_tokens=16_000,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    if not raw:
        raise ValueError("model returned an empty response")
    return json.loads(raw)


def approve(program: CurriculumProgram, key: str) -> None:
    payload = program.model_dump(mode="json")
    payload["reviewStatus"] = "reviewed"
    program = CurriculumProgram.model_validate(payload)
    current = (
        CurriculumRegistry.model_validate(read_json(CURRICULA_PATH))
        if CURRICULA_PATH.exists()
        else CurriculumRegistry(programs={})
    )
    current.programs[key] = program
    CURRICULA_PATH.write_text(json_text(current), encoding="utf-8")
    build()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a validated curriculum draft")
    parser.add_argument("--field", default="cs")
    parser.add_argument("--field-name", default="علوم کامپیوتر")
    parser.add_argument("--faculty", default="علوم ریاضی و کامپیوتر")
    parser.add_argument("--group", default="علوم کامپیوتر")
    parser.add_argument("--cohorts", default="۱۴۰۳", help="comma-separated cohort labels")
    parser.add_argument("--input", type=Path, help="one plan file or directory")
    parser.add_argument("--draft", type=Path)
    parser.add_argument("--key", help="OpenRouter key; preferably use OPENROUTER_API_KEY")
    parser.add_argument("--model", default=os.getenv("OPENROUTER_EXTRACTION_MODEL", DEFAULT_MODEL))
    parser.add_argument(
        "--approve-draft",
        type=Path,
        help="approve this already-reviewed draft without making another AI request",
    )
    parser.add_argument(
        "--generate-rules",
        action="store_true",
        help="regenerate deterministic rules from canonical JSON without calling AI",
    )
    args = parser.parse_args()

    if args.generate_rules:
        build()
        return
    if args.approve_draft:
        program = CurriculumProgram.model_validate(read_json(args.approve_draft))
        registry_key = f"{args.faculty} >> {args.group}"
        approve(program, registry_key)
        print(f"approved {registry_key}; canonical JSON and browser wrappers rebuilt")
        return
    if args.input is None:
        parser.error("--input is required unless --generate-rules is used")
    api_key = args.key or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        parser.error("set OPENROUTER_API_KEY or pass --key")
    cohorts = [item.strip() for item in args.cohorts.split(",") if item.strip()]
    if not cohorts:
        parser.error("--cohorts must contain at least one cohort")

    try:
        bundle = collect_sources(args.input)
        raw = call_ai(api_key, args.model, bundle, extraction_prompt(args.field_name, cohorts))
        raw["fieldName"] = args.field_name
        raw["reviewStatus"] = "draft"
        raw["cohorts"] = cohorts
        raw["sourceFiles"] = bundle.files
        program = CurriculumProgram.model_validate(raw)
    except Exception as error:
        print(f"Extraction rejected: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    draft_path = args.draft or Path(f"temp/curriculum_{args.field}.draft.json")
    draft_path.parent.mkdir(parents=True, exist_ok=True)
    draft_path.write_text(json_text(program), encoding="utf-8")
    print(f"validated draft written to {draft_path}")


if __name__ == "__main__":
    main()
