# QA Report — 04

**Stage:** QA (Design → Review → Implementation → **QA**)
**Verifies:** the uncommitted working-tree implementation against `01-design-spec.md` (P1-1…P1-11, checklist (e), non-goals (g)) as amended by B1–B6 in `02-design-review.md`, cross-checked against the claims in `03-implementation-notes.md`.
**Date:** 2026-07-03
**Method:** full `git diff` review of all 7 changed files; grep/static sweeps (token audit, duplicate ids, font-size floor, leftover selectors); WCAG relative-luminance contrast computed for every new color pair (script-verified); `npm run lint` and `npm test` executed. **No headless browser or DOM library (jsdom/puppeteer/playwright) is available in this environment** — no live rendering was performed; runtime claims were verified by tracing code paths and function signatures (`Theme.current`, `Toast.warning`, `DAY_NAMES`, `parseSchedule`/`parseExam` shapes, `sessionsOverlap(arrays)`, `openDialog`/Escape wiring, `.show-mobile`/`.anim-scale`/grid-template-rows existence).

---

## 1. Scope integrity — PASS

- Changed files: exactly the 7 listed in the implementation notes, all under `apps/web/` (+ untracked `docs/uiux-redesign/`). `git status` confirms **nothing under `apps/web/generated/`** was touched; `ui.js` and `scripts/domain/**` untouched as claimed.
- No P2 leakage: no toast undo, no bottom-sheet modal presentation (the unit sheet is a small centered modal — correct), no self-hosted font, no summary-card filters, no logical-properties migration of old rules, no CSP/IA changes. Non-goals (g) respected.

## 2. Verification matrix

### P1 items

| ID | Verdict | Evidence |
|----|---------|----------|
| P1-1 Tokens/type scale/reduced-motion/focus ring | **PASS** | `main.css:17-115` token blocks match spec (dark `--t3` = `#8494a8` per B3a); `prefers-reduced-motion` block `main.css:130-136`; `line-height:1.6` `main.css:142`; migrations swept (no hard-coded `#2563eb`/status-rgba/sub-0.72rem sizes remain — grep-verified); light gender-badge overrides `main.css:240-242` |
| P1-2 Course card | **PASS** | `student-planner.js:177-196` (`formatSessionChip`, `getSelectedSessionList`, `hasTimeClashWithSelection`), `:221-222` once-per-render session list, `:240-285` chips/exam chip (`toPersianNum`, N2)/conflict badges/CTA/aria-label with capacity+conflict; `main.css:250-286` strip via `--fc`, header/CTA/`.course-card-times`; capacity bar 4px + `aria-hidden` |
| P1-3 Class-block recolor + finite anim | **PASS** | `main.css:352-397` (`color-mix` + `var(--s3)` fallback first, `border-inline-start`, `--t1`/`--t2` text at `--fs-2xs`, `.conflict::after '⚠'`, `.just-added … ease 2`); `student-planner.js:449-473` (`lastAddedId`, reset after render); `professor-dashboard.js:107` `setProperty('--fc',…)`, inline `.58rem` style removed; `professor.html:67` override → `var(--fs-2xs)` (N5) |
| P1-4 Touch remove button | **PASS** | `main.css:381-397`: 28×28, `::after{inset:-8px}` → 44px hit, `font-size:14px`, `rgba(0,0,0,0.45)`, `@media (pointer: coarse){ display:flex }`; `aria-label="حذف …"` kept in JS |
| P1-5 Mobile GPA sheet | **PASS** (see DEF-2, DEF-3) | `index.html:283-287` pill → `<button aria-haspopup="dialog">` + `::after` hit area + base `display:none` kept (`index.html:114`); `#unitSheet` `index.html:421-441` (`role="dialog"`, `aria-modal`, labelled, `#gpaInputSheet` + `<label for>`); `student-planner.js:30-38` dual sync skipping focused input, `:829-835` open/close via `openDialog` (Escape handler at `:83-87` covers it); `updateUnitDisplay` drives both + `⚠` prefix |
| P1-6 Timetable empty state | **PASS** | `student-planner.js:422-436`: empty state replaces `#timetable` content, `.timetable-empty` spans the **explicit** grid (`grid-template-rows` exists, `index.html:106`), CTA `.show-mobile` (hidden ≥769px, `main.css:885`) calls `setMobView('search')`; lazy `buildTimetableGrid()` rebuild (N7) |
| P1-7 Select chevron + min-heights | **PASS** (see DEF-6) | `main.css:193-201`: `select{background-image:…}` placed **after** the shared `background:` shorthand rule (N3), stroke `#64748b` = 3.43:1 dark / 4.76:1 light (≥3:1 non-text), `left 12px center` + `padding-left:32px` correct for RTL; 40px min-height, 44px in ≤768 block (`main.css:841`) |
| P1-8 Curriculum glyphs + legend | **PASS** | `student-planner.js:601-602` glyph map `✓ ✗ ↻ + 🔒`, `:630-633` `aria-label` from `statusTooltip`, `:604` `.cur-legend` line; `main.css:415-419, 434-452` glyph styling + semantic status tokens |
| P1-9 data-editor tabs + labels | **PASS** (see DEF-7) | `data-editor.html:69-75` real `<button role="tab">` in `role="tablist"`, `aria-controls`, 44px, panels `role="tabpanel"`; `data-editor.js:8-14` `aria-selected` sync; `for`/`id` on all *static* controls of all three pages (incl. `cohortSelect`, professor selects, `aria-label` on search/filters); N1 promoted: `#outputModal` dialog semantics + focus move/restore + Escape (`data-editor.js:269-305`) |
| P1-10 Exam glyph column + sticky thead + toast position | **PASS** | `student-planner.js:735-748` status `<td>` with `role="img"` + Persian labels, `colspan=4`, dates/times Persian; `index.html:413` sr-only status header; `main.css:530` sticky thead; `main.css:844` toasts raised above mob-nav; toast status edge/colors/`--fs-sm`/32px close (`main.css:553-577`) |
| P1-11 Bug fixes / labels / h1s | **PASS** | `--t0` defined both themes; invalid `safe-area-inset-bottom:` line deleted (`index.html` diff @215); ternary → `timetable-corner` class in **both** pages incl. removal of both inline `cssText` hacks and the `:first-child` rule (N8); icon buttons labelled, emoji `aria-hidden`; exactly one `<h1>` per page (grep: 1/1/1); `syncThemeButton()` at init + toggle |

