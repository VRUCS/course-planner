# Entekhab Vahed Yar: Continuation and Development Guide

This is the project handoff guide for a developer who needs to run, inspect, or
extend the project after the current version. The README is intentionally a
quick introduction and setup guide. This document records the architecture,
data paths, important contracts, change recipes, and validation steps that are
easy to miss when reading the repository for the first time.

The guide describes the current source tree. If a folder, CI command, or public
interface changes, update this guide in the same change.

## 1. Start here

From the repository root, install the development dependencies:

```bash
npm ci
uv sync --locked
```

Run the student client without the backend:

```bash
python3 -m http.server 3000 --directory apps/web
```

Open `http://127.0.0.1:3000/index.html`. For a quick smoke test, search for a
course, add a section, inspect the class and exam conflicts, switch between the
weekly/list/exam views, and try the calendar or print export. The current print
flow also includes a Golestan registration sheet.

To build and serve the same public artifact used by GitHub Pages:

```bash
uv run python tools/build_static.py
python3 -m http.server 3000 --directory _site
```

The build copies only the public student and professor pages, generated data,
styles, and required scripts. `data/`, the API, and `data-editor.html` are
intentionally absent from `_site`.

## 2. What the project does

Entekhab Vahed Yar turns a list of university course offerings into a course
planning workspace. A student can search and compare sections, build a weekly
plan, inspect class and exam conflicts, check the unit limit, track curriculum
progress, print the plan, and export recurring classes to iCalendar.

The repository has three separate responsibilities:

1. A static web client for search and planning;
2. Data and pipeline tools for preparing course and curriculum datasets;
3. An optional API for the interactive AI advisor.

The main client does not require an account, database, or API. The schedule,
profile, curriculum progress, search filters, and several preferences are stored
in `localStorage` in the current browser. If browser storage is unavailable,
the storage adapter falls back to memory so the planner can still run for the
current session.

## 3. Main decisions and why they matter

These decisions are part of the project’s design, not accidental implementation
details:

| Decision | Reason and consequence |
| --- | --- |
| Build-free web client | Local execution and GitHub Pages deployment stay simple; HTML pages load scripts in an explicit order. |
| Canonical JSON under `data/canonical/` | Reviewable data remains separate from browser wrappers, and generated files can be reproduced. |
| Pure logic under `scripts/domain/` | Schedule, exam, and planner policies can be tested with Node without DOM, storage, or network access. |
| Storage and network adapters | Persistence and provider changes do not leak into planning policy. |
| Separate AI API | The OpenRouter key never needs to be shipped to the browser, and server policy controls whether AI is enabled. |
| Local persistence instead of accounts | The current version favors privacy and low operational cost over cross-device synchronization; portable backup and sharing remain future work. |

## 4. Repository map and client loading order

```text
apps/web/
  scripts/domain/       pure schedule, exam, planner, and iCalendar logic
  scripts/adapters/     localStorage, runtime config, and AI transport
  scripts/features/      shared UI, icons, and advisor behavior
  scripts/pages/        page controllers and DOM rendering
  generated/             JavaScript wrappers generated from canonical data
  styles/                shared styles
apps/extension/          Golestan extraction extension
apps/api/                optional FastAPI service
data/sources/            source HTML files
data/canonical/          reviewable canonical JSON
tools/data_pipeline/     parser, validation, and generation tools
tests/                   frontend, backend, pipeline, and browser tests
docs/                    documentation and documentation assets
```

`apps/web/index.html` uses classic scripts rather than ES modules. Its loading
order is a runtime contract:

```text
app-config
  → generated course/curriculum data
  → CourseDomain
  → CalendarExport and PlannerDomain
  → PlannerStorage and shared UI
  → AI client and Advisor
  → pages/student-planner.js
```

If a new page script depends on a global, load the provider before the page
controller. `professor.html` and `data-editor.html` have their own dependency
orders; a page should not work only because another page happened to be loaded
before it.

## 5. Data ownership and update paths

### 5.1 Course offerings from HTML

The canonical course-data path is:

```text
Golestan HTML
  → data/sources/*.html
  → tools/data_pipeline/course_converter.py
  → data/canonical/courses.json + manifest.json
  → apps/web/generated/course-offerings.generated.js
  → web client and professor dashboard
```

