# Entekhab Vahed

A mobile-first course planner for searching course offerings, building weekly schedules, tracking curriculum progress, and detecting class and exam conflicts.

The web app is a static site and runs on GitHub Pages without a backend. An optional AI assistant can connect to a separate FastAPI service.

## Features

- Search and filter course offerings
- Build and save a weekly schedule locally
- Detect class, exam, and unit-limit conflicts
- Track curriculum and prerequisites
- Export and print schedules
- Optional browser extension and AI assistant

## Run locally

```bash
python -m http.server --directory apps/web 3000
```

Open <http://localhost:3000> in your browser.

## Development

Regenerate course data:

```bash
uv sync
uv run python -m tools.data_pipeline.course_converter
```

Run tests:

```bash
npm test
uv run python -m pytest -q
```

## Project structure

```text
apps/web/          Static web application
apps/api/          Optional FastAPI service
apps/extension/    Browser extension
data/              Canonical data and source files
tools/             Data pipelines and utilities
tests/             Backend, frontend, and pipeline tests
```

## Deployment

GitHub Pages is deployed by the workflow in `.github/workflows/pages.yml` whenever changes are pushed to `main`.

## License

GNU GPLv3. See [LICENSE](LICENSE).