### Blocking corrections

| # | Verdict | Evidence |
|---|---------|----------|
| B1 `time_html` not `c.schedule` | **PASS** | `student-planner.js:184,190,244` all use `CourseDomain.parseSchedule(c.time_html)`; grep finds no `c.schedule` |
| B2 outline-based focus ring | **PASS** | `main.css:128` `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` — no `outline:none`, no border-radius; `--focus-ring` kept as unused opt-in token |
| B3 dark `--t3` `#8494a8` | **PASS** | `main.css:21`; measured **5.83:1 on `--s1`, 5.28:1 on `--s2`, 4.65:1 on `--s3`** — `.course-card-id` passes AA |
| B4 GPA sheet ids/sync/button reset | **PASS** | `#gpaInputSheet` own id + `<label for>`; `restoreGpaInput()` syncs both, skips the focused field; pill is a real `<button>` with `font-family:inherit`/cursor/tap-highlight resets; desktop `display:none` retained |
| B5 `--fc` survives hover/selection | **PASS** | `main.css:258` `:hover::before { opacity: 1; }` (no background); `:262` `.selected::before { background: var(--fc, var(--blue)); }` |
| B6 time-clash warning toast | **PASS** | `student-planner.js:313-316`: exam clash → `Toast.error`, else time clash → `Toast.warning('«…» با برنامه فعلی تداخل کلاس دارد', 4000)`, else info. `Toast.warning` exists (`ui.js:96`) |

## 3. Defects

> **Re-verification 2026-07-03 (second pass):** all eight defects were fixed by the Implementation Agent (notes §6) and each fix was independently re-verified in the working tree — statuses added below; details in §7.

### Must fix (blocking the checklist's acceptance criteria)

**DEF-1 — ✅ FIXED — MAJOR (contrast): dark-theme `--accent` (`#3b82f6`) fails AA wherever it is used as text.**
Measured: active tab text on `--s3` **3.91:1** (`main.css:308` `.tab-btn.active`), `.cur-card.available` name on blue-dim **3.69:1** (`main.css:443`), mobile unit pill **4.14:1** (`index.html:198`), CTA pill idle text on `--s2` **4.44:1** (`main.css:255`), `.badge-primary` **~4.4:1**. Checklist (e) demands ≥4.5:1 and names "active tab" explicitly. Root cause is the spec's own token (`--accent: var(--blue)` in dark) — the implementation followed it faithfully, but the acceptance criteria fail.
**Fix:** in the dark `:root`, set `--accent: #60a5fa` (measured: 7.11:1 on `--s1`, 6.42:1 on `--s2`, 5.66:1 on `--s3`, 5.34:1 on blue-dim). Keep `--blue` for solid fills, keep `--accent-strong` as-is (nothing renders white text on `--accent` itself), keep light `--accent: #2563eb`. One-line change; also improves the focus ring.

