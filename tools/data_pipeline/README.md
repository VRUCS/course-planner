# Data pipeline

- `course_converter.py` converts public Golestan HTML into canonical course JSON
  and its browser wrapper.
- `curriculum_extractor.py` creates a validated AI-assisted draft for human
  review.
- `curriculum_pipeline.py` validates canonical curricula and deterministically
  generates conflict rules and browser wrappers.

Run modules from the repository root, for example:

```bash
uv run python -m tools.data_pipeline.course_converter
uv run python -m tools.data_pipeline.curriculum_pipeline check
```
