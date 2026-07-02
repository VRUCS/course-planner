"""Canonical curriculum validation and deterministic conflict-rule generation."""
from __future__ import annotations

import argparse
import itertools
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ROOT = Path(__file__).resolve().parents[1]
CURRICULA_PATH = ROOT / "assets/data/curricula.json"
RULES_PATH = ROOT / "assets/data/conflict_rules.json"
COURSES_PATH = ROOT / "assets/data/courses.json"
CURRICULA_JS_PATH = ROOT / "assets/js/curriculum_cs.js"
RULES_JS_PATH = ROOT / "assets/js/conflict_rules.js"

PROGRAM_KEY_RE = re.compile(r"^[^>]+ >> [^>]+$")
ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
CODE_RE = re.compile(r"^[0-9]{4,12}$")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CurriculumCourse(StrictModel):
    id: str
    name: str
    units: int = Field(ge=1, le=6)
    semester: int = Field(ge=1, le=8)
    prereqs: list[str] = Field(default_factory=list)
    type: Literal["core", "general", "elective", "lab"]
    codes: dict[str, str] = Field(default_factory=dict)
    sourceRef: str | None = None

    @field_validator("id")
    @classmethod
    def valid_id(cls, value: str) -> str:
        if not ID_RE.fullmatch(value):
            raise ValueError("must contain lowercase ASCII letters, digits, or underscores")
        return value

    @field_validator("name")
    @classmethod
    def nonempty_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value.strip()

    @field_validator("codes")
    @classmethod
    def valid_codes(cls, value: dict[str, str]) -> dict[str, str]:
        for cohort, code in value.items():
            if not cohort.strip():
                raise ValueError("cohort key must not be empty")
            if not CODE_RE.fullmatch(code):
                raise ValueError(f"course code {code!r} must contain only 4-12 ASCII digits")
        return value


class CurriculumProgram(StrictModel):
    fieldName: str
    reviewStatus: Literal["draft", "legacy-unverified", "reviewed"] = "legacy-unverified"
    totalUnits: int = Field(ge=1, le=300)
    cohorts: list[str] = Field(min_length=1)
    sourceFiles: list[str] = Field(default_factory=list)
    courses: list[CurriculumCourse] = Field(min_length=1)

    @model_validator(mode="after")
    def consistent_graph(self) -> CurriculumProgram:
        if self.reviewStatus == "reviewed" and not self.sourceFiles:
            raise ValueError("reviewed curricula must identify at least one source file")
        if len(self.cohorts) != len(set(self.cohorts)):
            raise ValueError("cohorts must be unique")
        ids = [course.id for course in self.courses]
        if len(ids) != len(set(ids)):
            raise ValueError("course ids must be unique")
        known = set(ids)
        graph: dict[str, list[str]] = {}
        for course in self.courses:
            unknown = set(course.prereqs) - known
            if unknown:
                raise ValueError(f"{course.id} has unknown prerequisites: {sorted(unknown)}")
            if course.id in course.prereqs:
                raise ValueError(f"{course.id} cannot require itself")
            invalid_cohorts = set(course.codes) - set(self.cohorts) - {"*"}
            if invalid_cohorts:
                raise ValueError(f"{course.id} has unknown code cohorts: {sorted(invalid_cohorts)}")
            graph[course.id] = course.prereqs

        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(course_id: str) -> None:
            if course_id in visiting:
                raise ValueError(f"prerequisite cycle includes {course_id}")
            if course_id in visited:
                return
            visiting.add(course_id)
            for prereq in graph[course_id]:
                visit(prereq)
            visiting.remove(course_id)
            visited.add(course_id)

        for course_id in graph:
            visit(course_id)
        return self


class CurriculumRegistry(StrictModel):
    schemaVersion: Literal[1] = 1
    programs: dict[str, CurriculumProgram]

    @field_validator("programs")
    @classmethod
    def valid_keys(cls, value: dict[str, CurriculumProgram]) -> dict[str, CurriculumProgram]:
        invalid = [key for key in value if not PROGRAM_KEY_RE.fullmatch(key)]
        if invalid:
            raise ValueError(f"program keys must use 'faculty >> group': {invalid}")
        return value


