"""Create the minimal artifact deployed to GitHub Pages."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def build(destination: Path) -> None:
    destination = destination.resolve()
    if destination == PROJECT_ROOT or PROJECT_ROOT not in destination.parents:
        raise ValueError("destination must be a child of the project directory")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)

    for page in ("index.html", "admin.html", "professor.html"):
        shutil.copy2(PROJECT_ROOT / page, destination / page)
    shutil.copytree(PROJECT_ROOT / "assets", destination / "assets")
    (destination / ".nojekyll").touch()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "_site")
    args = parser.parse_args()
    build(args.output)
    print(f"static site built at {args.output}")


if __name__ == "__main__":
    main()
