"""Create the minimal artifact deployed to GitHub Pages."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = PROJECT_ROOT / "apps/web"


def build(destination: Path) -> None:
    destination = destination.resolve()
    if destination == PROJECT_ROOT or PROJECT_ROOT not in destination.parents:
        raise ValueError("destination must be a child of the project directory")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)

    # The data editor is intentionally source-only: it is not an authenticated
    # administration surface and therefore must not be published as one.
    for page in ("index.html", "professor.html"):
        shutil.copy2(WEB_ROOT / page, destination / page)
    for directory in ("generated", "styles"):
        shutil.copytree(WEB_ROOT / directory, destination / directory)
    shutil.copytree(
        WEB_ROOT / "scripts",
        destination / "scripts",
        ignore=shutil.ignore_patterns("data-editor.js"),
    )
    (destination / ".nojekyll").touch()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "_site")
    args = parser.parse_args()
    build(args.output)
    print(f"static site built at {args.output}")


if __name__ == "__main__":
    main()
