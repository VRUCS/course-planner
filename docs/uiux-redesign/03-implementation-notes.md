# Implementation Notes — 03

**Stage:** Implementation (Design → Review → **Implementation** → QA)
**Implements:** `01-design-spec.md` (P1-1 … P1-11) as amended by the blocking corrections B1–B6 in `02-design-review.md`.
**Date:** 2026-07-03

**Files changed:**

- `apps/web/styles/main.css`
- `apps/web/index.html`
- `apps/web/professor.html`
- `apps/web/data-editor.html`
- `apps/web/scripts/pages/student-planner.js`
- `apps/web/scripts/pages/professor-dashboard.js`
- `apps/web/scripts/pages/data-editor.js`

`apps/web/scripts/features/ui.js`, `apps/web/scripts/domain/**`, and `apps/web/generated/**` are untouched.

---

## 1. What was implemented, per P1 item

### P1-1 — Token refresh, semantic aliases, type scale, contrast fixes
- Replaced the `:root` and `[data-theme="light"]` blocks in `main.css` with the spec's token set: `--t0` (fixes the undefined-var bug), `--accent`/`--accent-strong`/`--accent-border`, status triads (`--ok/--warn/--err` × `text/bg/border`), type scale `--fs-2xs … --fs-2xl`, `--tap`, `--focus-ring`, light-theme `--sh3` override, retinted light borders/text.
- **Dark `--t3` is `#8494a8`** (B3 option a), not the spec's `#64748b`.
- Global `prefers-reduced-motion: reduce` block added; `body { line-height: 1.6 }`.
- `:focus-visible` retinted to `outline: 2px solid var(--accent); outline-offset: 2px;` (B2 — no `outline:none`, no border-radius change). `--focus-ring` kept as an opt-in token only; currently no component consumes it.
- Migration applied across `main.css` and page `<style>` blocks / JS-inline styles: raw status colors as *text* → semantic tokens; hard-coded rgba borders → `--*-border` aliases; `#2563eb` hovers → `--accent-strong`; ad-hoc font sizes ≤ 0.78rem → `--fs-*` (nothing below `--fs-2xs` remains); `.text-*` utility classes re-pointed at the scale (they are unused in markup).
- Light-theme gender badge overrides added exactly as specced (D-8).

### P1-2 — Course card (flagship)
`renderCourseList()` in `student-planner.js` + course-card CSS:
- **Session chips** from `CourseDomain.parseSchedule(c.time_html)` (B1), rendered as `.time-chip`s (`شنبه ۸–۱۰`, Persian digits, de-duplicated); omitted when nothing parses.
- **Exam chip** `.time-chip.exam-chip` with `📝` + `toPersianNum(parseExam(c.exam_text).date)` (review suggestion N2).
- **Conflict preview**: selection's session lists computed **once per render** (`getSelectedSessionList()`), each unselected card checked with `CourseDomain.sessionsOverlap(sessions, other)` (N4 — two-arrays signature) plus `findExamClash`. Conflicting cards get `.has-conflict` (err border) and `⚠ تداخل کلاس` / `⚠ تداخل امتحان` danger badges; card stays clickable.
- **CTA pill** `.course-card-cta` (`+ افزودن` idle / `✓ حذف` filled when selected), `aria-hidden="true"`.
- **Faculty strip** now consumed: `::before` background `var(--fc, transparent)` at `opacity:.6`, full opacity on hover/selected (B5, see §2).
- Type bump: name → `--fs-md`, id → `--fs-2xs` (passes AA with the new `--t3`), prof → `--fs-xs`; capacity bar 4px + `aria-hidden`; card `aria-label` now includes capacity (`ظرفیت X از Y`) and any conflict.

### P1-3 — Class-block recolor + finite conflict animation
- `.class-block`: `--fc`-driven `color-mix(in srgb, var(--fc) 22%, var(--s2))` tint + 3px `border-inline-start`, `color: var(--t1)`, `--fs-2xs` text, with a solid `background: var(--s3)` fallback line declared first for non-`color-mix` browsers.
- `.class-block.conflict`: 26% red mix, `--err-border`, `::after '⚠'` glyph; the infinite pulse is gone — `.conflict.just-added` animates `pulse-conflict 1.2s ease 2` only on the block(s) of the most recently added course (`lastAddedId`, reset after each `updateTimetable()`).
- JS on both pages now sets `div.style.setProperty('--fc', color)` instead of inline background/gradient. Professor page: soft conflicts → `--fc: var(--yellow)`, ok → `var(--blue)`, hard keeps `.conflict` (N5).
- `professor.html` page override updated to `font-size: var(--fs-2xs)`; the inline `.58rem/opacity` style on the section-id line removed (now a `.class-block-prof` element) (N5).