class ConflictRule(StrictModel):
    a: str
    nameA: str
    b: str
    nameB: str
    reason: str

    @model_validator(mode="after")
    def distinct_codes(self) -> ConflictRule:
        if self.a == self.b:
            raise ValueError("a conflict rule must contain two different codes")
        return self


class ProgramRules(StrictModel):
    mustNotConflict: list[ConflictRule] = Field(default_factory=list)
    shouldNotConflict: list[ConflictRule] = Field(default_factory=list)


class ConflictRegistry(StrictModel):
    schemaVersion: Literal[1] = 1
    programs: dict[str, ProgramRules]


def read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def offered_codes_by_program(path: Path = COURSES_PATH) -> dict[str, set[str]]:
    offered: dict[str, set[str]] = defaultdict(set)
    for course in read_json(path):
        base_code = str(course["id"]).rsplit("_", 1)[0]
        key = f"{course['faculty']} >> {course['group']}"
        offered[key].add(base_code)
    return offered


def resolved_code(course: CurriculumCourse, cohort: str) -> str | None:
    return course.codes.get(cohort) or course.codes.get("*")


def transitive_prerequisites(program: CurriculumProgram, course_id: str) -> set[str]:
    by_id = {course.id: course for course in program.courses}
    result: set[str] = set()

    def collect(current: str) -> None:
        for prereq in by_id[current].prereqs:
            if prereq not in result:
                result.add(prereq)
                collect(prereq)

    collect(course_id)
    return result


def generate_rules(
    registry: CurriculumRegistry,
    offered_by_program: dict[str, set[str]],
) -> ConflictRegistry:
    output: dict[str, ProgramRules] = {}
    for key, program in registry.programs.items():
        offered = offered_by_program.get(key, set())
        hard: dict[tuple[str, str], ConflictRule] = {}
        soft: dict[tuple[str, str], ConflictRule] = {}
        prereqs = {
            course.id: transitive_prerequisites(program, course.id) for course in program.courses
        }

        for cohort in program.cohorts:
            eligible = [
                course
                for course in program.courses
                if course.type != "elective"
                and (code := resolved_code(course, cohort))
                and code in offered
            ]
            for first, second in itertools.combinations(eligible, 2):
                code_a = resolved_code(first, cohort)
                code_b = resolved_code(second, cohort)
                assert code_a and code_b
                pair = tuple(sorted((code_a, code_b)))
                if first.semester == second.semester:
                    hard[pair] = ConflictRule(
                        a=code_a,
                        nameA=first.name,
                        b=code_b,
                        nameB=second.name,
                        reason=f"هر دو درس الزامی ترم {first.semester} برای ورودی {cohort} هستند",
                    )
                elif (
                    abs(first.semester - second.semester) == 2
                    and first.id not in prereqs[second.id]
                    and second.id not in prereqs[first.id]
                ):
                    earlier, later = sorted((first, second), key=lambda item: item.semester)
                    soft[pair] = ConflictRule(
                        a=code_a,
                        nameA=first.name,
                        b=code_b,
                        nameB=second.name,
                        reason=(
                            f"دانشجوی ورودی {cohort} ممکن است درس ترم {earlier.semester} "
                            f"را همراه درس الزامی ترم {later.semester} تکرار کند"
                        ),
                    )
        output[key] = ProgramRules(
            mustNotConflict=[hard[key] for key in sorted(hard)],
            shouldNotConflict=[soft[key] for key in sorted(soft)],
        )
    return ConflictRegistry(programs=output)