`data/canonical/` is the reviewable source of truth. Files under
`apps/web/generated/` are derived artifacts and must not be edited by hand.

When adding a new public snapshot:

1. Put the HTML, without personal information, under `data/sources/`.
2. Run the non-writing check:

   ```bash
   uv run python -m tools.data_pipeline.course_converter --check
   ```

3. Regenerate the outputs:

   ```bash
   uv run python -m tools.data_pipeline.course_converter
   ```

4. Review the diff of `courses.json`, the browser wrapper, and `manifest.json`.
5. Run the parser and generated-data tests.

The current parser expects at least 14 `td` cells in a Golestan row and uses
fixed table indexes:

| Field | Current index |
| --- | ---: |
| Faculty | 1 |
| Group | 3 |
| Offering ID | 4 |
| Course name | 5 |
| Units | 6 |
| Capacity / enrolled | 8 / 9 |
| Gender | 11 |
| Professor | 12 |
| Schedule and exam text | 13 |

`time_html` is normalized text separated by `<br>`, not trusted source HTML.
`exam_text` is the plain-text version of the same cell. The parser deduplicates
by offering ID and sorts the output by ID, so even a small source change can
change the record count or manifest hash.

The minimum offering contract looks like this:

```json
{
  "id": "1110002_01",
  "name": "Course name",
  "faculty": "Faculty name",
  "group": "Computer Science",
  "units": 2,
  "capacity": 40,
  "enrolled": 12,
  "gender": "مرد",
  "prof": "Professor name",
  "time_html": "درس(ت): شنبه 13:30-15:30 مکان: ک102<br>امتحان(1405.03.21) ساعت : 10:30-12:30",
  "exam_text": "درس(ت): شنبه 13:30-15:30 مکان: ک102 امتحان(1405.03.21) ساعت : 10:30-12:30"
}
```

The suffix after the final `_` is the section number. `PlannerDomain.getBaseCourseId()`
removes it to group sections by course, while `getSectionId()` returns it for
display. If Golestan changes the ID format, review these functions and their
tests together with the parser.

### 5.2 The browser extension is an extractor, not a complete pipeline

`apps/extension/extractor.js` detects course-offering and curriculum tables in
Golestan frames. `popup.js` can:

- download offerings as a JavaScript wrapper containing `UNIVERSITY_DATA`;
- download a curriculum chart as `golestan_curriculum.json`;
- copy offering JSON to the clipboard.

This output is not automatically canonical project data. The web function
`importGolestanFile()` only reads an offerings file and displays guidance; it
does not update `courses.json`. Review extension output against the official
source and bring it into the canonical workflow. Replacing only a generated
wrapper would make it disagree with `courses.json` and the pipeline tests.

### 5.3 Curricula and conflict rules

`data/canonical/curricula.json` stores curriculum programs. A program is keyed
as `faculty >> group` and contains courses, cohorts, semester numbers,
prerequisites, course types, and cohort-specific course codes.

To curate a curriculum, use the local `data-editor.html` to prepare a JSON
fragment, review it, place it under `programs` in `curricula.json`, and run the
generator. The editor is a local curation tool and is excluded from the public
site; there is no automatic import from the extension’s curriculum JSON.

```bash
uv run python -m tools.data_pipeline.curriculum_pipeline check
uv run python -m tools.data_pipeline.curriculum_pipeline build
```

`build` produces:

- `data/canonical/conflict_rules.json`;
- `apps/web/generated/curriculum.generated.js`;
- `apps/web/generated/conflict-rules.generated.js`.

Pydantic validation checks unique course and cohort IDs, course-code format,
known prerequisites, prerequisite cycles, and valid cohort mappings. Conflict
rules are generated deterministically from the curriculum and the offerings
that exist in the current snapshot: non-elective courses in the same semester
become `mustNotConflict` pairs, while some two-semester gaps without a
prerequisite relationship become `shouldNotConflict` pairs. Elective courses
are excluded from this generated rule set.

For a PDF, image, TXT, or Markdown source, `curriculum_extractor.py` can create
a draft. This optional path requires the `ai-extract` extra and an OpenRouter
key. The draft must be checked against the source before approval; the model is
an extraction aid, not the source of truth.

## 6. Client logic and important contracts

### 6.1 Responsibilities

