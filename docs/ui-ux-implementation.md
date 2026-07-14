# UI/UX implementation handoff

**Implementation Agent:** 2026-07-03  
**Approved source:** `docs/ui-ux-design.md`, with the constraints in `docs/ui-ux-review.md`

## Outcome

The student application now behaves as a planning cockpit rather than a flat section catalog. Offerings are grouped by course, sections are compared inside an expanded group, risky changes are confirmed before selection mutates, and the plan has a durable health model plus weekly, text-list, exam, and final-review representations.

The pre-existing professor/editor alignment work in the shared worktree was preserved. Those pages continue to use the shared semantic tokens, focus treatment, responsive containment, and accessible labels without changing their deterministic workflows.

## Files changed by this implementation

- `apps/web/index.html`
  - Added skip navigation, first-run quick-start guidance, advanced filters and active-filter region.
  - Added plan health, attention queue, weekly/list/exam switch, risk confirmation, and final review dialog.
  - Preserved the original script order, local-only architecture, theme behavior, AI area, and curriculum entry point.
- `apps/web/styles/main.css`
  - Added planning-cockpit components, course/section hierarchy, semantic health states, review layout, tablet switch behavior, mobile section cards, and constrained overflow.
  - Reused existing semantic aliases and shared focus rules.
- `apps/web/scripts/domain/planner-domain.js`
  - Added pure grouping identity, section extraction, full-data filters, group sorting, addition-risk aggregation, and plan-health derivation.
- `apps/web/scripts/pages/student-planner.js`
  - Added grouped/paged rendering, 200 ms search updates, active filters/reset, replacement and combined-risk confirmation, undo, synchronized plan views, health rendering, copy/print/JSON review actions, keyboard search shortcut, and dialog focus containment.
- `apps/web/scripts/adapters/planner-storage.js`
  - Added one namespaced, optional onboarding preference. Selection and curriculum schemas remain unchanged.
- `tests/frontend/planner-domain.test.js`
  - Added focused tests for grouping/fallback identity, unknown capacity, advanced filters, clash filtering, combined risks, and durable health.

No generated file under `apps/web/generated/` was edited.

## Design decisions translated into code

- A course base ID removes only the final underscore suffix. Suffix-less IDs use `faculty|normalized name|units`, preventing same-name cross-faculty merges.
- Search/filter/sort runs against the full offering set before grouping and paging. The UI adds 30 course groups per explicit request.
- Unknown/zero capacity is neither available nor full and is labelled `ظرفیت اعلام نشده`.
- A second section of the same base course is an explicit replacement. Class clash, exam clash, unit overflow, and replacement are aggregated into one confirmation.
- Safe selection mutates immediately and offers a five-second undo action.
- Plan health is derived from the complete selected set and remains visible until its class, exam, or unit issue is resolved.
- The list representation is complete text, while the existing coarse weekly grid remains a visual summary.
- JSON export contract is `{ "schemaVersion": 1, "selectedIds": [...] }`; it does not claim registration submission.

## Accessibility and responsive behavior

- Added a skip link, exactly one page `h1`, labelled plan sections, real expansion/action buttons, `aria-expanded`, polite counts/health, RTL-isolated codes, and non-color health text.
- Dialogs restore initiating focus, contain Tab/Shift+Tab, close with Escape, and expose `aria-modal`/labelled headings.
- `Ctrl/Cmd+K` focuses course search.
- Course-group headers never contain section actions, avoiding nested controls.
- At wide desktop widths the discovery pane uses the approved 44% range. Narrow desktop/tablet uses a single workspace rather than crushed panes. Mobile keeps the persistent three-destination navigation; section comparisons reflow to two columns and advanced filters become a contained sheet-like surface.
- Exact parsed times remain present in section/list/review text. The existing weekly grid remains intentionally coarse.

## Justified deviations and remaining visual verification

- No executable Chromium, Firefox, Playwright, or Puppeteer runtime is installed in this environment. Therefore screenshots, axe/Lighthouse, screen-reader smoke tests, and true viewport/zoom/virtual-keyboard checks could not be executed. Static responsive rules target 320, 375, 768, 1024, and 1440 CSS px in both persisted themes, but independent browser QA remains required.
- Thursday and arbitrary-duration spatial placement were not added; this follows the review’s explicit permission to retain the current grid domain. The complete list/review remains the authoritative text representation.
- The approved deeper professor/editor concepts remain deferred per the delivery boundary.
- Curriculum retains its existing status interaction in this implementation; replacing it with a full explicit status menu would broaden the change surface beyond the core planner pass and should be verified as a focused follow-up.

## Verification results

Run from repository root:

- `PYTHONPATH=. ./.venv/bin/pytest -q` — **20 passed**, with one upstream Starlette/httpx deprecation warning.
- `npm test` — **10 passed, 0 failed**.
- `npm run lint` — **passed with no findings**.
- `git diff --check` — **passed**.
- Browser/a11y automation — **not run; no browser runtime available**.

The first Python attempt without `PYTHONPATH=.` failed during collection because repository packages were not importable from that invocation. Re-running with the repository root explicitly on the module path produced the passing result above; this was an environment invocation issue, not an application failure.

## QA remediation — Implementation Agent, 2026-07-03

This pass responds to `docs/ui-ux-qa.md`.

### Defect-to-fix map