### P1-4 — Touch-usable remove button
28×28px visual, `::after { inset: -8px }` extends the hit area to 44px, `font-size:14px`, `background: rgba(0,0,0,0.45)`; hover/focus-revealed on fine pointers and **always visible under `@media (pointer: coarse)`**.

### P1-5 — Mobile GPA/unit bottom sheet (B4)
- `#mobUnitPill` converted `div` → `<button type="button" aria-haspopup="dialog">` opening `#unitSheet`; mobile CSS gained button resets (`font-family:inherit`, cursor, tap-highlight) plus an `::after` hit-area extension; base `.mob-unit-pill { display:none }` kept for desktop.
- New `#unitSheet` modal (reuses `.modal-backdrop`/`.modal-box`, max-width 340px, `role="dialog"`, Escape/backdrop close via existing `openDialog`/`closeDialog` and the page-level Escape handler) containing a second unit bar (`*Sheet` ids), the GPA field **with its own id `gpaInputSheet`** and `<label for>`, wired to the same `onGpaChange`, and the helper text from the spec.
- `restoreGpaInput()` now syncs **both** inputs but never overwrites the input currently focused (so typing `17.` isn't clobbered); `onGpaChange` calls it after persisting; `openUnitSheet()` calls it on open.
- `updateUnitDisplay()` refactored to drive desktop + sheet displays from one loop; adds `⚠` prefix to the count when over cap; both unit displays have `role="status"` (D-4.2); bar fill colors moved to `var(--accent)/--warn-text/--err-text`.

### P1-6 — Timetable empty state
When `state.selected` is empty, `updateTimetable()` replaces `#timetable`'s content with an `.empty-state.timetable-empty` (spans the whole grid) — icon 📅, `برنامه‌ات خالی است`, spec desc, and a `رفتن به جستجو` primary button (`.show-mobile`, calls `setMobView('search')`). The grid is rebuilt lazily (`if (!tbl.querySelector('.slot')) buildTimetableGrid()`) when the first course is added — resolves review N7 explicitly.

### P1-7 — Select chevron + input min-heights
- `select { background-image: <inline SVG chevron> }` placed **after** the shared input rule so the `background:` shorthand can't reset it (N3); chevron stroke `#64748b` (≥3:1 in both themes, N3); positioned `left 12px center` with `padding-left: 32px` for RTL.
- `.input, select, input[type=text], input[type=number]` → `min-height: 40px`; bumped to `var(--tap)` (44px) in the ≤768px media query.

### P1-8 — Curriculum status glyphs + legend
- `.cur-status-dot` replaced by 14px `.cur-status-glyph` (`✓ ✗ ↻ + 🔒`), `aria-hidden`, colored with status text tokens; card name colors → `--ok-text/--err-text/--accent/--warn-text`; borders → semantic border tokens.
- Cards now carry `aria-label="«نام درس»، <status+action tooltip>"` (reuses the existing `statusTooltip` map).
- One-line cycle legend prepended to the curriculum scroll: `یک‌بار کلیک: پاس ✓ · دوباره: افتاده ✗ · بار سوم: حذف علامت` (`.cur-legend`).
- `.sem-title` → `--fs-2xs` on `--t2`; `.cur-card-units` → `--fs-2xs`; `.cur-card-name` → `--fs-xs`.

### P1-9 — data-editor tabs → buttons; label associations
- `.page-tab` divs converted to `<button role="tab">` inside `role="tablist"`, with `aria-selected` (kept in sync by `switchAdminTab`), `aria-controls`, `min-height: 44px`, button-reset CSS; panels got `role="tabpanel"`/`aria-labelledby`. Global `:focus-visible` ring applies.
- `for`/`id` added to every labelled control on data-editor (`rfFaculty`, `rfGroup`, `cfFieldName`, `cfFaculty`, `cfGroup`, `cfCohorts`, `cfTotalUnits`) and professor (`facultySelect`, `groupSelect`, `conflictFilter`); index.html got `for="cohortSelect"` plus `aria-label`s on the unlabeled search/filter controls.
- **N1 promoted into this item:** `#outputModal` box now has `role="dialog" aria-modal="true" aria-labelledby="outputTitle"`; `openOutput`/`closeOutput` gained focus-move/focus-restore and an Escape handler (same pattern as the planner dialogs); close button has `aria-label`; `copyMsg` has `role="status"`.

### P1-10 — Exam modal glyphs + sticky header; toast position
- Exam table gained a first status column: flagged rows render `⛔` (`role="img" aria-label="تداخل زمانی امتحان"`) or `⚠` (`دو امتحان در یک روز`); `thead` updated (4 columns, sr-only header cell), empty-state `colspan` → 4.
- Sticky header: `.modal-body .data-table thead th { position: sticky; top: 0; background: var(--s2); }`.
- Exam dates/times in the modal now render in Persian digits.
- Mobile toasts raised above the bottom nav: `bottom: calc(62px + env(safe-area-inset-bottom, 0px) + var(--sp3))` in the shared ≤768 block. Toasts also got the 3px status `border-inline-start`, semantic border/icon colors, `--fs-sm` floor, and a 32px-hit close button on `--t2` (N6).

### P1-11 — Bug fixes, aria-labels, h1s
- D1: `--t0` defined (both themes) — `.gpa-box input` color valid again.
- D2: `--fc` consumed (P1-2/P1-3).
- D3: invalid `safe-area-inset-bottom: env(…)` declaration deleted from `index.html`.
- D5: no-op ternary replaced — both pages now assign `timetable-header timetable-corner` and the corner styling lives in a `.timetable-corner` CSS rule; the old `:first-child` rule and both inline `style.cssText` hacks removed (N8).
- Icon-only buttons: theme (both pages), print, AI send/clear/close got `aria-label`s; decorative emoji wrapped in `aria-hidden="true"` spans. Theme button label/icon kept in sync via new `syncThemeButton()` (called at init and on toggle) announcing `تغییر به تم روشن/تیره`.
- h1s: professor (`داشبورد استاد`) and data-editor (`ویرایشگر داده`) brand names promoted to `<h1>`; index.html already had one.

---

## 2. How each blocking correction was handled

| # | Resolution |
|---|-----------|
| B1 | All schedule parsing uses `CourseDomain.parseSchedule(c.time_html)`; verified against generated data (1486/1560 offerings parse to ≥1 session; chips + clash pairing confirmed in a Node smoke test). |
| B2 | Global `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`. No `outline: none`, no `border-radius`, no global box-shadow ring. `--focus-ring` exists as an opt-in token only. |
| B3 | Option (a): dark `--t3: #8494a8` (5.84:1 on `--s1`, 5.28:1 on `--s2`); light `#5b6b81`. `.course-card-id` stays `--t3` at `--fs-2xs` and now passes AA. |
| B4 | Sheet input is `#gpaInputSheet` with its own `<label for>`; `restoreGpaInput()` syncs both (skipping the focused one); pill is a real `<button>` with UA-style resets and desktop `display:none` retained. |
| B5 | `.course-card:hover::before` no longer sets a background (only `opacity: .6 → 1`), so the faculty strip survives hover; `.selected::before` is `var(--fc, var(--blue))` at full opacity. |
| B6 | `toggleCourse()` adds `hasTimeClashWithSelection()`; adding a time-clashing course shows `Toast.warning('«نام درس» با برنامه فعلی تداخل کلاس دارد', 4000)` (exam clash still wins with the error toast). |

---

## 3. Deviations from the spec (and why)

1. **`.gpa-box input { min-height: 0 }`** (index.html): the new global `input[type=number] { min-height: 40px }` would inflate the borderless GPA input inside the 54px topbar pill. The pill supplies the size; the sheet copy is unaffected.
2. **`restoreGpaInput()` skips the focused input** instead of blindly rewriting both (B4's literal suggestion) — rewriting the field being typed in would destroy in-progress input like `17.`.
3. **`.time-chip` retinted to `var(--b0)`/`var(--b1)`/`--t2`** instead of its hard-coded white rgba values, which were dark-theme-only. Needed since the chip now appears in course cards in both themes. No "move" of the rule was needed (review V32).
4. **`.conflict-severity.soft` text is dark (`#1f1300`) on yellow** instead of white (1.9:1). White is kept on the red hard-severity pill (passes).
5. **Unit bar fill colors** use `var(--accent)/--warn-text/--err-text` (theme-aware) rather than raw `--blue/--yellow/--red`; D-4.2 asked for `--warn-*`/`--err-*` tokens and the text variants are the contrast-safe members of each triad for a 4px indicator.
6. **`.mob-nav-badge` moved to `--fs-2xs`** (spec allowed keeping 0.68rem but preferred the floor).
7. **Theme-button state**: implemented the spec's own correction (dynamic `aria-label`, no `aria-pressed`) via `syncThemeButton()`, also run at init so a persisted light theme gets the right label/icon.
8. **`professor-dashboard.js` section-id line** now uses the `.class-block-prof` class (not `-loc`, which carries a 📍 prefix) — fulfils N5's "style via class" with an existing class instead of a new one.
9. **Exam modal times/dates in Persian digits** — N2 asked only for the card chips; applied in the modal too for consistency.
10. The **sticky-thead** half of P1-10 was kept (review allowed demoting it); it was one rule.

---

## 4. Test / lint / validation results

- `npm run lint` (eslint 9): **clean** on all changed JS.
- `npm test` (`node --test tests/frontend/*.test.js`): **7/7 pass** (domain/storage tests — unaffected by these UI changes, as expected).
- `node --check` on all four touched JS files: OK.
- HTML tag-balance check (Python `html.parser`) on all three pages: **OK**.
- Token audit: every `var(--…)` referenced in `apps/web` (excluding `generated/`) resolves to a definition (`--fc` set at runtime via `setProperty`).
- Sweeps confirm: no remaining `font-size` below 0.72rem, no `#2563eb`/status-rgba hard codes outside token definitions, no leftover `cur-status-dot`, `timetable-header:first-child`, or inline gradient assignments.
- Node smoke test against `course-offerings.generated.js`: chips format as `شنبه ۱۳–۱۶`, exam chip `📝 ۱۴۰۵/۰۳/۲۱`, real time-clash pair detected via `sessionsOverlap`.

---

## 5. Known limitations / QA attention

1. **No browser-based visual verification was run** (no headless browser in this environment). QA should eyeball: both themes on all three pages, the course-card chips/CTA at 370px sidebar width, the mobile unit sheet, the timetable empty state ↔ grid rebuild transition, and select chevron placement in RTL.
2. `.unit-display.warning/.danger` classes are toggled by JS but have no CSS rules — **pre-existing** behavior, kept as-is (the bar fill + ⚠ glyph carry the state). Cheap follow-up if QA wants the pill tinted.
3. `color-mix()` fallback is a flat `var(--s3)` block with the colored edge — pre-2023 browsers lose the faculty tint but stay readable.
4. Curriculum card `aria-label`s use the tooltip text (status + action); the spec's exact `وضعیت:` phrasing was folded into that reuse.
5. The conflict-preview exam check (`findExamClash` per card) parses selected courses' exams per card; at the 100-card render cap this is negligible, but a QA perf pass on very large selections wouldn't hurt.
6. P2 items intentionally untouched: toast undo action, bottom-sheet modal presentation, self-hosted font, summary-card filters, mobile exam card view, match highlighting, skeletons, logical-properties migration.

---

## 6. QA fixes (post `04-qa-report.md`, verdict FIX-THEN-SHIP)

All eight defects addressed; lint/tests/token-audit/HTML checks re-run green.

| DEF | Fix applied | Verification |
|-----|-------------|--------------|
| DEF-1 (MAJOR, contrast) | Dark `:root` `--accent` changed from `var(--blue)` to **`#60a5fa`** (`main.css`). `--blue` fills, `--accent-strong`, and light `--accent: #2563eb` untouched. | Re-measured: active tab on `--s3` **5.66:1**, CTA on `--s2` **6.42:1**, pill / `.cur-card.available` on blue-dim **5.99:1** — all AA. Focus ring improves too. |
| DEF-2 (MAJOR, a11y) | `.modal-backdrop` now also sets `visibility: hidden` (with `visibility` added to the transition so the fade-out still plays), `.modal-backdrop.open` sets `visibility: visible` (`main.css`). Fixes all five dialogs at once: closed `#unitSheet`'s `role="status"` copy leaves the a11y tree (no duplicate announcements) and its GPA input/close button leave the tab order. | Static: `visibility` transitions discretely alongside opacity (visible during fade-out, hidden at end) — open/close animations preserved. |
| DEF-3 (MINOR, touch) | `min-height: 0` removed from the shared `.gpa-box input` rule and re-scoped as `.topbar-center .gpa-box input { min-height: 0; }` (`index.html`). The notes' earlier §3.1 claim ("the sheet copy is unaffected") was wrong, as QA found — corrected here. | `#gpaInputSheet` now inherits the global `input[type=number]` min-height (40px desktop / 44px mobile). |
| DEF-4 (MINOR, contrast) | Light `--warn-text` darkened `#b45309` → **`#92400e`** (`main.css`). | Re-measured: exam topbar button (warn-bg over light `--s1`) **6.17:1**, warning-toast icon on `--s4` **5.75:1**. |
| DEF-5 (MINOR, contrast) | Added light-theme overrides pointing `.badge-primary`, `.cur-card.available .cur-card-name`, and `.cur-card.available .cur-status-glyph` at `var(--accent-strong)` (`main.css`) — QA's preferred option over lightening `--blue-dim`. | Re-measured: **5.73:1** on blue-dim over white. |
| DEF-6 (chevron overlap) | `table.cur-table td select` `padding-left: 22px` → **26px** (`data-editor.html`). | Chevron occupies 12–24px from the left edge; 26px clears it. |
| DEF-7 (dynamic controls unlabeled) | `aria-label`s added in `data-editor.js`: autocomplete input (`جستجوی درس (کد یا نام)`), reason input (`دلیل`), all eight `cfAddRow` cells (`ترم`, `شناسه درس`, `نام درس`, `واحد`, `نوع درس`, `پیش‌نیازها (شناسه‌ها)`, `کد ورودی ۱/۲`), row delete buttons (`حذف ردیف`). Bonus: the autocomplete clear `×` span got `role="button" tabindex="0"` + `aria-label="پاک کردن انتخاب"` + Enter/Space handling (it was click-only). | Grep: no unlabeled dynamic controls remain in `buildAC`/`rfAddRow`/`cfAddRow`. |
| DEF-8 (hit areas) | `.modal-close` (36px) and `.toast-close` (32px) got `position: relative` + `::after` hit-area extensions (`inset:-4px` → 44px; `inset:-6px` → 44px) in `main.css`. | Matches the established `.remove-btn` pattern. |

**Re-validation after fixes:** `npm run lint` clean; `npm test` 7/7 pass; `node --check` OK on touched JS; token audit — no undefined `var(--…)`; HTML tag balance OK on all three pages; contrast script re-run over every pair QA flagged (numbers above).

---

## 7. VERIFY-1 hardening (post-SHIP, applied by orchestrator)

QA's re-verification (`04-qa-report.md` §8) left one LOW open item: with `visibility` in the
transition list, the synchronous `focus()` in `openDialog()`/`openOutput()` runs at transition
progress 0, where a strict spec reading leaves the dialog `visibility: hidden`, so initial focus
could silently fail in some engines. Since no browser is available to test, the zero-risk
hardening QA specified was applied preemptively in `main.css`:

- `.modal-backdrop` → `transition: opacity var(--mid), visibility 0s var(--mid);`
- `.modal-backdrop.open` → `transition: opacity var(--mid), visibility 0s;`

Visibility now flips instantly on open (focus lands reliably) and only after the fade on close
(fade-out preserved). Re-validated: `npm run lint` clean, `npm test` 7/7 pass.

---

## 8. Browser smoke test + VERIFY-1 real fix (headless Chromium, post-§7)

A Playwright/Chromium pass over all three pages (desktop 1360px + mobile 390px, both themes)
confirmed the redesign renders as specified: card chips, conflict-preview chips, CTA pills,
tinted timetable blocks, empty states, unit sheet, toasts, exam modal, professor dashboard.
Console is clean except the pre-existing `localhost:8000/health` probe of the optional AI
backend (expected when the FastAPI service is down).

The smoke test proved QA's VERIFY-1 concern real — and showed the §7 CSS hardening was NOT
sufficient. Root cause: focusable children of the backdrop carrying `transition: all`
(e.g. `.modal-close`) transition their *inherited* visibility themselves, so they remain
`visibility: hidden` (unfocusable) for a frame after `.open` is added; the synchronous
`focus()` in the dialog openers silently failed (verified: `activeElement` stayed on the
trigger). Neither forced reflow nor double-rAF fixed it in Chromium.

Fix (browser-verified):
- `main.css` `.modal-close`: `transition: all var(--fast)` → `background var(--fast), color var(--fast)`
  (instant focusability in the common case).
- `student-planner.js openDialog()` / `data-editor.js openOutput()`: after the synchronous
  `focus()`, if focus didn't land, retry once at 60 ms — guarded by
  `!dialog.contains(document.activeElement)` so it never steals focus the user moved.

Re-verified in Chromium: tap `#mobUnitPill` → focus lands inside `#unitSheet`; Escape closes
and restores focus to the pill; exam modal focus lands inside. `npm run lint` clean,
`npm test` 7/7.