**DEF-2 — ✅ FIXED (one residual browser-check, see §7 VERIFY-1) — MAJOR (a11y): closed dialogs are invisible but still in the tab order and accessibility tree.**
`.modal-backdrop` hides with `opacity:0; pointer-events:none` only (`main.css:497-504`). The pattern is pre-existing, but the new `#unitSheet` makes it acute: its `role="status"` unit display (`#unitDisplaySheet`) is updated by every `updateUnitDisplay()` call while invisible → screen readers get **duplicate announcements** (desktop `#unitDisplay` + hidden sheet copy), and `#gpaInputSheet` + the sheet's close button are Tab-reachable while invisible on desktop.
**Fix:** add `visibility: hidden;` to `.modal-backdrop` and `visibility: visible;` to `.modal-backdrop.open` (main.css). This fixes every modal at once (exam, load, path, unit sheet, output).

**DEF-3 — ✅ FIXED — MINOR (touch target): the sheet GPA input inherits `min-height: 0`.**
`index.html:41-49` `.gpa-box input { … min-height: 0; }` was scoped for the topbar pill, but the sheet reuses `.gpa-box` (`index.html:433`), so `#gpaInputSheet` — the primary mobile GPA control — renders ~30px tall (the notes' claim "the sheet copy is unaffected" is incorrect; the page `<style>` rule outranks the global `input[type=number] { min-height }` by source order).
**Fix:** change the selector to `.topbar-center .gpa-box input` (the global 44px mobile min-height then applies inside the sheet).

**DEF-4 — ✅ FIXED — MINOR (contrast, light theme): `--warn-text` `#b45309` marginally fails on tinted surfaces.**
Measured: topbar «امتحانات» button (warn-text on warn-bg over light `--s1`) **4.37:1** (`index.html:293`); warning-toast icon on `--s4` **4.07:1** (`main.css:573`).
**Fix:** light block `--warn-text: #92400e` (measured 6.17:1 / 5.75:1; on warn-bg over white 6.41:1). All other warn pairs improve.

**DEF-5 — ✅ FIXED — MINOR (contrast, light theme): accent text on `--blue-dim` = 4.42:1.**
`--accent` `#2563eb` over `rgba(59,130,246,.14)` on white just misses AA — affects `.badge-primary` (`main.css:238`) and `.cur-card.available .cur-card-name` (`main.css:443`).
**Fix (either):** `[data-theme="light"] .badge-primary, [data-theme="light"] .cur-card.available .cur-card-name, [data-theme="light"] .cur-card.available .cur-status-glyph { color: var(--accent-strong); }` (measured 5.73:1), **or** lighten light `--blue-dim` to `rgba(37,99,235,0.08)`.

### Should fix (non-blocking)

**DEF-6 — ✅ FIXED — MINOR (RTL/visual):** `data-editor.html:47` `table.cur-table td select { padding-left: 22px; }` — the chevron occupies 12–24px from the left edge, so option text can overlap it by ~2px. Fix: `padding-left: 26px`.

**DEF-7 — ✅ FIXED — MINOR (a11y, pre-existing surface):** dynamically generated data-editor controls have no label/`aria-label`: `.ac-inp` (`data-editor.js:59`), the `reason-…` inputs (`:43`), and all `cfAddRow` row inputs (`:204-216`) rely on placeholders/column headers. Checklist (e) says *every* form control on all three pages. Fix: add `aria-label` attributes in `buildAC`/`rfAddRow`/`cfAddRow` (e.g. `aria-label="جستجوی درس"`, `aria-label="دلیل"`, per-column names).

**DEF-8 — ✅ FIXED — MINOR (touch target):** `.modal-close` is 36×36 with no hit-area extension (`main.css:521`) — spec D-6.1 itself specified 36px (internal spec/checklist conflict), but the established `::after{inset:-4px}` pattern would close the gap to 44px for free. Same technique could serve `.toast-close` (32px, also spec-specified).

### Observations — accepted, no action required

- White small-bold text on solid `--red`/`--blue` fills (`.conflict-severity.hard` 3.76:1, day headers, `.btn-primary`) — explicitly permitted by the spec's migration rules; the soft pill was correctly flipped to dark-on-yellow (**8.49:1**).
- professor/data-editor theme buttons keep a static `aria-label="تغییر تم"` (only index got the dynamic `syncThemeButton`) — spec D-4 targeted the index topbar; acceptable.
- `role="tab"` buttons (both pages) have no arrow-key roving-tabindex — matches the pre-existing index sidebar-tabs pattern; not a regression.
- Deviations 1–10 in `03-implementation-notes.md` §3 were each checked against the diff and are real and justified (except the DEF-3 claim about the sheet input, corrected above).

## 4. Accessibility checklist (spec §e)

| Item | Result |
|------|--------|
| All text ≥ 4.5:1 both themes | ~~FAIL~~ → **PASS after fixes** (DEF-1/4/5 re-measured 5.34–7.11:1, see §7). Originally: DEF-1, DEF-4, DEF-5. Everything else passes (computed): dark `--t3` 5.28–5.83, light `--t3` 4.81–5.43, `--t2` 8.3–8.6, status texts on their dim bgs 4.54–8.79, class-block `--t1` worst 9.02 (dark) / 13.3 (light), `--t2` in blocks worst 4.69 / 6.22, conflict block 11.4/12.6 + glyph 4.51, chips 4.60–7.38, toasts 11.7/14.5, light gender badges 5.05–5.93 |
| No text below 11.5px | **PASS** — sweep found no font-size < 0.72rem in `apps/web` (excl. generated) |
| Interactive ≥ 44px hit on touch | ~~PARTIAL~~ → **PASS after fixes** — remove-btn 44 (::after), pill ~46, page-tabs 44, inputs/selects 44 mobile, ai-send 44 mobile, ai-explain 46 coarse; former misses now fixed: sheet GPA input 44 mobile (DEF-3), modal-close 36+`::after` → 44 and toast-close 32+`::after` → 44 (DEF-8) |
| Touch course removal from grid | **PASS** — `@media (pointer: coarse)` always-visible 28px/44px button |
| `prefers-reduced-motion` global | **PASS** — `main.css:130-136` |
| Icon-only `aria-label` + decorative emoji `aria-hidden` | **PASS** — verified all three pages (theme, print, AI send/clear/close, exam btn, brand icons, nav) |
| data-editor tabs keyboard + focus | **PASS** — real buttons + global outline ring |
| Status by glyph/text, not color alone | **PASS** — exam ⛔/⚠ column with `aria-label`s; curriculum ✓✗↻+🔒 + labelled cards; conflict chips are text |
| `:focus-visible` visible both themes | **PASS** — accent outline ≥3:1 non-text on all surfaces in both themes (improves further with DEF-1) |
| Modal focus in/restore/Escape | **PASS** — unit sheet + output modal wired to the same pattern; no regression to existing dialogs |
| `aria-live` regions preserved | **PASS** (+ new `role="status"` unit displays; duplication issue → DEF-2, resolved by the `visibility` fix) |
| Every control labelled | ~~PARTIAL~~ → **PASS after fixes** — all static controls done; dynamic data-editor rows now carry `aria-label`s (DEF-7) |
| Exactly one `h1` per page | **PASS** — 1/1/1 (grep) |

## 5. Test / lint / tooling results

- `npm run lint` (eslint 9): **clean** (exit 0, no output).
- `npm test` (`node --test tests/frontend/*.test.js`): **7/7 pass**.
- Token audit (script): every `var(--…)` in `apps/web` (excl. generated) resolves; `--fc` set at runtime. **No undefined variables.**
- Duplicate-id scan on all three pages: **none** (incl. the new `*Sheet` ids).
- Leftover-selector sweep: no `cur-status-dot`, no `timetable-header:first-child`, no `safe-area-inset-bottom:` declaration, no inline gradient assignments, no sub-floor font sizes.
- **No browser tooling available** (no jsdom/puppeteer/playwright in `node_modules`, no system browser): visual rendering, RTL chevron placement, and the empty-state ↔ grid transition were verified statically only. The implementation notes' own §5.1 request for an eyeball pass in both themes at mobile width **still stands** for whoever has a browser.

## 6. Verdict (first pass)

**FIX-THEN-SHIP** — must fix DEF-1…DEF-5; recommended DEF-6…DEF-8. *(Superseded by §7/§8 after the fix pass.)*

Everything else — P1-1…P1-11 and B1–B6 — is genuinely implemented as specified, with accurate implementation notes (one incorrect claim: the sheet GPA input *is* affected by `min-height:0`, see DEF-3), clean scope, passing lint/tests, and no regressions found in the diff.

---

## 7. Re-verification of the QA fixes (second pass)

Each fix from `03-implementation-notes.md` §6 was independently checked in the working tree; contrast recomputed with the same WCAG script; lint/tests/token audit re-run.

| DEF | Status | Independent evidence |
|-----|--------|----------------------|
| DEF-1 | **FIXED** | `main.css:32` dark `--accent: #60a5fa` (light `#2563eb` untouched, `main.css:104`). Recomputed: active tab on `--s3` **5.66**, CTA/card text on `--s2` **6.42**, pill/meter on `--s1` **7.11**, blue-dim pairs **5.34–5.99**, focus outline vs `--s0` **7.6** — all ≥4.5 (text) / ≥3 (non-text). Grep confirms `--accent` is never a `background` fill, so no white-on-accent side effect; `--accent-strong`/`--blue` fills untouched |
| DEF-2 | **FIXED** | `main.css:501-509`: base `opacity:0; visibility:hidden; transition: opacity var(--mid), visibility var(--mid); pointer-events:none`; `.open` → `opacity:1; visibility:visible`. Closed dialogs (all five) leave the tab order and a11y tree at steady state → no invisible focusable controls, no duplicate `role="status"` announcements. Fade-out preserved: per CSS-transitions visibility interpolation, the element stays `visible` for the whole transition interior and flips to `hidden` at the end. See VERIFY-1 below for the one aspect static analysis cannot settle |
| DEF-3 | **FIXED** | `index.html:41-48`: `min-height:0` removed from `.gpa-box input`, re-added as `.topbar-center .gpa-box input { min-height: 0; }` — `#gpaInputSheet` now inherits the global `input[type=number]` min-height (40px desktop / 44px ≤768px) |
| DEF-4 | **FIXED** | `main.css:108` light `--warn-text: #92400e`. Recomputed: exam topbar button **6.17**, warning-toast icon on `--s4` **5.75**, warn badges / `.cur-card.taking` **6.41** |
| DEF-5 | **FIXED** | `main.css:448-450`: light-theme overrides re-point `.badge-primary` + `.cur-card.available` name/glyph to `var(--accent-strong)`. Recomputed **5.73:1** on blue-dim over white |
| DEF-6 | **FIXED** | `data-editor.html:48` `table.cur-table td select { padding-left: 26px; }` — clears the 12–24px chevron zone |
| DEF-7 | **FIXED** | `data-editor.js`: `aria-label` on the autocomplete input, reason input, all eight `cfAddRow` cells, and both row-delete buttons; the autocomplete clear `×` additionally got `role="button" tabindex="0"` + Enter/Space handling — grep confirms no unlabeled dynamic control remains |
| DEF-8 | **FIXED** | `main.css:531-534` `.modal-close` `position:relative` + `::after{inset:-4px}` (36→44px); `main.css:577-580` `.toast-close` `::after{inset:-6px}` (32→44px) — same pattern as `.remove-btn` |

**Regression sweep after fixes:** `npm run lint` clean; `npm test` 7/7; token audit — no undefined `var(--…)`; no new hard-coded colors; diff still confined to the same 7 files + docs; `generated/` untouched.

**VERIFY-1 (open, LOW, browser-only):** with `visibility` in the transition list, the synchronous `focus()` inside `openDialog()`/`openOutput()` runs at transition progress 0, where a strict reading of the CSS-transitions spec says computed `visibility` is still `hidden` — in that reading the initial focus-move into the dialog could silently fail in some engines (steady-state behavior and Escape/backdrop close are unaffected either way; users can still Tab into the visible dialog). This cannot be confirmed without a browser (none available in this environment). Zero-risk hardening if the first browser smoke test shows focus not landing: transition `visibility` only on close — base: `transition: opacity var(--mid), visibility 0s var(--mid);`, `.open`: `transition: opacity var(--mid), visibility 0s;` — visibility then flips instantly on open (focus-safe) and after the fade on close.

## 8. Final verdict

## **SHIP**

All eight defects are genuinely fixed and re-verified; the accessibility checklist now passes in full under static analysis. Two items remain for the first human/browser smoke test (neither blocks merge): VERIFY-1 above, and the §5 note that no browser rendering pass has ever been run on this diff (both themes, mobile width, RTL chevron, empty-state transition).
