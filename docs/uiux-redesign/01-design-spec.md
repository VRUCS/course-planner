# UI/UX Redesign Specification — سامانه انتخاب واحد هوشمند

**Version:** 1.0
**Stage:** Design (no code changes in this stage)
**Scope of files affected by implementation:** `apps/web/index.html`, `apps/web/professor.html`, `apps/web/data-editor.html`, `apps/web/styles/main.css`, and the DOM-rendering parts of `apps/web/scripts/features/ui.js`, `apps/web/scripts/pages/student-planner.js`, `apps/web/scripts/pages/professor-dashboard.js`, `apps/web/scripts/pages/data-editor.js`.
**Must NOT be touched:** `apps/web/generated/**`, anything outside `apps/web/` and `docs/`.

This is an **evolutionary refresh**: same information architecture, same vanilla HTML/CSS/JS stack, no build step, no frameworks. The existing token names (`--s0…--s4`, `--b0…--b2`, `--t1…--t3`, `--r1…--r4`, `--sp1…--sp8`) are **kept** so the diff stays small; we add missing tokens, fix broken ones, and layer semantic aliases on top.

---

## (a) Current-State Audit

### Stack & design language (verified)

- Three static pages sharing `styles/main.css` (770 lines) plus per-page `<style>` blocks in each HTML head.
- Font: **Vazirmatn via jsdelivr CDN** (`Vazirmatn-font-face.css`), allowed by the CSP (`style-src`/`font-src` include `https://cdn.jsdelivr.net`). So the app *does* currently use an external CDN font — keeping it is acceptable; self-hosting is a P2 option, not a requirement.
- Dark-first theme (`data-theme="dark"` default, light override block), toggled via `Theme.toggle()` and persisted in `localStorage`.
- RTL is set at document level (`dir="rtl" lang="fa"`); CSS uses **physical** properties (`right/left`, `padding-right`) tuned for RTL rather than logical properties. Works, but fragile.
- Icons are **emoji** everywhere (buttons, nav, empty states). No icon font / SVG set.
- Persian digits handled correctly via `toPersianNum()`.
- Components already present: buttons, inputs/selects, cards, badges, course cards with capacity bar, tabs, timetable grid, curriculum cards, summary cards, conflict cards, modals, toasts, empty states, skeleton, AI chat panel, mobile bottom nav.

### Concrete defects found (code-level, all verified)

| # | Defect | Location |
|---|--------|----------|
| D1 | `var(--t0)` is used but **never defined** — the GPA input's `color` declaration is invalid and silently falls back to inherited color. | `index.html` line 43 (`.gpa-box input`) |
| D2 | JS sets `--fc` (faculty color) on each course card (`el.style.setProperty('--fc', color)`) but **no CSS rule consumes `--fc`** — the faculty color accent on search cards is dead code. Cards show no faculty color at all. | `student-planner.js` line 211; `main.css` `.course-card::before` |
| D3 | `safe-area-inset-bottom: env(safe-area-inset-bottom);` is an **invalid CSS property declaration** (harmless but wrong; the real padding is set on the next line). | `index.html` line 206 (`.mob-nav`) |
| D4 | `select { appearance: none }` removes the native dropdown arrow and **no replacement chevron is drawn** — selects are visually indistinguishable from text inputs. | `main.css` `.input, select…` block |
| D5 | `buildTimetableGrid()` has a pointless ternary: `el.className = d === 'ساعت' ? 'timetable-header' : 'timetable-header'`. | `student-planner.js` line 335 |

### Contrast failures (computed, WCAG relative luminance)

| Pair | Ratio | Verdict |
|------|-------|---------|
| `--t3` `#475569` on `--s1` `#0d1628` (dark) | **2.4 : 1** | FAIL — used for course IDs, time labels, empty states, sem titles, many microcopy items |
| `--t3` `#94a3b8` on white (light) | **2.6 : 1** | FAIL — same widespread usage |
| `--blue` `#3b82f6` as text on white (light) | **3.7 : 1** | FAIL for normal text — active tab label, badges, unit meter, links |
| White text on light faculty palette colors (`#22d3ee`, `#4ade80`, `#2dd4bf`, `#34d399`…) in `.class-block` | as low as **1.8 : 1** | FAIL — schedule blocks can be unreadable |
| `--yellow` `#f59e0b` as text on white/light-dim bg (light theme) | ~2.2 : 1 | FAIL — warning badges/toasts in light mode |

