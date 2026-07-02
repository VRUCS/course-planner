# Static web client

This directory is the complete source of the build-free browser application.

- `scripts/domain/`: pure scheduling and planner policy; no browser APIs.
- `scripts/adapters/`: HTTP, runtime configuration, and persistence boundaries.
- `scripts/features/`: shared presentation behavior.
- `scripts/pages/`: page-specific controllers and DOM rendering.
- `generated/`: deterministic wrappers generated from `data/canonical/`.
- `styles/`: shared presentation.

`data-editor.html` is a local curation tool and is intentionally excluded from
the public artifact. Build the deployable site with `uv run python
tools/build_static.py`.
