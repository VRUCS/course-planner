import pytest
from pydantic import ValidationError

from tools.data_pipeline.curriculum_extractor import collect_sources
from tools.data_pipeline.curriculum_pipeline import (
    CURRICULA_PATH,
    RULES_PATH,
    ConflictRegistry,
    CurriculumProgram,
    CurriculumRegistry,
    build,
    generate_rules,
    read_json,
    validate_rule_codes,
)


def course(course_id, semester, code, *, prereqs=None, course_type="core"):
    return {
        "id": course_id,
        "name": course_id,
        "units": 3,
        "semester": semester,
        "prereqs": prereqs or [],
        "type": course_type,
        "codes": {"۱۴۰۳": code},
    }


def test_canonical_files_are_valid_and_generated_wrappers_are_current():
    curricula = CurriculumRegistry.model_validate(read_json(CURRICULA_PATH))
    ConflictRegistry.model_validate(read_json(RULES_PATH))
    assert curricula.programs
    build(check=True)


def test_curriculum_rejects_unknown_prerequisites_and_cycles():
    base = {
        "fieldName": "test",
        "totalUnits": 6,
        "cohorts": ["۱۴۰۳"],
        "courses": [course("first", 1, "10001", prereqs=["missing"])],
    }
    with pytest.raises(ValidationError, match="unknown prerequisites"):
        CurriculumProgram.model_validate(base)

    base["courses"] = [
        course("first", 1, "10001", prereqs=["second"]),
        course("second", 2, "10002", prereqs=["first"]),
    ]
    with pytest.raises(ValidationError, match="prerequisite cycle"):
        CurriculumProgram.model_validate(base)


def test_rules_are_deterministic_offering_aware_and_prerequisite_aware():
    key = "faculty >> group"
    program = CurriculumProgram.model_validate(
        {
            "fieldName": "test",
            "totalUnits": 12,
            "cohorts": ["۱۴۰۳"],
            "courses": [
                course("a", 1, "10001"),
                course("b", 1, "10002"),
                course("c", 3, "10003", prereqs=["a"]),
                course("d", 3, "10004"),
                course("elective", 1, "10005", course_type="elective"),
                course("not_offered", 1, "10006"),
            ],
        }
    )
    registry = CurriculumRegistry(programs={key: program})
    offered = {key: {"10001", "10002", "10003", "10004", "10005"}}

    first = generate_rules(registry, offered)
    second = generate_rules(registry, offered)
    assert first == second
    rules = first.programs[key]
    hard_pairs = {(rule.a, rule.b) for rule in rules.mustNotConflict}
    soft_pairs = {frozenset((rule.a, rule.b)) for rule in rules.shouldNotConflict}
    assert ("10001", "10002") in hard_pairs
    assert all("10005" not in pair and "10006" not in pair for pair in hard_pairs)
    assert frozenset(("10001", "10003")) not in soft_pairs
    assert frozenset(("10002", "10004")) in soft_pairs
    validate_rule_codes(first, offered)


def test_rule_validation_rejects_codes_missing_from_offerings():
    rules = ConflictRegistry.model_validate(
        {
            "programs": {
                "faculty >> group": {
                    "mustNotConflict": [
                        {
                            "a": "10001",
                            "nameA": "a",
                            "b": "99999",
                            "nameB": "missing",
                            "reason": "test",
                        }
                    ]
                }
            }
        }
    )
    with pytest.raises(ValueError, match="unavailable codes"):
        validate_rule_codes(rules, {"faculty >> group": {"10001"}})


def test_image_sources_are_captured_for_vision(tmp_path):
    image = tmp_path / "chart.jpg"
    image.write_bytes(b"\xff\xd8fake-jpeg")
    bundle = collect_sources(image)
    assert bundle.images == [("image/jpeg", b"\xff\xd8fake-jpeg")]
    assert bundle.files == [str(image)]
    assert bundle.text == ""