`--t2` passes in both themes (7.0:1 dark, 7.6:1 light). Surfaces/borders are fine.

### Typography issues

- Root-relative sizes go as low as `0.58rem` (**9.3 px**) and `0.6–0.68rem` (9.6–10.9 px): `.class-block-loc`, `.class-block-prof`, badges, `.mob-nav-badge`, `.cur-card-units`, `.conflict-severity`, `.ai-quick-btn`. Too small for comfortable Persian reading, where letterforms are denser than Latin.
- No named type scale — 20+ ad-hoc `font-size` values scattered across files.
- `line-height: 1.5` global is slightly tight for Persian body text (1.6–1.7 is more comfortable).

### Touch-target failures (< 44 px)

- `.remove-btn` on timetable blocks: **18 × 18 px**, and it is `display:none` until `:hover`/`:focus-within` — **on touch devices there is effectively no way to remove a course from the schedule view** (blocks are unfocusable `div`s). Users must go back to search and find the card again. Worst mobile friction in the app.
- `.modal-close`: 30 × 30 px.
- `.tab-btn`: ~32 px tall.
- `.ai-send-btn`: 34 px. `.ai-header-btn`: ~24 px.
- Selects/inputs: ~38 px (borderline).
- `.page-tab` in data-editor: `div` with `onclick` — no keyboard access at all, no focus style, no ARIA.

### UX friction per flow

**Search & add (index.html):**
1. Course cards do **not show meeting days/times or exam date** — the single most decision-relevant data. Students must add a course and look at the grid to learn when it meets, then remove it. (Data exists: `CourseDomain.parseSchedule(c.schedule)` and `c.exam_text` are already parsed elsewhere.)
2. No **conflict preview**: a course that clashes with the current selection looks identical to any other card; the clash is only discovered after adding (red pulsing block). `PlannerDomain`/`sessionsOverlap` already exists, so a pre-add check is cheap.
3. The whole card is a toggle button with no explicit affordance — no "add/added" control, only a subtle border change when selected.
4. Toast on add ("… اضافه شد") but **no undo** anywhere.
5. Results are capped at 100 with a text note — fine, but the note is 10 px text.

**Weekly schedule:**
6. Empty grid on first load with **no empty state / call to action** — new users see a wall of dashed boxes.
7. Conflict blocks pulse **forever** (`animation: pulse-conflict 2s infinite`) — distracting, and there is no `prefers-reduced-motion` handling anywhere in the app.
8. Faculty colors are the only encoding of course identity; with the current palette + white text they can be illegible (see contrast table).

**Units/GPA:**
9. The GPA input lives in `.topbar-center`, which is `display:none` on mobile — **mobile users cannot set their GPA**, so the unit cap silently stays at the default. The mobile unit pill is display-only.

**Exams:**
10. Exam schedule is modal-only, desktop-topbar-entry hidden on mobile except via the `mob-exam-btn`… which IS kept visible (`:not(.mob-exam-btn)`) — OK, but the danger/warning row semantics (red/yellow row tint) have no text label for screen readers or colorblind users beyond `title`.

**Curriculum map:**
11. Status is encoded by color + an 8 px dot; passed/failed/available/taking distinguishable **only by hue** (no icon/text), problematic for colorblind users.
12. Card click cycles passed → failed → none with no visible hint of the 3-state cycle (tooltip only).

**professor.html:**
13. Reasonable layout; summary cards are static (not filters); no `<h1>`; `.ai-explain-btn` is ~20 px tall.

**data-editor.html:**
14. `.page-tab` divs (keyboard-inaccessible, see above); table inputs are 0.8 rem in dense rows — acceptable for an internal tool, low priority.

### Accessibility inventory (beyond the above)

- Good: `:focus-visible` global outline; modals have `role="dialog"`, `aria-modal`, Escape-to-close, focus restore (`openDialog`/`closeDialog`); toasts use `role="status"`/`role="alert"`; tabs have proper `role`/`aria-selected`/`aria-controls`; course cards are real `<button>`s with `aria-pressed` and `aria-label`; `aria-live` on result counts.
- Missing: `aria-hidden="true"` on decorative emoji; `aria-label` on icon-only buttons (theme 🌗, print 🖨️ rely on `title` only); no `prefers-reduced-motion`; timetable grid is a div soup with no text alternative; theme button state not conveyed; no skip link (minor for an app this small); light-theme shadow tokens (`--sh3`) not overridden (harsh 0.6-alpha black shadows in light mode).

---

## (b) Design Decisions & Rationale

