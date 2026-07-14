# UI/UX implementation QA

**QA/Feedback Agent:** 2026-07-03  
**Inputs:** `docs/ui-ux-design.md`, `docs/ui-ux-review.md`, `docs/ui-ux-implementation.md`, and the complete working-tree diff  
**Verdict:** **FAIL — remediation required before release**

## Scope and method

I independently traced the student state transitions, domain functions, persistence adapter, generated markup, responsive cascade, and the professor/editor alignment changes. I also ran every repository test/lint suite and static integrity checks.

No Chromium, Firefox, Playwright, Puppeteer, axe, Lighthouse, or screen-reader runtime is installed. Consequently, screenshots, computed-layout checks, real clipboard/download/print checks, automated accessibility-tree inspection, zoom/reflow checks, and assistive-technology smoke tests could not be performed. Responsive and keyboard conclusions below are based on rigorous HTML/CSS/JS path tracing, not a claim of visual browser verification.

## Acceptance matrix

| Area | Result | Evidence |
|---|---|---|
| First-run context | Partial | Inline, non-blocking panel and namespaced dismissal persistence exist. Faculty/group persist, but cohort is not captured in the panel and there is no collapsed context summary. |
| Course-first grouping and paging | Pass | Terminal-suffix grouping, faculty-aware fallback, section expansion, and 30-group paging are implemented and unit-tested. |
| Search/filter/sort/count | Partial | Debounced search, supported filters, sort, count, chips, and paging work by inspection. Faculty/group are not represented as active chips; “clear all” does not clear faculty, group, search, or sort. |
| Safe add, visible state, undo | Partial | Safe add and five-second undo exist. Undo is incorrect for replacement (DEF-2). |
| Risk confirmation and replacement | Fail | Confirmation precedes mutation, but replacement risk calculation includes the section that will be removed and can present false conflicts/overflow (DEF-2). |
| Durable Plan Health | Partial | Class/exam/unit issues persist textually. Rows do not link to or focus affected blocks/courses (DEF-3). |
| Weekly/list/exam synchronization | Partial | All derive from the same selected set. Weekly blocks omit exact time and section, and unsupported grid sessions disappear without the required warning (DEF-5). |
| Final Review/copy/print/export | Fail | Table, unit summary, copy, print trigger, and versioned JSON exist. Unresolved issues and direct fix actions are absent (DEF-3). Browser execution was unavailable. |
| Registration language | Pass | Copy explicitly says final registration occurs in Golestan; no submission claim was found. |
| 320/375/768 responsive reasoning | Partial | Mobile pane switching is wired at `<=768`; contained timetable overflow and safe-area bottom nav exist. Filters are a fixed panel but lack the specified sheet heading, close control, drag handle, and focus trap. |
| 1024/tablet single workspace | Fail | Release-blocking navigation mismatch makes the plan workspace inaccessible from 769–1100 px (DEF-1). |
| 1440 desktop reasoning | Partial | 44/56 wide split and pane bounds exist. No live rendering/screenshot was possible. |
| Scroll/state across destinations | Partial | Selection persists; expanded groups persist in session. Scroll positions are not explicitly stored/restored. |
| Keyboard and semantics | Fail | Real buttons, labels, skip link, one `h1`, expansion state, modal trapping/restoration are present. Tablists lack arrow/Home/End and roving `tabindex`; mobile tab semantics are incomplete (DEF-4). |
| RTL/Persian/data fallback | Partial | Persian copy, RTL root, escaped dataset strings, `<bdi>` course IDs, and missing-data labels are generally good. Some times are emitted as plain RTL text rather than isolated LTR runs. |
| Persistence/version recovery | Partial | Existing selection schema is preserved, stale/corrupt selection is safely discarded, and onboarding is namespaced. Corrupt/version failure provides no user recovery guidance. |
| Empty/error states | Partial | Empty catalog, empty plan, empty exam, and missing field states exist. Unsupported schedule placement and local-storage recovery guidance are absent. |
| Reduced motion/contrast/zoom | Partial | Reduced-motion CSS exists and prior token contrast evidence is documented. New components were not re-measured in a browser; zoom/reflow could not be executed. |
| Professor alignment/regression | Partial | Labels, heading, icon names, and shared tokens improved; deterministic code remains. Stacking begins at 768 px rather than the specified `<=900 px`. Runtime visual verification unavailable. |
| Editor alignment/regression | Partial | Real tabs, labels, contained table overflow, accessible destructive labels, and focus restoration improved. Tabs have the same keyboard-model gap; destructive actions still have neither confirmation nor undo. |
| Engineering quality | Partial | All existing automated suites pass and generated data is untouched. Replacement behavior/persistence is not unit-tested despite the handoff claim. |

