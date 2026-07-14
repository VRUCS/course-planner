# Design Spec Review — 02

**Reviewed artifact:** `docs/uiux-redesign/01-design-spec.md` (v1.0)
**Reviewer:** Review Agent (Design → **Review** → Implementation → QA)
**Date:** 2026-07-03
**Method:** Every code-level claim was checked against the actual files (`apps/web/index.html`, `apps/web/styles/main.css`, `apps/web/scripts/pages/student-planner.js`, `apps/web/scripts/pages/professor-dashboard.js`, `apps/web/scripts/pages/data-editor.js`, `apps/web/scripts/features/ui.js`, `apps/web/scripts/domain/course-domain.js`, `apps/web/scripts/domain/planner-domain.js`, `apps/web/professor.html`, `apps/web/data-editor.html`, `apps/web/generated/course-offerings.generated.js` (read-only)). All contrast ratios were recomputed with the WCAG relative-luminance formula.

---

## 1. Verification Results

| # | Spec claim | Code reality | Verdict |
|---|-----------|--------------|---------|
| V1 | D1: `var(--t0)` used but never defined, `index.html` line 43 (`.gpa-box input`) | `index.html:43` has `color: var(--t0)`; `--t0` is defined nowhere (grep across all CSS/HTML/JS) | **VERIFIED** |
| V2 | D2: JS sets `--fc` on course cards (`student-planner.js` line 211) but no CSS consumes it; `.course-card::before` idle background is `transparent` | `student-planner.js:211` `el.style.setProperty('--fc', color)`; `main.css:199-211` `::before` uses `transparent` / `--b2` (hover) / `--blue` (selected). `--fc` is dead | **VERIFIED** |
| V3 | D3: invalid `safe-area-inset-bottom: env(...)` declaration at `index.html` line 206 | Exactly at `index.html:206` inside `.mob-nav` | **VERIFIED** |
| V4 | D4: `appearance: none` on selects with no replacement chevron | `main.css:146-153` shared `.input, select, …` rule sets `appearance: none`; no `background-image` anywhere for selects | **VERIFIED** |
| V5 | D5: no-op ternary in `buildTimetableGrid()`, `student-planner.js` line 335 | `student-planner.js:335`: `el.className = d === 'ساعت' ? 'timetable-header' : 'timetable-header';` | **VERIFIED** |
| V6 | Contrast: `--t3` `#475569` on `--s1` dark = 2.4:1 | Computed 2.38:1 | **VERIFIED** |
| V7 | Contrast: `--t3` `#94a3b8` on white (light) = 2.6:1 | Computed 2.56:1 | **VERIFIED** |
| V8 | Contrast: `--blue` `#3b82f6` on white = 3.7:1 | Computed 3.68:1 | **VERIFIED** |
| V9 | Contrast: white on `#22d3ee` = 1.8:1 | Computed 1.81:1 | **VERIFIED** |
| V10 | Contrast: `--yellow` `#f59e0b` on white ≈ 2.2:1 | Computed 2.15:1 | **VERIFIED** |
| V11 | `--t2` passes both themes (7.0 dark / 7.6 light) | Computed 7.05:1 and 7.58:1 | **VERIFIED** |
| V12 | Proposed dark `--t3` `#64748b`: "3.9:1 on --s1, **4.6:1 on --s2**" | Computed **3.80:1 on `--s1`** and **3.43:1 on `--s2`**. The 4.6:1 figure is wrong and inverted: dark `--s2` (#132035) is *lighter* than `--s1`, so contrast is *lower* there, not higher | **INCORRECT** (see B3) |
| V13 | Proposed light tokens: `--t2` #3f4f66 "8+:1", `--t3` #5b6b81 "5.0:1", `--accent` #2563eb "5.2:1" on white | Computed 8.33:1, 5.43:1, 5.17:1 | **VERIFIED** |
| V14 | Proposed status text tokens pass in both themes | Dark on `--s2`: ok 8.50, warn 9.78, err 5.90. Light on white: ok 5.48, warn 5.02, err 6.47 | **VERIFIED** |
| V15 | `color-mix` block recolor keeps text readable | `--t1` on 22% cyan mix over dark `--s2` ≈ 9.1:1; light theme even higher. Sound approach | **VERIFIED** |
| V16 | Sub-10px type: `.class-block-loc` 0.58rem, `.class-block-prof` 0.62rem, `.mob-nav-badge` 0.6rem, `.cur-card-units`/`.conflict-severity` 0.66rem, badges 0.68rem | All present at the quoted values (`main.css:296-297,333,345,525-527,180`; `index.html:230`) | **VERIFIED** |
| V17 | `.remove-btn` 18×18px, `display:none` until hover/focus-within → no touch removal | `main.css:306-317`. Blocks are unfocusable divs; remove button unreachable on touch | **VERIFIED** |
| V18 | `.modal-close` 30×30; `.tab-btn` ~32px; `.ai-send-btn` 34px; `.ai-header-btn` ~24px; inputs ~38px | `main.css:431-437` (30px), `238-244` (7px pad + 0.82rem ≈ 32px), `679-684` (34px), `608-613` (4px pad + .9rem), inputs 9px pad + 0.875rem ≈ 39px | **VERIFIED** |
| V19 | Course cards show no meeting times/exam date; data available via parsing | `renderCourseList()` (`student-planner.js:170-240`) renders name/id/badges/prof/capacity only | **VERIFIED** (but see B1 — wrong field name in spec) |
| V20 | `CourseDomain.parseSchedule(c.schedule)` / spec's data source for session chips | **The field is `c.time_html`, not `c.schedule`.** Course objects have `time_html` and `exam_text` (see `generated/course-offerings.generated.js`; `planner-domain.js:65` `parseSchedule(course.time_html)`). No `schedule` property exists | **INCORRECT** (see B1) |
| V21 | `PlannerDomain`/`sessionsOverlap` exist for pre-add conflict check | `PlannerDomain.buildTimetable` (`planner-domain.js:60`) and `PlannerDomain.findExamClash` (`:47`) exist. `sessionsOverlap` is **`CourseDomain.sessionsOverlap`** (`course-domain.js:109`), also exposed as a global wrapper in `ui.js:125`. It is *not* on `PlannerDomain`, and it takes **two arrays of sessions**, not two single sessions | **PARTIALLY CORRECT** |
| V22 | Existing functions: `findExamClash`, `bindActivation`, `setMobView`, `restoreGpaInput`, `openDialog`/`closeDialog`, `Toast.show`, `toPersianNum`, `parseExam`, `updateUnitDisplay`, `renderCourseList`, `updateTimetable`, `buildTimetableGrid`, `switchAdminTab`, `onGpaChange` | All exist with the stated names (`student-planner.js:265,584,728,29,38,45`; `ui.js:64,104`; `course-domain.js:77`; `data-editor.js:8`) | **VERIFIED** |
| V23 | GPA input lives in `.topbar-center`, hidden on mobile → mobile users cannot set GPA | `index.html:186` `.topbar-center, .brand-badge { display: none; }` in ≤768 block; pill is display-only | **VERIFIED** |
| V24 | `mob-exam-btn` kept visible via `:not(.mob-exam-btn)` | `index.html:188` | **VERIFIED** |
| V25 | Exam modal danger/warning rows convey meaning via `title` only | `openExamModal()` (`student-planner.js:640-641`) sets `tr.className` + `tr.title` only | **VERIFIED** |
| V26 | Accessibility "good" list: modals have `role=dialog`/`aria-modal`/Escape/focus-restore; tabs proper ARIA; course cards real buttons with `aria-pressed`; toasts `role=status/alert`; `aria-live` counts | True for **index.html** modals and components. **Not true for data-editor's `#outputModal`**: no `role="dialog"`, no `aria-modal`, `openOutput/closeOutput` (`data-editor.js:265-271`) toggle a class with no focus management and no Escape handling | **PARTIALLY CORRECT** |
| V27 | No `prefers-reduced-motion` handling anywhere | grep: zero occurrences outside generated code | **VERIFIED** |
| V28 | Light theme `--sh3` not overridden (harsh 0.6-alpha shadow in light mode) | `main.css:69-86` light block defines `--sh1`, `--sh2` only | **VERIFIED** |
| V29 | `.page-tab` in data-editor: `<div onclick>`, no keyboard/ARIA; labels unassociated on data-editor and professor pages; professor.html has no `<h1>` | `data-editor.html:67-70`; labels at `data-editor.html:81-133`, `professor.html:97,103,109` have no `for`; professor brand is a `<div>` | **VERIFIED** |
| V30 | "Toast on add already warns" about conflicts (used in D-2.4 to justify keeping conflicting cards clickable) | `toggleCourse()` (`student-planner.js:245-263`) warns **only for exam clashes** (`findExamClash` → `Toast.error`); a time-clash add produces a plain success-style info toast | **PARTIALLY CORRECT** (see B6) |
| V31 | Token block header "Borders (unchanged)" | Dark `--b2` changes 0.15→0.16; light borders change base color (rgba(0,0,0,…)→rgba(15,23,42,…)) and alphas (0.04/0.08/0.14→0.06/0.10/0.16). The values in the spec block are fine to apply — only the "unchanged" label is inaccurate | **PARTIALLY CORRECT** |
| V32 | `.time-chip` "exists in main.css; move it out of the professor-only section" | `.time-chip` is in `main.css:535` (Conflict Cards section). `main.css` is loaded by **all three pages**, so the class is already usable from index.html; no move is required | **PARTIALLY CORRECT** (instruction is a harmless no-op) |
| V33 | 100-result cap note "is 10px text" | `student-planner.js:235` sets `.72rem` = 11.5px | **INCORRECT** (trivial; no impact) |
| V34 | Faculty palette / `.class-block` gradient code to replace: `div.style.background = color; div.style.backgroundImage = …` in both pages | `student-planner.js:369` matches exactly. `professor-dashboard.js:108-112` matches in shape but passes `'var(--yellow)'`/`'var(--blue)'` strings — its gradient (`var(--yellow)cc`) is already invalid CSS and silently dropped today. The proposed `setProperty('--fc', color)` works for both pages, including `var()` strings | **VERIFIED** (with professor-page caveats, see N5) |

---

## 2. Blocking Issues (MUST fix before implementation)

### B1 — Wrong field name for schedule parsing (D-2.2 and audit §UX-1)
The spec says session chips come from `CourseDomain.parseSchedule(c.schedule)`. **There is no `schedule` field.** Course objects use `time_html` (and `exam_text` for exams).
**Correction:** everywhere the spec says `parseSchedule(c.schedule)`, read **`CourseDomain.parseSchedule(c.time_html)`** (this is exactly what `planner-domain.js:65` and `professor-dashboard.js:94` do). An Implementation Agent following the spec literally would render zero session chips and believe the feature works for courses "with no parsable schedule".

### B2 — The `:focus-visible` replacement breaks focus indication and element shapes
The proposed rule `:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--r1); }` has two concrete defects:
1. `border-radius: var(--r1)` **changes the element's own radius on focus** — circular controls (`.modal-close`, `.ai-send-btn`, `.remove-btn`, badges) would visibly deform to 6px corners whenever keyboard-focused.
2. With `outline: none`, any component whose own rules also set `box-shadow` and win the cascade shows **no focus indicator at all**. This is not hypothetical: `.btn-primary` sets `box-shadow: 0 0 0 0 var(--blue-glow)` (`main.css:134`) in a rule that appears *after* the reset section with equal-or-greater effective precedence; `.course-card.selected`, `.tab-btn.active`, and `.toast` set `box-shadow` at higher specificity. Focused primary buttons and selected course cards would lose their ring entirely — a regression from today's outline.

**Correction:** keep an outline-based ring, retinted:
```css
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```
(outlines follow `border-radius` in all evergreen browsers, so the "hugs rounded corners" motivation is already satisfied). Keep the `--focus-ring` token only for opt-in use on components where a box-shadow ring is explicitly added at sufficient specificity. Do **not** set `border-radius` inside `:focus-visible`.

### B3 — New dark `--t3` contradicts the spec's own acceptance criteria (and one figure is wrong)
Measured: `#64748b` = **3.80:1 on `--s1`**, **3.43:1 on `--s2`** (spec claims 4.6:1 on `--s2` — wrong, and directionally impossible since dark `--s2` is lighter than `--s1`). Meanwhile checklist (e) demands "All text ≥ 4.5:1 in both themes", and the token comment allows `--t3` for "text ≥ 0.78rem" — 12.5px normal-weight text is nowhere near WCAG's large-text exemption (24px, or 18.7px bold), so *any* `--t3` text fails AA in dark mode. Worse, D-2.6 itself assigns `.course-card-id` — a `--t3`-colored element — to `--fs-2xs` (0.72rem), violating the spec's own "≥ 0.78rem" rule.
**Correction (pick one, state it in the implementation notes):**
- **(a) Recommended:** raise dark `--t3` to `#8494a8` (measured 5.84:1 on `--s1`, 5.28:1 on `--s2` — passes AA everywhere; light `#5b6b81` already passes), and delete the "≥ 0.78rem only" caveat; or
- **(b)** keep `#64748b` but restrict `--t3` to decorative/disabled/non-text use only, and re-point all informational microcopy currently on `--t3` (course IDs, time labels, empty-state text, count captions) to `--t2` — this touches more call sites than (a).
Either way, `.course-card-id` must end up ≥ 4.5:1 at its final size.

### B4 — Mobile GPA sheet: duplicate-ID / sync plan is not implementable as written
D-4.3 says the sheet contains "the GPA field (move to a shared partial: **same `input`** …)" and "the two GPA inputs sync via `restoreGpaInput()` on open". There are no partials in a no-build vanilla app; a second `<input id="gpaInput">` would be a duplicate ID, and `restoreGpaInput()` (`student-planner.js:29-32`) targets only `#gpaInput`.
**Correction:** give the sheet input its own id (e.g. `gpaInputSheet`) with its own `<label for>`, wire it to the same `onGpaChange(this.value)`, and extend `restoreGpaInput()` to set **both** inputs (call it on sheet open; `onGpaChange` already persists via the repository, so calling `restoreGpaInput()` after change keeps them in sync). Also note `#mobUnitPill` is currently a `<div>` styled only inside the ≤768 media query — when converted to `<button>`, reset button UA styles (`font: inherit; border: 0;` etc.) or restyle, and keep the base `.mob-unit-pill { display:none }` for desktop.

### B5 — Faculty strip: the `:hover` rule will override `--fc` (D-2.1 is incomplete)
Spec changes the `::before` idle background to `var(--fc, transparent)` and the `.selected` state to full `--fc`, but leaves `.course-card:hover::before { background: var(--b2); }` (`main.css:206`) in place — hovering any card would flip its faculty strip to neutral gray.
**Correction:** delete the hover override (or change it to `var(--fc, var(--b2))` at full opacity). Also make explicit that `.course-card.selected::before { background: var(--blue); }` (`main.css:211`) becomes `var(--fc, var(--blue))`, and that the "60% idle opacity" is done via `opacity: .6` on the pseudo-element (removed on `.selected`), not via a color-mix of the background.

### B6 — D-2.4's rationale is false for time clashes; add the missing warning
"Card remains clickable … the toast on add already warns" — only **exam** clashes produce a warning toast (`toggleCourse`, `student-planner.js:250-255`); adding a time-clashing course today shows a normal "اضافه شد" info toast.
**Correction (cheap, in scope of P1-2):** since the conflict is now computed per-card before render, pass it through and, when a `.has-conflict` course is added, show `Toast.warning('«نام درس» با برنامه فعلی تداخل کلاس دارد', 4000)` instead of the plain info toast. (Alternatively amend the spec text — but the one-line toast is strictly better and uses already-computed data.)

---

## 3. Non-Blocking Suggestions

- **N1 — data-editor `#outputModal` accessibility.** The audit's "modals are good" claim only holds for index.html. While P1-9 is touching `data-editor.html` anyway, add `role="dialog" aria-modal="true" aria-labelledby="outputTitle"` to the modal box, and reuse the `openDialog`/`closeDialog` + Escape pattern (copy the ~15 lines from `student-planner.js:38-50,76-80` or move them into `ui.js`). Cheap, high-value.
- **N2 — Persian digits on exam chips.** `CourseDomain.parseExam().date` returns Latin digits with slashes (e.g. `1405/03/21`); the D-2 mock shows Persian digits. Wrap chip text in `toPersianNum(...)`.
- **N3 — Select chevron rule ordering.** The shared input rule uses the `background:` *shorthand* (`main.css:150`), which resets `background-image`. The new `select { background-image: … }` rule must appear **after** that rule in source order (or the shorthand must become `background-color`). Also consider a slightly darker chevron stroke than `#94a3b8` for light mode (2.56:1 on white is below the 3:1 non-text guideline); `#64748b` works acceptably in both themes for an icon.
- **N4 — `sessionsOverlap` namespace + signature.** For D-2.4, state precisely: `CourseDomain.sessionsOverlap(sessionsA, sessionsB)` takes two **arrays**; the cheapest pre-add check is: build `selectedSessions = selected courses' parseSchedule(c.time_html) arrays` once per render, then per card `selectedSessions.some(s => CourseDomain.sessionsOverlap(cardSessions, s))`. No domain-file changes needed (consistent with Non-Goals).
- **N5 — professor.html blocks need two extra touches for D-3.2/P1-3 to actually land:** (1) the page `<style>` override `.class-block { min-height: 44px; font-size: 0.65rem; }` (`professor.html:67`) wins over `main.css` and must be updated to `var(--fs-2xs)`; (2) `professor-dashboard.js:120` sets an inline `font-size:.58rem;opacity:.7` on the section-id line — inline styles beat any stylesheet; remove it and style via class. The soft/hard distinction survives the `--fc` refactor (soft → `--fc: var(--yellow)`, hard keeps `.conflict`), worth stating explicitly.
- **N6 — Toast close button in light mode.** `--t3` (`#5b6b81`) on `--s4` (`#e2e8f0`, toast background) is 4.41:1 — just under AA. Use `--t2` for `.toast-close`.
- **N7 — D-3.1 empty state mechanics.** `updateTimetable()` wipes only `.slot` contents; specify that the empty state either replaces `#timetable`'s content entirely or overlays `.timetable-container`, and that `buildTimetableGrid()` is re-run (or the grid is re-shown) when the first course is added. Otherwise two implementations are possible with different bugs.
- **N8 — `.timetable-header` corner special-case.** Both pages also carry `timetable-header:first-child { background: transparent }` in `main.css:268` and an inline `style.cssText` in JS (`student-planner.js:337`, `professor-dashboard.js:74`). The D-0.3 `.timetable-corner` suggestion should replace *both* mechanisms, in both pages, to avoid a half-migration.
- **N9 — Trivial factual nits, no action needed:** the 100-cap note is 11.5px (not 10px); `.time-chip` needs no "move" (main.css is shared, V32); the "Borders (unchanged)" label actually contains small border tweaks (V31 — the tweaked values are fine and improve light-mode border visibility; apply the spec block as written).

---

## 4. Scope Recommendation

P1 (11 items) is **achievable in a single implementation pass** — the items are small, file-local, and correctly sequenced (tokens first). Recommendations:

- **Keep all P1 items.** None is mis-scoped; P1-2 (course card) and P1-5 (GPA sheet) are the only multi-file items and both are bounded once B1/B4 corrections are applied.
- **Optional demotion:** the *sticky `thead`* half of P1-10 (D-6.3) is purely cosmetic and can slip to P2 if the pass runs long; the status-glyph column half of P1-10 is an accessibility fix and should stay P1.
- **Promote N1 (output-modal dialog semantics) into P1-9**, since P1-9 already edits `data-editor.html` — it is ~5 attribute additions plus reusing existing functions.
- No P2→P1 promotions otherwise; P2 list is sensible (undo toasts, bottom-sheet modals, self-hosted font are correctly deferred).

---

## 5. Final Verdict

## **APPROVED WITH CHANGES**

The audit is unusually accurate: all five code defects (D1–D5) verified at the exact lines cited, all seven measured contrast claims reproduced within ±0.1, and every referenced function exists under the stated name. The design direction (token aliasing, `color-mix` tinted blocks, decision data on cards, touch-first removal) is coherent for a Persian RTL mobile-first app and stays inside the no-build constraint.

The Implementation Agent may proceed by following the spec **plus the six blocking corrections above**:

1. **B1** — use `c.time_html` (not `c.schedule`) for `parseSchedule`.
2. **B2** — keep an outline-based `:focus-visible` ring (`outline: 2px solid var(--accent); outline-offset: 2px;`); no `border-radius`, no `outline: none` + box-shadow global.
3. **B3** — raise dark `--t3` to `#8494a8` (or formally exempt `--t3` from text use); fix `.course-card-id` to meet AA.
4. **B4** — second GPA input gets its own id/label; extend `restoreGpaInput()` to sync both; `#mobUnitPill` div→button needs UA-style reset.
5. **B5** — update `.course-card:hover::before` and `.course-card.selected::before` so `--fc` survives hover/selection.
6. **B6** — warning toast when adding a time-clashing course (or drop the false claim).