1. **Token repair, not token revolution.** Keep the existing scale names; define the missing `--t0`, fix light-theme accent/status colors with *semantic aliases* (`--accent`, `--accent-strong`, status text/bg/border triads) so components stop hard-coding `#2563eb`, `rgba(59,130,246,.3)`, etc. Rationale: dozens of call sites already use `--blue`, `--red-dim`… — aliasing lets light theme darken text-colors without touching every component.
2. **Readability floor.** No text below `0.72rem` (11.5 px); primary microcopy moves to `0.78rem`. Persian needs the extra size. Introduce a named type scale and migrate the ad-hoc sizes to it.
3. **Theme-aware course blocks.** Replace "white text on raw faculty color" with "tinted surface + colored edge + theme text color" (`color-mix(in srgb, var(--fc) N%, var(--s2))`). This is the only robust way to keep 12 faculty hues readable in both themes without hand-tuning 24 pairs. `color-mix` is supported in all evergreen browsers since 2023 — acceptable for a static GitHub Pages app; a solid-color fallback line is specified.
4. **Decision data on the card.** Meeting times and exam date appear on every course card as chips; conflict with the current selection is computed pre-add and shown as a red "تداخل" chip. This turns add/remove roulette into informed choice and is the highest-value UX change in the spec.
5. **Touch-first removal.** Remove buttons become 28 px visual / ≥44 px hit-area and are always visible on coarse pointers (`@media (pointer: coarse)`), hover-revealed on fine pointers.
6. **Mobile GPA entry.** The mobile unit pill becomes a button opening a small bottom sheet (reuses modal component) with the GPA input and unit progress.
7. **Motion discipline.** One-shot attention animation for new conflicts, steady-state static styling, global `prefers-reduced-motion` override.
8. **Keep emoji icons.** Replacing with an SVG set is a rewrite-scale change; instead, standardize emoji usage (wrap in `aria-hidden` span, always pair icon-only buttons with `aria-label`).
9. **Keep the CDN font** (already in use and in CSP). P2: self-host the 3 used weights as woff2 for offline/perf.
10. **Keep physical-property RTL.** Migrating to logical properties app-wide is churn without user-visible benefit; only new CSS should prefer logical properties.

---

## (c) Design Tokens

Replace the `:root` and `[data-theme="light"]` blocks in `apps/web/styles/main.css` with the following. **Names marked (new) are additions; everything else keeps its current name so existing rules keep working.**