## Defects and implementation feedback

### DEF-1 — Critical: tablet navigation cannot reveal the plan workspace

**Reproduction:** Set viewport width to any value from 769 through 1100 px, for example 1024 px. The CSS rule in `main.css` overlays `.sidebar` and `.main`, translates `.main` off-screen, and displays `.mob-nav`. Click `برنامه`.

**Actual:** `setMobView()` immediately returns because `isMobile()` is defined as `window.innerWidth <= 768`. `initMobile()` also does not initialize `data-mob` at tablet widths. The schedule remains translated off-screen. A later `@media (max-width:1024px)` rule also overrides the intended full-width tablet sidebar to 320 px.

**Expected:** The 769–1023 px (and fallback narrow desktop) segmented navigation must switch full-width workspaces.

**Suggested fix:** Define one shared JS/CSS workspace breakpoint (matching the actual 1100 px fallback or revise CSS to the approved range), allow navigation throughout it, initialize active state, and prevent the later sidebar-width rule from overriding the single-workspace layout. Add an automated breakpoint/state test if a DOM harness is introduced.

### DEF-2 — High: replacement computes risks against the removed section and undo loses it

**Reproduction:** Select section `COURSE_01`, then request `COURSE_02` for the same base course. This is especially visible when the old and new sections overlap or the plan is at its unit cap. Confirm replacement, then click `واگردانی`.

**Actual:** `deriveAdditionRisks()` receives the full selected set, including `COURSE_01`. It can report a class/exam conflict with the very section being replaced and adds the new units without subtracting old units, producing false overflow. After confirmation, `commitAdd()` deletes the old ID. Undo calls `removeCourse(newId)` and does not restore `oldId`, leaving neither section selected.

**Expected:** Replacement risk is calculated against `selected - oldSection`; projected units subtract old units; undo atomically restores the prior selection.

**Suggested fix:** Put replacement planning in a pure tested domain operation accepting `replaceId`, return before/after selection plus risks, and retain the prior ID in the undo closure. Add tests for equal-unit replacement at cap, differing-unit replacement, conflict only with replaced section, and undo.

### DEF-3 — High: Plan Health and Final Review are not actionable/complete

**Reproduction:** Override a class or exam conflict, then inspect the attention queue and open `مرور نهایی`.

**Actual:** Attention items are inert `<div>` elements. Final Review only displays a summary count and course table; it does not list unresolved issues or provide direct fix actions.

**Expected:** Every durable issue identifies affected courses and links/focuses them. Final Review lists all unresolved issues with direct corrective navigation.

**Suggested fix:** Render issue rows as labelled buttons/links with stable course IDs and handlers that open the relevant plan view and focus/highlight affected content. Reuse that issue rendering inside Final Review.

### DEF-4 — Medium: tab widgets do not implement required keyboard behavior

**Reproduction:** Focus student sidebar tabs, plan-view tabs, mobile navigation, or editor tabs; press Arrow keys, Home, or End.

**Actual:** Click/Enter/Space work on native buttons, but there is no arrow/Home/End handling or roving `tabindex`. Mobile navigation declares `role="tablist"` while its children lack `role="tab"`, `aria-selected`, and panel relationships.