- **DEF-1 — tablet workspace inaccessible:** JS and CSS now share the same single-workspace boundary (`<=1100px`). Initialization, resize handling, and `setMobView()` all work throughout that range. A later shared `<=1024px` sidebar rule is explicitly neutralized for the tablet range, so both overlaid workspaces remain full width. Mobile/tablet tab state now updates `aria-selected` and roving `tabindex`.
- **DEF-2 — replacement false risks and lossy undo:** `PlannerDomain.planSelectionChange()` is a pure atomic transition returning `before`, `after`, `replaceId`, and risks. Risk calculation excludes the outgoing section and projected units use the effective selection. The browser commits the returned `after` set and undo restores the complete `before` set, including the replaced section.
- **DEF-3 — inert health/final review:** each Plan Health issue is now a real button. Activating it switches to the appropriate list/exam representation, scrolls to the affected course where applicable, and moves focus. Final Review now lists every unresolved issue and provides the same direct corrective navigation.
- **DEF-4 — incomplete tab keyboard model:** the shared `enhanceTablists()` helper adds roving `tabindex`, selected-state synchronization, RTL-aware horizontal arrows, vertical arrows, Home, and End. It is applied to student sidebar tabs, plan-view tabs, mobile/tablet navigation, and editor tabs. Mobile/tablet controls now have explicit tab roles and panel relationships.
- **DEF-5 — silently dropped timetable information:** Thursday is now parsed as a valid day and valid sessions outside supported time bands retain a null grid slot instead of being discarded. Timetable domain results carry section, day, exact start/end, and slot. Placed blocks display section and exact time; unplaced sessions produce an explicit `خارج از بازهٔ جدول` warning that opens the complete list.
- **DEF-6 — incomplete filter summary/reset:** search, faculty, group, non-default sort, and every advanced filter now appear in the applied-filter summary. `پاک‌کردن همه` clears query and every filter, restores relevance sort, rebuilds group options, and persists the cleared academic scope.
- **Additional feasible QA items:** professor workspace stacking now begins at 900px. New attention controls and unsupported-session notices use semantic warning/error surfaces and shared focus treatment.

### Regression coverage

- `tests/frontend/planner-domain.test.js`
  - equal/differing-unit replacement projection;
  - conflicts against the outgoing section are excluded;
  - exact atomic before/after sets support lossless undo;
  - unplaceable Thursday/off-band sessions retain section and exact-time metadata.
- `tests/frontend/course-domain.test.js`
  - Thursday parsing and null-slot preservation.
- `tests/frontend/ui-contract.test.js`
  - shared 1100px JS/CSS breakpoint and full-width tablet override;
  - tab relationships and required keyboard keys;
  - corrective issue controls and unsupported-session warning contract.

### Remediation verification

- `npm test` — **15 passed, 0 failed**.
- `npm run lint` — **passed with no findings**.
- `PYTHONPATH=. ./.venv/bin/pytest -q` — **20 passed**, one upstream Starlette/httpx deprecation warning.
- `git diff --check` — **passed**.
- `git diff --name-only -- apps/web/generated` — **empty; no generated data changed**.

### Criteria still requiring external evidence

No known code-level blocker from DEF-1 through DEF-6 remains. Browser binaries and assistive-technology tooling are still unavailable, so computed-layout screenshots at the target widths/themes, axe/Lighthouse, zoom/reflow, clipboard/download/print execution, and VoiceOver/NVDA smoke tests cannot be truthfully reported as completed. These remain release-verification tasks rather than known implementation failures.

## Second QA remediation — Implementation Agent, 2026-07-03

This pass closes `DEF-R1` from the final remediation re-test.

### Root-cause fixes

- Added shared `selectTab(tab)` as the sole programmatic tab-state transition. It synchronizes the active control’s `aria-selected="true"` and `tabindex="0"` while assigning `aria-selected="false"` and `tabindex="-1"` to every peer.
- `enhanceTablists()` now delegates click, arrow, Home, and End activation to `selectTab()`.
- Student `switchTab()`, `setPlanView()`, and mobile/tablet workspace navigation call `selectTab()` directly. Programmatic corrective navigation therefore updates the visible panel, selected tab, accessibility selection, and roving tab stop together.
- Editor tab switching uses the same helper and now synchronizes panel `hidden` state in addition to active classes.
- Exam rows now have stable `data-course-id` values and `tabindex="-1"`.
- `focusPlanIssue()` chooses `examsView` for exam conflicts and `listView` for class conflicts, then focuses the matching visible course row.
- Unit overflow now focuses a dedicated, programmatically focusable heading inside the visible list view. The exam view has an equivalent heading fallback.

### Exact regression coverage

- `shared programmatic tab selection synchronizes aria-selected and roving tabindex` executes the actual `selectTab()` implementation against a minimal DOM-compatible tablist and asserts both peers’ ARIA and tabindex states.
- The plan corrective-action contract test asserts:
  - exam issues target `examsView`, not the hidden list;
  - exam and unit/list focus anchors are programmatically focusable;
  - `setPlanView()` delegates to centralized `selectTab()`.

### Second remediation verification

- `npm test` — **16 passed, 0 failed**.
- `npm run lint` — **passed with no findings**.
- `PYTHONPATH=. ./.venv/bin/pytest -q` — **20 passed**, one upstream Starlette/httpx deprecation warning.
- `git diff --check` — **passed**.
- `git diff --name-only -- apps/web/generated` — **empty**.

The browser/assistive-technology evidence limitation is unchanged; there is no remaining known static/controller defect from the QA re-test.