```css
:root {
  /* ── Surfaces (unchanged) ── */
  --s0: #070e1a;  --s1: #0d1628;  --s2: #132035;  --s3: #192a45;  --s4: #1f3254;

  /* ── Borders (unchanged) ── */
  --b0: rgba(255,255,255,0.05);
  --b1: rgba(255,255,255,0.09);
  --b2: rgba(255,255,255,0.16);

  /* ── Text ── */
  --t0: #ffffff;             /* (new) highest emphasis — fixes undefined var() bug */
  --t1: #f1f5f9;             /* primary */
  --t2: #a5b4c8;             /* secondary — nudged up from #94a3b8 (now 8.2:1 on --s1) */
  --t3: #64748b;             /* tertiary/microcopy — raised from #475569: 3.9:1 on --s1,
                                4.6:1 on --s2; use ONLY for text ≥ 0.78rem or non-text */

  /* ── Brand / accent ── */
  --blue:   #3b82f6;  --blue-dim: rgba(59,130,246,0.14);  --blue-glow: rgba(59,130,246,0.3);
  --violet: #8b5cf6;  --violet-dim: rgba(139,92,246,0.14);
  --cyan:   #06b6d4;
  --accent:        var(--blue);      /* (new) text/icon accent — theme-safe */
  --accent-strong: #2563eb;          /* (new) hover/active fills */
  --accent-border: rgba(59,130,246,0.35); /* (new) */

  /* ── Status triads (new semantic layer; keep old --green etc. as raw values) ── */
  --green:  #10b981;  --green-dim:  rgba(16,185,129,0.13);
  --yellow: #f59e0b;  --yellow-dim: rgba(245,158,11,0.13);
  --red:    #ef4444;  --red-dim:    rgba(239,68,68,0.13);
  --orange: #f97316;
  --ok-text:   #34d399;  --ok-bg:   var(--green-dim);   --ok-border:   rgba(16,185,129,0.35);
  --warn-text: #fbbf24;  --warn-bg: var(--yellow-dim);  --warn-border: rgba(245,158,11,0.35);
  --err-text:  #f87171;  --err-bg:  var(--red-dim);     --err-border:  rgba(239,68,68,0.4);

  /* ── Timetable (unchanged) ── */
  --slot-bg: rgba(255,255,255,0.025);
  --slot-hover: rgba(255,255,255,0.05);

  /* ── Radius (unchanged) ── */
  --r1: 6px; --r2: 10px; --r3: 14px; --r4: 20px;

  /* ── Shadows (unchanged dark) ── */
  --sh1: 0 1px 4px rgba(0,0,0,0.4);
  --sh2: 0 4px 20px rgba(0,0,0,0.5);
  --sh3: 0 8px 40px rgba(0,0,0,0.6);

  /* ── Focus ring (new) ── */
  --focus-ring: 0 0 0 2px var(--s0), 0 0 0 4px var(--accent);

  /* ── Motion (unchanged) ── */
  --fast: 120ms ease; --mid: 200ms ease; --slow: 350ms cubic-bezier(.4,0,.2,1);

  /* ── Spacing (unchanged) ── */
  --sp1: 4px; --sp2: 8px; --sp3: 12px; --sp4: 16px; --sp5: 20px; --sp6: 24px; --sp8: 32px;

  /* ── Type scale (new) — root-relative; floor is --fs-2xs ── */
  --fs-2xs: 0.72rem;   /* 11.5px — chips, badges, table micro */
  --fs-xs:  0.78rem;   /* 12.5px — meta, labels, microcopy    */
  --fs-sm:  0.85rem;   /* 13.6px — secondary body, buttons    */
  --fs-md:  0.95rem;   /* 15.2px — primary body, card titles  */
  --fs-lg:  1.1rem;    /* section titles                      */
  --fs-xl:  1.35rem;   /* page titles / stat values           */
  --fs-2xl: 1.7rem;    /* summary numbers                     */

  /* ── Touch (new) ── */
  --tap: 44px;

  --sc: #1f3254;
}

[data-theme="light"] {
  --s0: #eef2f7; --s1: #f8faff; --s2: #ffffff; --s3: #eef2f7; --s4: #e2e8f0;
  --b0: rgba(15,23,42,0.06); --b1: rgba(15,23,42,0.10); --b2: rgba(15,23,42,0.16);
  --t0: #020617;
  --t1: #0f172a;
  --t2: #3f4f66;             /* darkened from #475569 for 8+:1 */
  --t3: #5b6b81;             /* raised from #94a3b8: 5.0:1 on white */
  --accent:        #2563eb;  /* 5.2:1 on white — replaces #3b82f6 as light text accent */
  --accent-strong: #1d4ed8;
  --accent-border: rgba(37,99,235,0.35);
  --ok-text:   #047857;  --ok-border:   rgba(4,120,87,0.35);
  --warn-text: #b45309;  --warn-border: rgba(180,83,9,0.35);
  --err-text:  #b91c1c;  --err-border:  rgba(185,28,28,0.35);
  --slot-bg: rgba(0,0,0,0.015); --slot-hover: rgba(0,0,0,0.04);
  --sh1: 0 1px 4px rgba(15,23,42,0.08);
  --sh2: 0 4px 20px rgba(15,23,42,0.10);
  --sh3: 0 8px 40px rgba(15,23,42,0.16);   /* (new override — was inheriting 0.6 black) */
  --focus-ring: 0 0 0 2px #fff, 0 0 0 4px var(--accent);
  --sc: #cbd5e1;
}
```

**Migration rules for the Implementation Agent:**