def validate_rule_codes(
    rules: ConflictRegistry,
    offered_by_program: dict[str, set[str]],
) -> None:
    errors: list[str] = []
    for key, program_rules in rules.programs.items():
        offered = offered_by_program.get(key, set())
        seen: set[tuple[str, str, str]] = set()
        for rule_type in ("mustNotConflict", "shouldNotConflict"):
            for rule in getattr(program_rules, rule_type):
                pair = tuple(sorted((rule.a, rule.b)))
                marker = (rule_type, *pair)
                if marker in seen:
                    errors.append(f"{key}: duplicate {rule_type} pair {pair}")
                seen.add(marker)
                missing = {rule.a, rule.b} - offered
                if missing:
                    errors.append(
                        f"{key}: {rule_type} references unavailable codes {sorted(missing)}"
                    )
    if errors:
        raise ValueError("\n".join(errors))


def json_text(model: BaseModel) -> str:
    data = model.model_dump(mode="json", exclude_none=True)
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def wrapper_text(variable: str, payload: object, source: str) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    return (
        f"/** Generated from {source} by scripts/curriculum_pipeline.py. Do not edit. */\n"
        f"const {variable} = {encoded};\n"
    )


def build(*, check: bool = False) -> None:
    curricula = CurriculumRegistry.model_validate(read_json(CURRICULA_PATH))
    offered = offered_codes_by_program()
    rules = generate_rules(curricula, offered)
    validate_rule_codes(rules, offered)

    expected = {
        RULES_PATH: json_text(rules),
        CURRICULA_JS_PATH: wrapper_text(
            "CURRICULUM_REGISTRY",
            {
                key: value.model_dump(mode="json", exclude_none=True)
                for key, value in curricula.programs.items()
            },
            "assets/data/curricula.json",
        ),
        RULES_JS_PATH: wrapper_text(
            "CONFLICT_RULES",
            {key: value.model_dump(mode="json") for key, value in rules.programs.items()},
            "assets/data/conflict_rules.json",
        ),
    }
    stale = [
        str(path.relative_to(ROOT))
        for path, text in expected.items()
        if not path.exists() or path.read_text(encoding="utf-8") != text
    ]
    if check and stale:
        raise ValueError(f"generated curriculum files are stale: {', '.join(stale)}")
    if not check:
        for path, text in expected.items():
            path.write_text(text, encoding="utf-8")

    mapped = {
        resolved_code(course, cohort)
        for program in curricula.programs.values()
        for cohort in program.cohorts
        for course in program.courses
        if resolved_code(course, cohort)
    }
    offered_all = set().union(*offered.values()) if offered else set()
    missing = sorted(mapped - offered_all)
    unmapped = sum(
        not course.codes
        for program in curricula.programs.values()
        for course in program.courses
    )
    print(
        f"validated {sum(len(p.courses) for p in curricula.programs.values())} curriculum courses; "
        f"{unmapped} have no code mapping and {len(missing)} mapped codes are not offered "
        "in the current snapshot"
    )


def migrate_legacy(path: Path) -> None:
    script = (
        "const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);"
        f"vm.runInContext(fs.readFileSync({json.dumps(str(path))},'utf8')"
        "+'\\nglobalThis.out=CURRICULUM_REGISTRY',c);"
        "process.stdout.write(JSON.stringify(c.out));"
    )
    result = subprocess.run(
        ["node", "-e", script],
        check=True,
        text=True,
        capture_output=True,
    )
    legacy = json.loads(result.stdout)
    for program in legacy.values():
        program.setdefault("sourceFiles", [])
        program.setdefault("reviewStatus", "legacy-unverified")
    registry = CurriculumRegistry.model_validate({"schemaVersion": 1, "programs": legacy})
    CURRICULA_PATH.write_text(json_text(registry), encoding="utf-8")
    build()


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("build")
    subparsers.add_parser("check")
    migrate = subparsers.add_parser("migrate-legacy")
    migrate.add_argument("path", type=Path)
    args = parser.parse_args()
    if args.command == "migrate-legacy":
        migrate_legacy(args.path)
    else:
        build(check=args.command == "check")


if __name__ == "__main__":
    main()