```text
DOM and events
  → pages/student-planner.js
  → features/ui.js, icons.js, advisor.js
  → adapters/planner-storage.js, ai-client.js
  → domain/course-domain.js, planner-domain.js, calendar-export.js
  → generated data
```

Code under `scripts/domain/` must not depend on `document`,
`window.localStorage`, or `fetch`. `CourseDomain` handles normalization,
schedule and exam parsing, overlap detection, and unit-limit policy.
`PlannerDomain` handles filtering, section grouping, add-course risks, plan
health, timetable construction, and curriculum-rule evaluation. Page
controllers coordinate state, DOM, and user interaction.

### 6.2 Invariants to preserve

- `parseSchedule()` normalizes Persian digits and day-name variants and removes
  exam lines from class sessions.
- Session overlap uses actual start and end minutes; timetable slots are only a
  visual layout abstraction.
- Two exams on the same date are conservatively treated as conflicting when
  one exam time is unknown.
- `maxUnitsForGpa()` returns 14 units for a previous GPA below 12, 24 for a GPA
  of 17 or above, and 20 otherwise. Empty or invalid input uses the normal 20
  unit limit.
- `derivePlanHealth()` reports class conflicts, exam conflicts, and unit
  overflow separately. Warnings should remain visible rather than being hidden
  by dropping data.
- Escape dynamic values with `SafeDOM.escape` before putting them into HTML
  templates. Prefer `textContent` for plain text.
- Saved selections are filtered against currently valid offering IDs and expire
  after 60 days. Corrupt data or unavailable storage must not prevent startup.

### 6.3 Browser storage

`PlannerStorage.createRepository()` is the persistence boundary. Current keys:

| Purpose | Key |
| --- | --- |
| Selected schedule | `uni_schedule_v2` |
| Curriculum progress | `uni_curriculum_v2` |
| Profile faculty and group | `uni_faculty` and `uni_group` |
| Cohort and GPA | `selectedCohort` and `uni_gpa` |
| Search filters | `uni_search_faculty` and `uni_search_group` |
| Onboarding and help guide | `uni_planner_onboarding_v1` and `uni_planner_help_guide_v1` |
| Calendar date range | `uni_calendar_start_v1` and `uni_calendar_end_v1` |

If the storage schema changes, add a versioned key or an explicit migration and
update `tests/frontend/planner-storage.test.js`. Silently discarding old data
is a user-visible behavior and should be intentional.

## 7. Recipes for common changes

### Add or change planner behavior

1. Put independent policy in `CourseDomain` or `PlannerDomain` first.
2. Add Node tests for normal, boundary, and incomplete-data cases in the
   relevant `tests/frontend/*domain.test.js` file.
3. Update the page controller to render the result and connect the event.
4. Insert dynamic data with `SafeDOM.escape` or `textContent`.
5. Check empty, error, mobile, print, and reload behavior.
6. Add a UI contract test and, when the user-visible flow warrants it, a
   Playwright test.

### Change course parsing or course data

1. Add a small fixture for the real HTML shape and a failure case to
   `tests/pipelines/test_course_converter.py`.
2. Change the indexes or normalization in `course_converter.py`.
3. Run the check, then regenerate the outputs.
4. Review canonical, wrapper, and manifest diffs for deletions, duplicates, and
   unexpected changes.
5. Check search, timetable, exams, print, and calendar export with real-looking
   records in the browser.

### Add a program or correct a curriculum

1. Identify the official source and the date it was reviewed.
2. Add unique course IDs, real prerequisites, and course codes without section
   suffixes to `curricula.json`.
3. Run `curriculum_pipeline build` and `check`.
4. Set `reviewStatus` and `sourceFiles` to reflect the actual evidence; do not
   mark a legacy or unreviewed chart as `reviewed`.
5. Check the program, cohort, unmapped-code notices, prerequisite statuses, and
   recommendations in the UI.

### Change UI or responsive behavior

1. Update the markup and semantic selectors in the relevant page.
2. If layout changes, inspect the responsive media rules and print styles.
3. Preserve keyboard interaction, dialog focus restoration, empty states, and
   ARIA attributes.
4. Update the UI contract and the E2E test for the affected flow.

### Change the API or AI behavior