- Anywhere a component uses `color: var(--blue)` / `var(--green|--yellow|--red)` **as text color**, switch to `var(--accent)` / `--ok-text` / `--warn-text` / `--err-text`. Fills/solid backgrounds keep the raw tokens (white-on-`--blue` solid buttons pass at 3.7:1+ for their large/bold text and remain unchanged; keep `#fff` text only on `--blue`, `--red`, `--green` **solid** fills).
- Hard-coded rgba borders like `rgba(59,130,246,0.25)`, `rgba(245,158,11,.3)`, `rgba(239,68,68,0.3)` → `var(--accent-border)`, `var(--warn-border)`, `var(--err-border)`.
- Hard-coded `#2563eb` hovers → `var(--accent-strong)`.
- Font sizes: map `0.58/0.6/0.62/0.65/0.66/0.68/0.7rem → var(--fs-2xs)`; `0.72/0.74/0.75/0.76/0.78rem → var(--fs-xs)`; `0.8/0.82/0.85/0.875rem → var(--fs-sm)`; `0.9/0.92/0.95rem → var(--fs-md)`. Exception: `.mob-nav-badge` count may stay 0.68rem (non-essential duplicate of the count elsewhere), but prefer `--fs-2xs`.
- `body { line-height: 1.6; }` (was 1.5).
- Global additions:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--r1); }
```

(Replace the current `outline: 2px solid var(--blue)` rule; box-shadow ring hugs rounded corners and works on both themes.)

---

## (d) Per-Page / Per-Component Changes

### D-0. Bug fixes (do first, zero-risk)

1. `index.html` `.gpa-box input`: `color: var(--t0)` now resolves (token added). No markup change.
2. `index.html` line 206: delete the invalid `safe-area-inset-bottom: env(safe-area-inset-bottom);` line.
3. `student-planner.js` `buildTimetableGrid()`: collapse the no-op ternary to `el.className = 'timetable-header'` (keep the `ساعت` special-casing via the existing inline style, or better, add a `.timetable-corner` class).
4. Wire up `--fc` (see D-2 and D-4).

### D-1. Selects (all pages)

**Before:** arrow-less boxes indistinguishable from text inputs.
**After:** add to the shared select rule:

```css
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%2394a3b8' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 12px center;   /* RTL: chevron sits at the visual end */
  padding-left: 32px;
  min-height: 40px;
}
```

Also give `.input, select, input[type=text], input[type=number]` a `min-height: 40px` (mobile media query bumps to 44px).

### D-2. Course card (index.html search list) — the flagship change

**Before:** name, code, unit/gender badges, professor, capacity bar. No times, no exam, no conflict info, faculty color dead.

**After (rendered by `renderCourseList()` in `student-planner.js`):**

```
┌────────────────────────────────────────────┐
│▌ نام درس                          [+ افزودن]│   ▌ = 3px faculty strip (uses --fc)
│  ۱۲۳۴۵_۰۱ · دکتر محمدی                      │
│  [شنبه ۸–۱۰] [دوشنبه ۸–۱۰]  [📝 ۱۴۰۳/۱۰/۱۵] │   session chips + exam chip
│  [۳ واحد] [مختلط]        [⚠ تداخل با مدار…] │   badges; conflict chip only when clash
│  ▂▂▂▂▂▂▂▂▂▂ capacity                        │
└────────────────────────────────────────────┘
```

Specifics:

1. **Faculty strip:** change `.course-card::before` idle background from `transparent` to `var(--fc, transparent)` at 60% opacity, full `--fc` when `.selected`. (Consumes the already-set `--fc`.)
2. **Session chips:** new element `.course-card-times` — a row of `.time-chip`s (component exists in `main.css`; move it out of the professor-only section into shared components). Data via existing `parseSchedule(c.schedule)`; render as `شنبه ۸–۱۰`. If no parsable schedule, omit the row.
3. **Exam chip:** `.time-chip.exam-chip` with `📝` + `CourseDomain.parseExam(c.exam_text).date` when present.
4. **Conflict preview:** before rendering, compute `hasTimeClash` (any session overlaps a selected course's session — reuse `PlannerDomain.buildTimetable` slot map or `sessionsOverlap`) and `hasExamClash` (existing `findExamClash`). If either: add class `.course-card.has-conflict` → `border-color: var(--err-border)`, and render a chip `.badge.badge-danger` with text `⚠ تداخل کلاس` or `⚠ تداخل امتحان` (both if both). Card remains clickable (student may still want it), but the toast on add already warns.
   - Performance note: compute the selected-courses session list **once per render**, not per card; 100-card cap keeps this trivial.
5. **Explicit affordance:** add a trailing pill inside the card header, `.course-card-cta`: idle `+ افزودن` (accent outline), selected `✓ حذف` (filled accent). Pure visual (the whole card stays the `<button>`); set `aria-hidden="true"` on it since `aria-pressed` + label already convey state.
6. Type: `.course-card-name` → `var(--fs-md)`; `.course-card-id` → `var(--fs-2xs)`; `.course-card-prof` → `var(--fs-xs)`.
7. Capacity bar height 3px → 4px; add `aria-hidden="true"` (the `title` already carries the numbers; also append capacity text to the card's `aria-label`: `ظرفیت ۲۵ از ۳۰`).

**Persian copy:** add-toast gains an undo affordance later (P2); conflict chip copy: `تداخل کلاس` / `تداخل امتحان`.

### D-3. Timetable (index.html + professor.html)

1. **Empty state:** when `state.selected` is empty, render inside `.timetable-container` (overlaid or replacing grid content):
   - icon `📅`, title `برنامه‌ات خالی است`, desc `از جستجوی درس، درس‌های موردنظرت را اضافه کن تا اینجا نمایش داده شوند.`
   - On mobile add a `.btn.btn-primary` `رفتن به جستجو` that calls `setMobView('search')`.
2. **Class block recolor (contrast fix):**

```css
.class-block {
  --fc: var(--blue);                                  /* JS sets per-course */
  background: color-mix(in srgb, var(--fc) 22%, var(--s2));
  border-inline-start: 3px solid var(--fc);
  color: var(--t1);
  font-size: var(--fs-2xs);
  box-shadow: none;
}
```

   JS change (`updateTimetable()` both pages): replace `div.style.background = color; div.style.backgroundImage = …` with `div.style.setProperty('--fc', color)`. Fallback for non-`color-mix` browsers: keep a plain `background: var(--s3);` declared before the `color-mix` line.
   `.class-block-name` → `--fs-2xs` bold; `.class-block-prof`/`.class-block-loc` → `--fs-2xs`, `color: var(--t2)` (kill the sub-10px sizes and opacity-based dimming).
3. **Conflict styling:** replace permanent red fill + infinite pulse with:

```css
.class-block.conflict {
  --fc: var(--red);
  background: color-mix(in srgb, var(--red) 26%, var(--s2));
  border: 1px solid var(--err-border);
  border-inline-start: 3px solid var(--red);
}
.class-block.conflict::after { content: '⚠'; position: absolute; top: 4px; right: 6px; color: var(--err-text); }
.class-block.conflict.just-added { animation: pulse-conflict 1.2s ease 2; }  /* finite */
```

   JS: add `just-added` only to blocks of the most recently toggled course.
4. **Remove button:** 28 × 28 px visual, hit area extended to 44 px via `::after { content:''; position:absolute; inset:-8px; }`; always visible under `@media (pointer: coarse)`, hover/focus-revealed on fine pointers. Font-size 14px, `background: rgba(0,0,0,0.45)`.
5. Slot min-heights unchanged. Day header row: keep solid `--blue` fill with white bold text (passes).

### D-4. Top bar & unit meter (index.html)

1. Theme button: set `aria-label="تغییر تم"` and `aria-pressed` semantics are wrong for a cycle button — instead update `aria-label` to `تغییر به تم روشن/تیره` on toggle. Print button: `aria-label="چاپ برنامه"`. Wrap emoji in `<span aria-hidden="true">`.
2. Unit display: when over cap, also render a `⚠` glyph and set `role="status"` so the change is announced. Bar fill colors switch to `--warn-*`/`--err-*` tokens (logic exists in `updateUnitDisplay`).
3. **Mobile GPA (P1):** make `#mobUnitPill` a `<button aria-haspopup="dialog">`. Tapping opens a new small modal (`#unitSheet`, reuse `.modal-backdrop`/`.modal-box`, `max-width: 340px`) containing:
   - title `واحدها و معدل`
   - the unit progress bar (same markup as desktop `.unit-display`)
   - the GPA field (move to a shared partial: same `input` wired to `onGpaChange`) with helper text: `معدل ترم قبل سقف واحد را تعیین می‌کند: زیر ۱۲ ← ۱۴ واحد، ۱۷ به بالا ← ۲۴ واحد`
   - Desktop keeps the existing inline `topbar-center`; the two GPA inputs sync via `restoreGpaInput()` on open.