**Expected:** The approved WAI-ARIA tab keyboard model and consistent semantics.

**Suggested fix:** Add one reusable tab-controller helper implementing roving focus, ArrowLeft/ArrowRight (RTL-aware if desired), Home/End, `aria-selected`, `tabindex`, and controlled panel IDs. Apply it across student and editor surfaces.

### DEF-5 — Medium: weekly schedule silently loses required information

**Reproduction:** Select a course whose parsed session maps to a day/slot with no grid cell (for example Thursday or an unsupported band), or inspect any ordinary weekly block.

**Actual:** `buildTimetable()` creates a key, but `updateTimetable()` returns when no corresponding element exists; no `خارج از بازهٔ جدول` notice is shown. Ordinary blocks show name/professor/location but not section or exact start–end time.

**Expected:** Unsupported placement remains visible with an explicit warning; grid blocks include course, section, and exact time. List/review remains authoritative.

**Suggested fix:** Preserve session timing/section in `buildTimetable()` results, collect unplaced sessions during rendering, and expose a visible warning linked to the complete list.

### DEF-6 — Medium: filter reset and active-filter representation are incomplete

**Reproduction:** Choose faculty/group, enter a query, change sort, and enable an advanced filter. Inspect chips and activate `پاک‌کردن همه`.

**Actual:** Only gender/day/units/availability/conflict appear as chips. Clear-all resets only those fields; faculty, group, query, and sort remain active.

**Expected:** Applied constraints are visible and the one-action reset predictably returns to the unfiltered/default result set.

**Suggested fix:** Include faculty/group (and sort when non-default) in the applied-filter summary and make reset semantics explicit. Prefer clearing query and all filters while restoring default sort.

## Commands and results

| Command/check | Result |
|---|---|
| `npm test` | Pass: 10 tests, 0 failures |
| `npm run lint` | Pass: no findings |
| `PYTHONPATH=. ./.venv/bin/pytest -q` | Pass: 20 tests; one upstream Starlette/httpx deprecation warning |
| `git diff --check` | Pass |
| `git diff --name-only -- apps/web/generated` | Pass: no generated files changed |
| Duplicate-ID scan across three HTML pages | Pass: no duplicate IDs |
| Browser/a11y tooling discovery | Unavailable |

## Final decision

The design direction is clearly present and the pure grouping/filter/health foundation is sound, but the implementation does not yet meet the approved quality bar. DEF-1 blocks a required target viewport, while DEF-2 can mislead users during a core selection transition and can destroy the previous choice on undo. Those two defects, plus the incomplete final-review/health actions, require implementation remediation and a focused QA rerun. Browser-based visual, keyboard, contrast, zoom, and assistive-technology validation remains mandatory before final approval.

---

## Final remediation re-test — QA/Feedback Agent, 2026-07-03

**Re-test verdict:** **FAIL — one accessibility remediation remains incomplete**

I read the appended remediation handoff, inspected every changed application/test path, traced the repaired state transitions, and reran the complete verification suite. The critical tablet failure and replacement data-loss behavior are fixed. DEF-3 and DEF-4 are not fully closed because corrective focus and tab state diverge on programmatic exam/issue navigation.

### Defect-by-defect status