1. Change the public contract in `apps/api/api/schemas/`.
2. Keep policy and orchestration in `application/`; keep routes transport-only.
3. Keep provider-specific code inside `infrastructure/openrouter.py`.
4. Add tests for feature flags, model allowlists, request limits, malformed
   provider responses, and rate limiting.
5. Never put a secret in JavaScript, HTML, localStorage, canonical data, or a
   commit.

## 8. Optional AI API

The request path is:

```text
HTTP route
  → Pydantic schema
  → require_ai_access and rate limiter
  → AIChatService
  → OpenRouterGateway
```

Current endpoints:

- `GET /health` returns health metadata without the provider credential;
- `POST /api/ai/chat/complete` returns one complete response;
- `POST /api/ai/chat/stream` returns server-sent events.

Run it locally with:

```bash
cp apps/api/.env.example apps/api/.env
uv run uvicorn apps.api.main:app --reload --host 127.0.0.1 --port 8000
```

`AI_INTERACTIVE_ENABLED=false` is the safe default. The backend accepts AI
requests only when the feature flag is enabled and `OPENROUTER_API_KEY` is set.
The requested model must be allowlisted, and message count, message size, and
maximum output tokens are bounded. The current sliding-window limiter is
in-memory and covers one process; a multi-process deployment needs the same
boundary backed by shared storage such as Redis.

`ai-client.js` checks `/health` before showing interactive AI controls. When
`backendUrl` is empty on a local host, it uses `http://localhost:8000`. A
production backend URL can be placed in `scripts/adapters/app-config.js`, but
that public file must never contain a secret.

## 9. Tests, CI, and deployment

The main pre-pull-request checks are:

```bash
npm test
npm run lint
uv run python -m pytest -q
uv run ruff check .
uv run python -m tools.data_pipeline.course_converter --check
uv run python -m tools.data_pipeline.curriculum_pipeline check
uv run python -m compileall -q apps/api tools
uv run python tools/build_static.py
```

Browser tests require Chromium:

```bash
npm run test:e2e
```

CI also checks JavaScript syntax for web, generated, and extension files with
`node --check`, and verifies that `data`, the API, and the editor are not copied
into `_site`. `.github/workflows/pages.yml` publishes only `_site` to GitHub
Pages.

Use this minimum check set for each kind of change:

| Change | Minimum verification |
| --- | --- |
| Schedule or planner policy | Domain tests and `npm test` |
| Markup or interaction | UI contract tests and `npm run test:e2e` |
| Parser or course data | Pipeline tests and both `course_converter` commands |
| Curriculum or rules | Pipeline tests and `curriculum_pipeline check` |
| API or security policy | Backend tests and `uv run ruff check .` |
| Build or deployment | `tools/build_static.py` and `_site` boundary checks |

## 10. Current limitations and sensible next work

- The course parser depends on the structure and indexes of Golestan tables.
- Enrollment decisions still depend on an up-to-date official snapshot; the
  planner output does not replace final registration in Golestan.
- Some programs or cohorts may lack complete course-code mappings; unmapped
  status should remain visible in the UI.
- Persistence is local to one browser. Portable backups, sharing, and
  cross-device synchronization are not designed yet.
- Production AI needs secure deployment, secret management, observability, and
  a shared limiter.
- The extension recognizes particular Golestan page titles and table shapes;
  title or markup changes require fixtures and manual browser verification.

## 11. Handoff checklist

- [ ] `npm ci` and `uv sync --locked` have been run.
- [ ] The student site and, if needed, the local API start successfully.
- [ ] The difference between canonical and generated data is understood.
- [ ] Data sources, review dates, and curriculum review status are recorded.
- [ ] No generated file was edited manually.
- [ ] Parser or curriculum checks have been run.
- [ ] Change-specific tests and then the full CI checks have been run.
- [ ] Empty, mobile, keyboard, print, and reload behavior have been checked.
- [ ] The public artifact has been built and private-file boundaries checked.
- [ ] No secret or personal data has been added to the commit.

## 12. Related documentation

- [English README](../README.md) — project introduction and quick setup;
- [Persian README](../README.fa.md) — معرفی و اجرای سریع؛
- [Web client README](../apps/web/README.md);
- [API README](../apps/api/README.md);
- [Data ownership README](../data/README.md);
- [Data pipeline README](../tools/data_pipeline/README.md).

Code reference: <https://github.com/VRUCS/course-planner>