### D-5. Tabs (sidebar + data-editor)

1. `.tab-btn` min-height 40px (44px mobile — moot, hidden on mobile). Active state: add `box-shadow: inset 0 -2px 0 var(--accent)`? No — keep current pill style, just retint text to `var(--accent)`.
2. **data-editor `.page-tab`: convert `<div>`s to `<button>`s** with `role="tab"`, `aria-selected`, wrapped in `role="tablist"`; add `:focus-visible` ring; `min-height: 44px`. Same `switchAdminTab` calls.

### D-6. Modals (all pages)

1. `.modal-close`: 36 × 36 px; keep circle style.
2. Mobile bottom-sheet variant:

```css
@media (max-width: 768px) {
  .modal-backdrop { align-items: flex-end; }
  .modal-box {
    width: 100%; max-width: none; max-height: 88dvh;
    border-radius: var(--r4) var(--r4) 0 0;
    padding-bottom: calc(var(--sp6) + env(safe-area-inset-bottom, 0px));
    transform: translateY(24px);
  }
}
```

3. Exam modal table: add a first-column status glyph for flagged rows — `⛔` (row-danger) / `⚠` (row-warning) with `aria-label` (`تداخل زمانی امتحان` / `دو امتحان در یک روز`) so color is not the only channel. Make `thead` sticky inside `.modal-body` (`position: sticky; top: 0; background: var(--s2);`).