| Defect | Status | Re-test evidence |
|---|---|---|
| DEF-1 — tablet workspace inaccessible | **Resolved statically** | JS and CSS now use the same `<=1100px` single-workspace boundary. `setMobView()`, initialization, resize behavior, bottom-nav state, and the later 1024 px sidebar override are aligned. Contract test passes. Live 1024 px rendering remains unavailable. |
| DEF-2 — replacement risks and lossy undo | **Resolved** | `planSelectionChange()` excludes the outgoing ID before conflict/unit projection and returns atomic `before`/`after` sets. `commitAdd()` applies `after`; undo restores the complete `before` set. Equal/differing-unit and outgoing-conflict tests pass. |
| DEF-3 — inert health/final review | **Partially resolved** | Queue and review issues are real buttons and class issues navigate/focus a list item. Exam issues switch to `examsView` but query and focus `#listView`, which is hidden; exam rows have no `data-course-id` or focus target. Unit issues call `.focus()` on `#listView`, a non-focusable div without `tabindex`. See DEF-R1. |
| DEF-4 — incomplete tab keyboard model | **Partially resolved** | Shared helper implements arrows/Home/End and initial/click roving state; mobile controls now have tab roles/relationships. Programmatic `setPlanView()` changes `aria-selected` but not roving `tabindex`, so issue navigation can leave weekly as the tab stop while list/exams is selected. See DEF-R1. |
| DEF-5 — dropped timetable information | **Resolved statically** | Parser retains Thursday/off-band sessions with null slots; timetable results carry section/exact time; placed blocks render both; unplaced sessions show a button leading to the complete list. Domain and contract tests pass. |
| DEF-6 — incomplete filter summary/reset | **Resolved statically** | Query, faculty, group, advanced constraints, and non-default sort are represented; clear-all resets all controls, rebuilds group options, restores relevance sort, persists cleared scope, and rerenders. |

### DEF-R1 — Medium: corrective issue navigation does not provide reliable focus or synchronized tab state

**Reproduction A:** Create/override an exam conflict and activate its Plan Health or Final Review corrective button.

**Actual:** `focusPlanIssue()` selects `examsView`, then searches `#listView [data-course-id=…]`. The list view is hidden and exam rows have no focusable course target. Focus therefore remains on a control that may have just been removed when the Review dialog closes, or does not move to the affected exam.

**Reproduction B:** From weekly view, activate any issue action that calls `setPlanView('list')` or `setPlanView('exams')`, then inspect the three view tabs or press Tab.

**Actual:** `aria-selected` changes, but `tabindex` is not synchronized because the shared tab helper only updates roving state on tab click/keyboard activation. The previously selected weekly tab can remain `tabindex="0"` while the newly selected tab remains `-1`.

**Reproduction C:** Activate a unit-overflow issue.

**Actual:** The list is shown, but `document.getElementById('listView').focus()` cannot focus the plain div because it has no `tabindex`.

**Expected:** Every corrective action moves focus to visible affected content (or a visible view heading/status), and the active plan-view tab is the sole `tabindex="0"` tab.

**Suggested fix:** Give exam rows stable course IDs and programmatic focusability, focus the matching row for exam conflicts, and provide a focusable list heading/status for unit overflow. Centralize programmatic tab selection in the shared tab controller or have `setPlanView()` update both `aria-selected` and `tabindex`. Add a DOM-level test covering programmatic selection and visible focus destination; the present regex contract test cannot detect this mismatch.

### Acceptance reassessment

- Core grouping, filtering, replacement, persistence, plan-health derivation, missing-data labels, RTL escaping, and versioned JSON behavior remain intact by inspection and passing tests.
- Tablet navigation is no longer a known blocker.
- Final Review now lists unresolved issues and provides corrective controls, but the exam/unit keyboard focus outcomes do not meet the approved accessibility requirement.
- Professor stacking now begins at 900 px. Editor tab keyboard handling is connected to the shared helper.
- Previously noted non-blocking gaps remain: onboarding has no collapsed context row/cohort capture; filter sheet lacks the full specified sheet affordances/focus trap; local-storage recovery has no visible guidance; editor destructive actions lack confirmation/undo.

### Re-test commands

| Command/check | Result |
|---|---|
| `npm test` | Pass: 15 tests, 0 failures |
| `npm run lint` | Pass: no findings |
| `PYTHONPATH=. ./.venv/bin/pytest -q` | Pass: 20 tests; one upstream Starlette/httpx deprecation warning |
| `git diff --check` | Pass |
| `git diff --name-only -- apps/web/generated` | Pass: empty; generated data untouched |

### Evidence limitations

