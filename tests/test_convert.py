import json
from pathlib import Path

from convert import build_dataset, normalized_schedule, validate_course

ROOT = Path(__file__).resolve().parents[1]


def test_dataset_is_valid_unique_and_deterministic():
    courses, warnings = build_dataset(ROOT / "raw_data")
    assert not warnings
    assert len(courses) > 1_000
    assert len({course["id"] for course in courses}) == len(courses)
    assert courses == sorted(courses, key=lambda item: item["id"])
    assert all(not validate_course(course) for course in courses)


def test_generated_json_matches_source_data():
    expected, _ = build_dataset(ROOT / "raw_data")
    actual = json.loads((ROOT / "assets/data/courses.json").read_text(encoding="utf-8"))
    assert actual == expected
    manifest = json.loads((ROOT / "assets/data/manifest.json").read_text(encoding="utf-8"))
    assert manifest["schemaVersion"] == 1
    assert manifest["recordCount"] == len(expected)


def test_schedule_never_copies_tags():
    class FakeCell:
        def get_text(self, separator):
            return "شنبه 08:00 - 10:00\n<script>alert(1)</script>"

    result = normalized_schedule(FakeCell())
    assert "<script>" not in result