### D-7. Toasts

1. Position: keep bottom-center; on mobile raise above the nav: `bottom: calc(62px + env(safe-area-inset-bottom, 0px) + var(--sp3))` inside the ≤768 media query.
2. Colored border-inline-start (3px) using status tokens in addition to current border tint; icon colors → `--ok-text` etc.
3. Min font `--fs-sm`. Close button 32px hit area.
4. (P2) `Toast.show(msg, type, duration, { actionLabel, onAction })` → renders an action button (e.g. `بازگردانی` to undo a remove).

### D-8. Badges

- `font-size: var(--fs-2xs)` (up from 0.68rem), padding `3px 9px`.
- Light-theme legibility: add overrides

```css
[data-theme="light"] .badge-male   { background: rgba(37,99,235,0.12);  color: #1d4ed8; }
[data-theme="light"] .badge-female { background: rgba(219,39,119,0.12); color: #be185d; }
[data-theme="light"] .badge-mixed  { background: rgba(124,58,237,0.12); color: #6d28d9; }
```

- `.badge-success/warning/danger/primary` re-point to `--ok-text/--warn-text/--err-text/--accent` for text.

### D-9. Curriculum tab (index.html)

1. **Non-color status channel:** `.cur-status-dot` (8px circle) becomes a 14px status glyph span: passed `✓`, failed `✗`, taking `↻`, available `+`, locked `🔒` — colored with status text tokens, `aria-hidden` (status is appended to the card's accessible name instead).
2. Cards: `role="button" tabindex="0"` already activated via `bindActivation` — add `aria-label` = `«نام درس»، وضعیت: پاس‌شده. کلیک: تبدیل به افتاده` (reuse the existing `statusTooltip` map).
3. `.cur-card-units` → `--fs-2xs`; `.cur-card-name` → `--fs-xs` semibold. Status text colors switch to `--ok-text/--err-text/--accent/--warn-text` variants.
4. `.sem-title` → `--fs-2xs`, `color: var(--t2)` (was `--t3` at 0.72rem — double dim).
5. 3-state cycle hint: add a one-line legend at the top of the curriculum scroll: `یک‌بار کلیک: پاس ✓ · دوباره: افتاده ✗ · بار سوم: حذف علامت` styled `--fs-2xs`, `--t2`.

### D-10. professor.html

1. Add visually-hidden `<h1>` (`داشبورد تداخل گروه`) or promote `.topbar-brand-name` to `h1`.
2. Summary cards: numbers use `--fs-2xl`; add `role="group"` + labels already textual — fine. (P2) clicking hard/soft cards sets `#conflictFilter` accordingly.
3. `.conflict-card`: text colors to status tokens; `.conflict-severity` font to `--fs-2xs`; `.time-chip` shared (see D-2).
4. `.ai-explain-btn`: `min-height: 32px; padding: 4px 12px;` desktop, 44px hit area on coarse pointers.
5. Controls bar: `label` elements get `for` attributes bound to the selects (currently unassociated).
6. Empty state when no group selected already exists — keep.

### D-11. data-editor.html

1. Tabs → buttons (D-5.2).
2. Associate every `<label>` with its control (`for`/`id`) — currently none are.
3. Table inputs `min-height: 36px` (internal tool; 44 not required).
4. Output modal: `copyMsg` gets `role="status"`.

### D-12. AI panel (index.html, hidden unless enabled)

Token-level only: bubble font `--fs-sm`; `.ai-quick-btn` → `--fs-2xs`, min-height 32px; `.ai-send-btn` 40px (44 on mobile); send button icon `aria-hidden`, button `aria-label="ارسال"`. No structural change.

---

## (e) Accessibility Checklist (acceptance criteria)

- [ ] All text ≥ 4.5:1 in **both** themes; verify at minimum: `--t3` usages, active tab, badges, class-blocks, conflict cards, toasts, light-theme warning text.
- [ ] No text below 11.5 px (`--fs-2xs`).
- [ ] All interactive elements ≥ 44 px hit area on touch (remove-btn, modal-close, tabs, nav, send-btn, pill) — visual size may be smaller with padding/`::after` extension.
- [ ] Course removal possible on touch devices directly from the schedule grid.
- [ ] `prefers-reduced-motion: reduce` disables pulse/slide/scale animations globally.
- [ ] Icon-only buttons have `aria-label`; decorative emoji wrapped in `aria-hidden="true"` spans (topbar, bottom nav icons — nav buttons already have `aria-label`, keep).
- [ ] data-editor tabs keyboard-operable with visible focus.
- [ ] Exam-clash and curriculum statuses conveyed by glyph/text, not color alone.
- [ ] `:focus-visible` ring visible on both themes on all interactive components (spot-check course card, cur-card, class-block remove, selects).
- [ ] Modals: focus moves in on open, restores on close, Escape closes (already implemented — do not regress).
- [ ] `aria-live` regions preserved: course count, selected stat, AI messages, unit status.
- [ ] Every form control has an associated label (`for`/`id`) on all three pages.
- [ ] Each page has exactly one `h1`.

---

## (f) Prioritized Scope

### P1 — must-have (single implementation pass)

| ID | Item | Files |
|----|------|-------|
| P1-1 | Token refresh + semantic aliases + light-theme contrast fixes + type scale + `--t0` fix + `prefers-reduced-motion` + focus ring | `main.css`, small edits in page `<style>` blocks |
| P1-2 | Course card: session/exam chips, conflict preview chip, faculty strip via `--fc`, CTA pill, type bump | `student-planner.js` (`renderCourseList`), `main.css` |
| P1-3 | Class-block recolor (`color-mix` + edge bar), finite conflict animation, readable block typography | `main.css`, `student-planner.js`, `professor-dashboard.js` |
| P1-4 | Touch-usable remove button (28px visual / 44px hit, always-on for coarse pointers) | `main.css` |
| P1-5 | Mobile GPA/unit bottom sheet from unit pill | `index.html`, `student-planner.js`, `main.css` |
| P1-6 | Timetable empty state with CTA | `student-planner.js`, `main.css` |
| P1-7 | Select chevron + input min-heights | `main.css` |
| P1-8 | Curriculum status glyphs + legend + accessible names | `student-planner.js`, `main.css` |
| P1-9 | data-editor tabs → buttons; label/`for` associations on all pages | `data-editor.html`, `professor.html`, `index.html` |
| P1-10 | Exam modal status glyph column + sticky header; toast position above mobile nav | `student-planner.js`, `main.css`, `ui.js` |
| P1-11 | Bug fixes D-0 (invalid declaration, no-op ternary), icon-button `aria-label`s, page `h1`s | all three HTML files, JS |

### P2 — nice-to-have (follow-up pass)

| ID | Item |
|----|------|
| P2-1 | Undo action in toasts (`بازگردانی`) for add/remove |
| P2-2 | Modal bottom-sheet presentation on mobile (D-6.2) |
| P2-3 | Self-host Vazirmatn woff2 (3 weights: 400/600/800) under `apps/web/fonts/`, drop CDN + tighten CSP |
| P2-4 | professor.html summary cards act as conflict filters |
| P2-5 | Exam list: chronological card view on mobile instead of table |
| P2-6 | Search: highlight matched substring in course names |
| P2-7 | Skeleton states while course list renders (skeleton class exists, unused) |
| P2-8 | Migrate new/edited rules to CSS logical properties |

### Suggested implementation order

P1-1 (tokens) → P1-11 (bug fixes) → P1-7 → P1-3/P1-4 → P1-2 → P1-5/P1-6 → P1-8 → P1-9/P1-10.

---

## (g) Non-Goals (explicitly out of scope)

- No framework, build step, bundler, or CSS preprocessor; no new external dependencies (CDN font stays as-is in this pass).
- No changes to information architecture: three pages, sidebar-tabs + mobile bottom-nav pattern, modal-based exams/AI stay.
- No changes to `apps/web/generated/**`, domain logic (`scripts/domain/`), storage, AI client behavior, or the CSP beyond what P2-3 would later require.
- No icon-system replacement (emoji stay, standardized).
- No new features: no drag-and-drop scheduling, no course comparison, no ICS export, no server-rendered anything.
- No RTL→logical-properties migration of existing rules.
- No visual rebrand: dark-blue palette, Vazirmatn, and the existing layout grid remain recognizable.