Browser and assistive-technology tooling remains unavailable. No target-width/theme screenshots, computed overflow/contrast checks, axe/Lighthouse run, 200%/400% zoom test, real clipboard/download/print execution, virtual-keyboard/safe-area test, or VoiceOver/NVDA smoke test was possible. DEF-R1 is established directly from the DOM/controller contract and does not depend on browser availability.

### Final decision

The remediation materially improves the implementation and resolves DEF-1, DEF-2, DEF-5, and DEF-6. Approval remains withheld until DEF-R1 closes the remaining DEF-3/DEF-4 keyboard-focus gap and the focused re-test passes. Browser-based visual and assistive-technology verification is still required before release.

---

## Final targeted re-test after second remediation — QA/Feedback Agent, 2026-07-03

**Final verdict: PASS**

The second remediation closes DEF-R1 and the remaining portions of DEF-3/DEF-4 without a detected static, domain, persistence, responsive-contract, or test regression.

### Targeted evidence

| Check | Result | Evidence |
|---|---|---|
| Central programmatic tab state | **Pass** | Shared `selectTab()` finds the owning tablist and atomically sets the active peer to `aria-selected="true"`/`tabindex="0"` and all others to `false`/`-1`. `enhanceTablists()` delegates click and arrow/Home/End activation to it. |
| Student programmatic view changes | **Pass** | `switchTab()`, `setPlanView()`, and single-workspace navigation call `selectTab()`. Corrective navigation therefore keeps visible panel, ARIA selection, and roving tab stop aligned. |
| Class-conflict destination | **Pass** | Opens `listView` and focuses the matching visible `article[data-course-id]`, which has `tabindex="-1"`. |
| Exam-conflict destination | **Pass** | Opens `examsView`, whose rows now carry stable `data-course-id` and `tabindex="-1"`, then focuses the matching visible exam row. It no longer queries the hidden list. |
| Unit-overflow destination | **Pass** | Opens `listView` and focuses the dedicated `#planListFocus` heading with `tabindex="-1"`. |
| Empty/fallback focus anchors | **Pass** | Both plan list and exam list render programmatically focusable headings independently of whether rows exist. |
| Review-dialog transition | **Pass by code trace** | Corrective activation closes the dialog and then calls `focusPlanIssue()` synchronously, so its visible destination becomes the final focus target after dialog-origin restoration. |
| Editor tab integration | **Pass** | Editor switching uses the same shared selection helper and synchronizes active classes plus panel `hidden` state. |
| Regression coverage | **Pass** | The new executable unit test runs the actual `selectTab()` implementation against two peers and checks both ARIA and `tabIndex`. UI contracts also assert exam/list anchors, correct container choice, and centralized plan-tab selection. |

### Complete final validation

| Command/check | Result |
|---|---|
| `npm test` | **Pass:** 16 tests, 0 failures |
| `npm run lint` | **Pass:** no findings |
| `PYTHONPATH=. ./.venv/bin/pytest -q` | **Pass:** 20 tests; one upstream Starlette/httpx deprecation warning |
| `git diff --check` | **Pass** |
| `git diff --name-only -- apps/web/generated` | **Pass:** empty; generated data untouched |
| Duplicate-ID scan of student/professor/editor HTML | **Pass:** no duplicates |

### Final defect disposition

- DEF-1: resolved.
- DEF-2: resolved.
- DEF-3: resolved.
- DEF-4: resolved.
- DEF-5: resolved.
- DEF-6: resolved.
- DEF-R1: resolved.
- No new blocking defect found.

### Evidence boundary

This PASS covers the implementation and all verification feasible in the supplied environment. Browser binaries and assistive-technology tooling remain unavailable, so target-width/theme screenshots, computed layout and contrast, 200%/400% zoom, axe/Lighthouse, real clipboard/download/print behavior, virtual-keyboard/safe-area behavior, and VoiceOver/NVDA smoke tests were not executed. Those remain external release-verification activities, not known failures.

### Approval

The implementation passes final code-level QA against the approved redesign and the remediation acceptance criteria. It is approved to proceed to browser/device and assistive-technology release verification.
