# UI/UX Redesign Specification v2 — «کاشی و زعفران»

**Version:** 2.0 (Round 2 — full visual rebrand)
**Stage:** Design (no code changes in this stage)
**Supersedes:** the *visual* layer of `01-design-spec.md`. All round-1 **UX and accessibility work is kept** (session/exam/conflict chips, conflict preview, empty states, mobile GPA sheet, 44 px targets, reduced motion, focus visibility, ARIA, Persian digits, status glyphs). Round 1 was rejected as too timid: it repaired the old identity. Round 2 replaces the identity.
**Files affected by implementation:** `apps/web/index.html`, `apps/web/professor.html`, `apps/web/data-editor.html`, `apps/web/styles/main.css`, plus two tiny constant changes in `apps/web/scripts/features/ui.js` and `apps/web/scripts/pages/student-planner.js`.
**Must NOT be touched:** `apps/web/generated/**`, `scripts/domain/**`, storage, AI client logic, information architecture.

**Definition of done for the rebrand:** a user who knew the old app opens any page and immediately sees a different product — different color world, different type voice, different surface language — while every workflow and class name they relied on still works.

---

## (a) Design Concept — «کاشی و زعفران» (Tile & Saffron)

The old app was a generic dark-navy SaaS dashboard (#0d1628 + #3b82f6) that could belong to any product. The new identity is drawn from two unmistakably Iranian materials: **glazed tile (کاشی فیروزه‌ای)** and **saffron (زعفران)**.

- **Dark theme — "شب باغ" (garden at night):** deep cypress-green lacquer surfaces (green-black, hue ≈165°, never navy), with **Persian-turquoise** as the single interactive accent and **saffron gold** reserved for numbers and identity moments (unit counts, the time rail, the brand mark, exam dates). The page background carries a faint turquoise/saffron atmosphere gradient — depth without noise.
- **Light theme — "کاغذ" (manuscript paper):** warm ivory paper, white cards, deep-teal ink and burnt-saffron numerals. Deliberately warm — not an inverted dark theme, and not the blue-white admin default.
- **Signature geometry — the tile cut:** cards, class blocks, toasts and summary cards carry one flattened corner (`border-end-start-radius: 4px` against a 12–16 px radius elsewhere) — the corner cut of a kashi tile. The brand mark is a **saffron octagon** (the گره/hasht motif) holding the letter «و» (واحد). The teal→gold hairline seam appears exactly twice (active tab indicator, unit bar fill) as a tilework joint, never as a background gradient.
- **Typography as identity:** **Estedad Variable** (geometric, contemporary Persian) becomes the display voice — headings, stat numerals, day headers, tabs, buttons — used at weights 650–800 with real size contrast; **Vazirmatn Variable** stays as the reading voice for body text and dense tables. Two variable files, ~230 KB total, both from jsdelivr (already allowed by CSP).

Why it fits: this is a Persian-language tool for Iranian students planning a term. Turquoise tile + saffron + paper is a native palette with instant cultural legibility, it photographs nothing like the old navy app, and it dodges every AI-design cliché the brief bans (no purple-blue gradient, no navy+cyan, no glassmorphism-for-its-own-sake).

---

## (b) Design Tokens

### b.1 Complete token block

Replace the entire `:root` and `[data-theme="light"]` blocks of `apps/web/styles/main.css` with the following. **New canonical names** carry the design; a **legacy alias layer** keeps every old token name resolving, so JS/inline-style references (`var(--blue)`, `var(--warn-bg)`, `var(--t3)`, …) keep working without a sweep.

```css
/* ═══ فونت‌ها — Estedad ships no font-face CSS on jsdelivr; declare it here.
       Vazirmatn Variable is loaded via its official CSS <link> (see §e). ═══ */
@font-face {
  font-family: 'Estedad';
  src: url('https://cdn.jsdelivr.net/gh/aminabedi68/Estedad@8.5/fonts/Estedad%5Bwght%5D.woff2')
       format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

:root {
  /* ── Fonts ── */
  --font-body:    'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
  --font-display: 'Estedad', 'Vazirmatn', Tahoma, sans-serif;

  /* ── Surfaces — cypress lacquer (dark) ── */
  --bg0: #0A1310;   /* page          */
  --bg1: #0F1B17;   /* panel/sidebar */
  --bg2: #142520;   /* card          */
  --bg3: #1A2F28;   /* raised/hover  */
  --bg4: #213A31;   /* highest       */

  /* ── Hairlines ── */
  --line-0: rgba(237,243,238,0.06);
  --line-1: rgba(237,243,238,0.11);
  --line-2: rgba(237,243,238,0.20);

  /* ── Ink ── */
  --ink-max: #FBFDFB;   /* highest emphasis            */
  --ink:     #EDF3EE;   /* primary        14.2:1 on bg2 */
  --ink-2:   #A9C0B4;   /* secondary       8.3:1 on bg2 */
  --ink-3:   #84A093;   /* microcopy       5.7:1 on bg2 */

  /* ── فیروزه — the interactive accent ── */
  --accent:        #4CD9BE;                 /* text/icon accent   9.1:1 on bg2 */
  --accent-fill:   #3ECFB4;                 /* solid fills (buttons, indicators) */
  --accent-strong: #5CE3C9;                 /* hover/active fill */
  --on-accent:     #04241D;                 /* label ON accent fills  8.5:1 */
  --accent-dim:    rgba(62,207,180,0.13);
  --accent-border: rgba(62,207,180,0.35);
  --accent-glow:   rgba(62,207,180,0.25);

  /* ── زعفران — numerals & identity (never a status color) ── */
  --gold:        #F2BE45;                   /* text-safe gold     9.3:1 on bg2 */
  --gold-fill:   #E7B33C;
  --on-gold:     #241A04;
  --gold-dim:    rgba(242,190,69,0.12);
  --gold-border: rgba(242,190,69,0.35);

  /* ── Status triads (warning moves amber→orange to clear saffron) ── */
  --ok-text:   #5CDE8B;  --ok-fill:   #22C55E;  --ok-bg:   rgba(34,197,94,0.14);  --ok-border:   rgba(34,197,94,0.35);
  --warn-text: #FFAB5C;  --warn-fill: #F97316;  --warn-bg: rgba(249,115,22,0.14); --warn-border: rgba(249,115,22,0.38);
  --err-text:  #FF8F80;  --err-fill:  #EF4444;  --err-bg:  rgba(239,68,68,0.15);  --err-border:  rgba(239,68,68,0.42);

  /* ── Timetable ── */
  --slot-bg:    rgba(237,243,238,0.025);
  --slot-hover: rgba(237,243,238,0.055);

  /* ── Radius — tile language ── */
  --r1: 8px;  --r2: 12px;  --r3: 16px;  --r4: 24px;
  --r-pill: 999px;
  --r-cut:  4px;            /* the signature tile-cut corner */

  /* ── Shadows / effects ── */
  --sh1: 0 1px 3px rgba(2,8,6,0.45);
  --sh2: 0 6px 24px rgba(2,8,6,0.5);
  --sh3: 0 16px 48px rgba(2,8,6,0.6);
  --glow-accent: 0 0 24px var(--accent-glow);

  /* ── Focus ── */
  --focus-ring: 0 0 0 2px var(--bg0), 0 0 0 4px var(--accent);

  /* ── Motion ── */
  --fast: 120ms cubic-bezier(0.3, 0, 0.4, 1);
  --mid:  220ms cubic-bezier(0.33, 0, 0.2, 1);
  --slow: 380ms cubic-bezier(0.22, 1, 0.36, 1);   /* settle */

  /* ── Spacing (unchanged) ── */
  --sp1: 4px; --sp2: 8px; --sp3: 12px; --sp4: 16px;
  --sp5: 20px; --sp6: 24px; --sp8: 32px;

  /* ── Type scale — more top-end contrast than v1 ── */
  --fs-2xs: 0.72rem;   /* 11.5px floor — chips, badges          */
  --fs-xs:  0.78rem;   /* 12.5px — meta, labels                 */
  --fs-sm:  0.86rem;   /* 13.8px — secondary body, buttons      */
  --fs-md:  0.95rem;   /* 15.2px — primary body, card titles    */
  --fs-lg:  1.15rem;   /* section titles                        */
  --fs-xl:  1.45rem;   /* page titles                           */
  --fs-2xl: 1.8rem;    /* stat values                           */
  --fs-3xl: 2.15rem;   /* hero numerals (professor summary)     */

  /* ── Touch ── */
  --tap: 44px;

  /* ── Scrollbar ── */
  --sc: #2A443A;

  /* ═══ LEGACY ALIASES — every old token keeps resolving.
         Do not use these in new CSS; they exist for JS/inline styles. ═══ */
  --s0: var(--bg0); --s1: var(--bg1); --s2: var(--bg2); --s3: var(--bg3); --s4: var(--bg4);
  --b0: var(--line-0); --b1: var(--line-1); --b2: var(--line-2);
  --t0: var(--ink-max); --t1: var(--ink); --t2: var(--ink-2); --t3: var(--ink-3);
  --blue: var(--accent-fill); --blue-dim: var(--accent-dim); --blue-glow: var(--accent-glow);
  --violet: var(--gold); --violet-dim: var(--gold-dim);
  --cyan: var(--accent-fill);
  --green: var(--ok-fill);  --green-dim: var(--ok-bg);
  --yellow: var(--warn-fill); --yellow-dim: var(--warn-bg);
  --red: var(--err-fill);   --red-dim: var(--err-bg);
  --orange: var(--warn-fill);
}

[data-theme="light"] {
  /* ── Surfaces — warm paper ── */
  --bg0: #F1EEE4;   /* page: ivory     */
  --bg1: #F8F6EF;   /* panel           */
  --bg2: #FFFFFF;   /* card            */
  --bg3: #ECE8DC;   /* raised          */
  --bg4: #E0DBCC;   /* highest         */

  --line-0: rgba(31,42,37,0.08);
  --line-1: rgba(31,42,37,0.13);
  --line-2: rgba(31,42,37,0.22);

  --ink-max: #101915;
  --ink:     #1F2A25;   /* 14.8:1 on white */
  --ink-2:   #44564D;   /*  7.8:1 on white */
  --ink-3:   #596C63;   /*  5.6:1 on white, 4.8:1 on page */

  --accent:        #0B6B5D;   /* 6.4:1 on white */
  --accent-fill:   #0A5D51;   /* white label 7.8:1 */
  --accent-strong: #084A41;
  --on-accent:     #FFFFFF;
  --accent-dim:    rgba(20,184,166,0.12);
  --accent-border: rgba(10,93,81,0.35);
  --accent-glow:   rgba(10,93,81,0.18);

  --gold:        #875A08;     /* text-safe 6.0:1 on white */
  --gold-fill:   #E7B33C;     /* decorative fill, dark label */
  --on-gold:     #241A04;
  --gold-dim:    rgba(231,179,60,0.16);
  --gold-border: rgba(135,90,8,0.35);

  --ok-text:   #166B34;  --ok-fill:   #1F9D50;  --ok-bg:   rgba(34,197,94,0.12);  --ok-border:   rgba(22,107,52,0.35);
  --warn-text: #93470B;  --warn-fill: #D96A11;  --warn-bg: rgba(249,115,22,0.12); --warn-border: rgba(147,71,11,0.35);
  --err-text:  #B42318;  --err-fill:  #D92D20;  --err-bg:  rgba(239,68,68,0.10);  --err-border:  rgba(180,35,24,0.35);

  --slot-bg:    rgba(31,42,37,0.03);
  --slot-hover: rgba(31,42,37,0.06);

  --sh1: 0 1px 3px rgba(58,49,29,0.10);
  --sh2: 0 6px 24px rgba(58,49,29,0.12);
  --sh3: 0 16px 48px rgba(58,49,29,0.18);

  --focus-ring: 0 0 0 2px #fff, 0 0 0 4px var(--accent);
  --sc: #C9C2AF;
}
```

### b.2 Computed WCAG contrast ratios (verified by script)

| Pair (usage) | Dark | Light |
|---|---|---|
| `--ink` on `--bg2` (primary text on card) | **14.2** | **14.8** |
| `--ink` on `--bg0` (primary on page) | **16.8** | **12.8** |
| `--ink-2` on `--bg2` (secondary) | **8.3** | **7.8** |
| `--ink-3` on `--bg2` / `--bg1` / `--bg0` (microcopy) | **5.7 / 6.3 / 6.7** | **5.6 / 4.8 / 4.8** |
| `--accent` on `--bg2` / `--bg0` (links, active tab) | **9.1 / 10.8** | **6.4 / 5.5** |
| `--on-accent` on `--accent-fill` (primary button label) | **8.5** | **7.8** |
| `--on-accent` on `--accent-strong` (button hover) | **10.4** | **10.2** |
| `--gold` on `--bg2` / `--bg1` (unit numerals, time rail) | **9.3 / 10.3** | **6.0 / 5.6** |
| `--ok-text` on card / on `--ok-bg` | **9.3 / 7.3** | **6.6 / 5.9** |
| `--warn-text` on card / on `--warn-bg` | **8.5 / 7.1** | **6.7 / 5.9** |
| `--err-text` on card / on `--err-bg` | **7.2 / 6.3** | **6.6 / 5.8** |
| `--accent` on `--accent-dim` (selected course card) | **6.9** | **5.7** |
| Badge male/female/mixed on card | **7.6 / 8.4 / 7.9** | **6.7 / 6.0 / 7.1** |
| `--ink` on class-block (`color-mix` 24 % faculty hue over `--bg2`, mid-hue) | **7.9** | **12.1** |
| `--on-gold` on `--gold-fill` (brand mark, nav badge) | **9.6** | **9.6** |
| `--accent-fill` vs `--bg0` (non-text UI ≥3:1) | **9.7** | ≥3 ✓ |

Every text pair ≥ 4.5:1 in both themes. Reviewers can re-run the pairs with any WCAG calculator.

### b.3 Old → new token migration map

Full main.css rewrite is safe because **every old name is defined** (alias layer). For new/edited rules use canonical names:

| Old token | New canonical | Note |
|---|---|---|
| `--s0…--s4` | `--bg0…--bg4` | values now green-lacquer / paper |
| `--b0…--b2` | `--line-0…--line-2` | |
| `--t0` | `--ink-max` | |
| `--t1 / --t2 / --t3` | `--ink / --ink-2 / --ink-3` | |
| `--blue` | `--accent-fill` | all former blue fills become turquoise |
| `--blue-dim` | `--accent-dim` | |
| `--blue-glow` | `--accent-glow` | |
| `--accent`, `--accent-strong`, `--accent-border` | **same names**, new values | `--accent-strong` is now theme-relative hover fill; pair with `--on-accent` for labels |
| `--violet`, `--violet-dim` | `--gold`, `--gold-dim` | violet is retired; identity accents become saffron |
| `--cyan` | `--accent-fill` | retired |
| `--green / --yellow / --red / --orange` | `--ok-fill / --warn-fill / --err-fill / --warn-fill` | raw status fills |
| `--green-dim / --yellow-dim / --red-dim` | `--ok-bg / --warn-bg / --err-bg` | |
| `--ok/warn/err-text·bg·border` | **same names**, new values | warning hue: amber → orange |
| `--slot-bg / --slot-hover` | same names, new values | |
| `--r1…--r4` | same names, **new values** (8/12/16/24) + new `--r-pill`, `--r-cut` | |
| `--sh1…--sh3` | same names, new values + new `--glow-accent` | |
| `--focus-ring` | same name | |
| `--fast / --mid / --slow` | same names, new curves | |
| `--sp1…--sp8` | unchanged | |
| `--fs-2xs…--fs-2xl` | same names (+ new `--fs-3xl`) | `--fs-sm/lg/xl/2xl` values bumped |
| `--tap`, `--sc` | same names | |
| *(none)* | `--font-body`, `--font-display`, `--on-accent`, `--gold-*`, `--on-gold`, `--*-fill` | new |
| **JS constant** `FACULTY_PALETTE` (`ui.js:137`) | new 12-hue array, §d.5 | |
| **JS fallback** `'#3b82f6'` (`student-planner.js:109`) | `'#2FBFA9'` | |

**Hard-coded values to replace during the rewrite:** any remaining `#3b82f6`, `#2563eb`, `rgba(59,130,246,…)`, `rgba(139,92,246,…)`, `rgba(236,72,153,…)` in `main.css` and the three page `<style>` blocks → nearest canonical token (see per-component specs). The select chevron data-URI stroke `%2364748b` → `%2384a093` (dark ink-3; acceptable in light too, or theme via a second rule).

---

## (c) Per-Component Redesign Specs

Class names are **kept** (JS renders them). Only styles change unless a markup edit is listed in §d.

### c.1 Base, atmosphere, typography plumbing

```css
body {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.65;
  color: var(--ink);
  background:
    radial-gradient(1100px 520px at 88% -8%,  rgba(62,207,180,0.07), transparent 60%),
    radial-gradient(900px  480px at 8%  108%, rgba(242,190,69,0.05), transparent 55%),
    var(--bg0);
  background-attachment: fixed;
  -webkit-font-smoothing: antialiased;
}
[data-theme="light"] body {
  background:
    radial-gradient(1100px 520px at 88% -8%, rgba(10,93,81,0.05), transparent 60%),
    var(--bg0);
  background-attachment: fixed;
}

/* Display voice — apply via this utility AND per-component rules below */
.font-display, h1, h2, h3, .modal-title, .main-title, .panel-label,
.topbar-brand-name, .brand-name {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.01em;
}
/* Numeric identity — Persian digits set in the display face */
.num, .unit-count, .summary-card-value, .time-label, .mob-unit-num {
  font-family: var(--font-display);
  font-feature-settings: 'tnum' 1;
}
```

Keep round-1 reset, `prefers-reduced-motion` block, `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`, `.sr-only`, print block. Scrollbar: width 8 px, thumb `var(--sc)`, radius pill.

### c.2 Brand mark (shared, new class in main.css)

The octagon replaces all three inline-styled gradient logo divs:

```css
.brand-logo {
  width: 36px; height: 36px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--gold-fill); color: var(--on-gold);
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
  font-family: var(--font-display); font-weight: 800; font-size: 1.15rem;
  line-height: 1; padding-bottom: 2px; /* optical centering of «و» */
}
```

Content: the letter **«و»** on all three pages (one mark, one brand). `aria-hidden="true"` on the div.

### c.3 Topbar (`.app-topbar`, `.topbar`)

From generic dark strip → translucent lacquer band over the atmosphere gradient:

```css
.app-topbar, .topbar {
  height: 60px; padding: 0 22px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: var(--bg1);                                       /* fallback */
  background: color-mix(in srgb, var(--bg1) 88%, transparent);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line-1);
  position: sticky; top: 0; z-index: 50; flex-shrink: 0;
}
.brand-name, .topbar-brand-name { font-size: 1.02rem; font-weight: 800; }
.brand-badge {
  font-family: var(--font-display); font-size: var(--fs-2xs); font-weight: 650;
  background: var(--gold-dim); color: var(--gold);
  border: 1px solid var(--gold-border); border-radius: var(--r-pill); padding: 2px 8px;
}
```

(`professor.html`/`data-editor.html` `.topbar` gets the same band; solid `background` fallback line declared before `color-mix` for old browsers.)

### c.4 Unit meter + GPA (desktop topbar center)

One "meter capsule" language; saffron numerals are the identity moment:

```css
.unit-display {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg2); border: 1px solid var(--line-1);
  border-radius: var(--r-pill); padding: 6px 16px 6px 12px;
  font-size: var(--fs-xs);
}
.unit-count {
  font-family: var(--font-display); font-weight: 800;
  font-size: 1.2rem; color: var(--gold); line-height: 1;
}
.unit-sep { color: var(--line-2); } .unit-max { color: var(--ink-2); font-weight: 600; }
.unit-bar { width: 64px; height: 5px; background: var(--line-0); border-radius: var(--r-pill); overflow: hidden; }
.unit-bar-fill {
  height: 100%; border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--accent-fill), var(--gold-fill)); /* the tile seam */
  transition: width var(--slow);
}
.unit-display.warning { border-color: var(--warn-border); } .unit-display.warning .unit-count { color: var(--warn-text); }
.unit-display.danger  { border-color: var(--err-border);  background: var(--err-bg); }
.unit-display.danger  .unit-count { color: var(--err-text); }
.gpa-box { /* same capsule language */
  display: flex; align-items: center; gap: 6px;
  background: var(--bg2); border: 1px solid var(--line-1);
  border-radius: var(--r-pill); padding: 6px 14px; font-size: var(--fs-xs);
}
.gpa-box input { font-family: var(--font-display); font-weight: 750; color: var(--gold); }
```

JS note: `student-planner.js` sets `fill.style.background = fillColor` (ok/warn/err tokens) when over thresholds — that inline style wins over the gradient, which is exactly the desired escalation. No JS change.

### c.5 Tabs (sidebar `.tabs/.tab-btn`) — segmented pill → underline seam

```css
.tabs { display: flex; gap: var(--sp2); background: transparent; padding: 0;
        border-bottom: 2px solid var(--line-0); border-radius: 0; }
.tab-btn {
  flex: 1; min-height: 44px; padding: 8px 12px; border: none;
  background: transparent; color: var(--ink-3); cursor: pointer;
  font-family: var(--font-display); font-weight: 650; font-size: var(--fs-sm);
  display: flex; align-items: center; justify-content: center; gap: 6px;
  position: relative; border-radius: var(--r1) var(--r1) 0 0;
  transition: color var(--fast), background var(--fast); white-space: nowrap;
}
.tab-btn:not(.active):hover { color: var(--ink); background: var(--line-0); }
.tab-btn.active { color: var(--accent); background: transparent; box-shadow: none; }
.tab-btn.active::after {
  content: ''; position: absolute; bottom: -2px; inset-inline: 14%; height: 3px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(90deg, var(--accent-fill), var(--gold-fill));
}
```

`.tab-panel` display logic unchanged.

### c.6 Buttons

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp2);
  min-height: 40px; padding: 8px 18px;
  border-radius: var(--r2); border: none; cursor: pointer;
  font-family: var(--font-display); font-weight: 650; font-size: var(--fs-sm);
  white-space: nowrap; text-decoration: none; transition: all var(--mid);
  -webkit-tap-highlight-color: transparent;
}
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.btn-primary { background: var(--accent-fill); color: var(--on-accent); }
.btn-primary:hover { background: var(--accent-strong); box-shadow: var(--glow-accent); transform: translateY(-1px); }
.btn-success { background: var(--ok-fill); color: #04120A; }
[data-theme="light"] .btn-success { color: #fff; }
.btn-danger  { background: var(--err-fill); color: #fff; }
.btn-ghost   { background: transparent; border: 1px solid var(--line-1); color: var(--ink-2); }
.btn-ghost:hover { background: var(--line-0); color: var(--ink); border-color: var(--line-2); }
.btn-icon { padding: 8px; } .btn-sm { min-height: 34px; padding: 5px 13px; font-size: var(--fs-xs); }
.btn-lg { min-height: 48px; padding: 11px 24px; font-size: var(--fs-md); }
```

The dark-theme primary button — turquoise gem with near-black label — is one of the loudest "new app" signals. Verified 8.5:1 (dark) / 7.8:1 (light).

### c.7 Inputs, selects, search

```css
.input, select, input[type=text], input[type=number], textarea {
  width: 100%; min-height: 42px; padding: 9px 14px;
  border: 1px solid var(--line-1); border-radius: var(--r2);
  background: var(--bg0); color: var(--ink);
  font-family: var(--font-body); font-size: var(--fs-sm);
  caret-color: var(--accent); appearance: none;
  transition: border-color var(--fast), box-shadow var(--fast), background var(--fast);
}
[data-theme="light"] .input, [data-theme="light"] select,
[data-theme="light"] input[type=text], [data-theme="light"] input[type=number],
[data-theme="light"] textarea { background: var(--bg2); }
.input:focus, select:focus, input[type=text]:focus, input[type=number]:focus, textarea:focus {
  outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim); background: var(--bg1);
}
[data-theme="light"] .input:focus, [data-theme="light"] select:focus,
[data-theme="light"] input[type=text]:focus, [data-theme="light"] input[type=number]:focus,
[data-theme="light"] textarea:focus { background: var(--bg2); }
```

Keep the round-1 select chevron rule (data-URI, `background-position: left 12px center`, `padding-left: 32px`) with stroke recolored to `%2384a093` — it must stay **after** the shared rule (its `background:` shorthand would reset the image). Search wrapper/icon rules keep; icon color `--ink-3` → `--accent` on focus.

### c.8 Course card — tile card

Structure/classes unchanged (round-1 chips, CTA, conflict preview all kept). New skin:

```css
.course-card {
  background: var(--bg2); border: 1px solid var(--line-0);
  border-radius: var(--r2); border-end-start-radius: var(--r-cut);   /* tile cut */
  padding: var(--sp3) var(--sp4); margin-bottom: var(--sp2);
  cursor: pointer; position: relative; overflow: hidden;
  width: 100%; color: var(--ink); font: inherit; text-align: right;
  transition: all var(--mid);
}
.course-card::before {  /* faculty spine — unchanged mechanics, thicker */
  content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 4px;
  background: var(--fc, transparent); opacity: 0.65;
  transition: opacity var(--mid);
}
.course-card:hover { background: var(--bg3); border-color: var(--line-1);
                     transform: translateY(-1px); box-shadow: var(--sh1); }
.course-card:hover::before { opacity: 1; }
.course-card.selected { background: var(--accent-dim); border-color: var(--accent-border); }
.course-card.selected::before { background: var(--fc, var(--accent-fill)); opacity: 1; }
.course-card.has-conflict { border-color: var(--err-border); }
.course-card-name { font-family: var(--font-display); font-weight: 650; font-size: var(--fs-md); line-height: 1.4; }
.course-card-cta {
  flex-shrink: 0; font-family: var(--font-display); font-size: var(--fs-2xs); font-weight: 700;
  padding: 4px 12px; border-radius: var(--r-pill);
  border: 1px solid var(--accent-border); color: var(--accent);
  white-space: nowrap; transition: all var(--fast);
}
.course-card.selected .course-card-cta { background: var(--accent-fill); border-color: var(--accent-fill); color: var(--on-accent); }
.course-card-id { font-size: var(--fs-2xs); color: var(--ink-3); font-family: var(--font-body); font-feature-settings: 'tnum' 1; }
```

Meta/prof/times rows, capacity bar: keep round-1 rules retargeted to new tokens (`.capacity-bar` height 4 px, fills `--ok-fill/--warn-fill/--err-fill`).

### c.9 Timetable — the hero

Container becomes a framed panel; headers lose their solid blue slabs; the time rail turns saffron.

```css
.timetable-container, .timetable-box {
  flex: 1; min-height: 0; background: var(--bg1);
  border: 1px solid var(--line-0); border-radius: var(--r3);
  border-end-start-radius: var(--r-cut); padding: 14px; overflow: auto;
}
.timetable-grid, .timetable-inner, .tt-grid { gap: 4px; }   /* column templates unchanged */

/* Day headers: open type + turquoise tick, no filled slab */
.timetable-header {
  background: transparent; color: var(--ink);
  font-family: var(--font-display); font-weight: 750; font-size: var(--fs-sm);
  display: flex; align-items: center; justify-content: center;
  height: 40px; position: relative; border-radius: 0;
}
.timetable-header::after {
  content: ''; position: absolute; bottom: 3px; right: 50%; transform: translateX(50%);
  width: 26px; height: 3px; border-radius: var(--r-pill);
  background: var(--accent-fill);
}
.timetable-header.timetable-corner { color: var(--ink-3); font-size: var(--fs-2xs); font-weight: 500; }
.timetable-header.timetable-corner::after { display: none; }

/* Saffron time rail */
.time-label {
  display: flex; align-items: center; justify-content: center;
  background: transparent; border-radius: 0;
  border-inline-end: 1px solid var(--line-0);
  font-family: var(--font-display); font-weight: 700; font-size: var(--fs-xs);
  color: var(--gold); text-align: center; line-height: 1.2;
  font-feature-settings: 'tnum' 1;
}

/* Slots: solid hairline instead of dashed noise */
.slot {
  background: var(--slot-bg); border: 1px solid var(--line-0);
  border-radius: var(--r1); padding: 3px; min-height: 72px;
  display: flex; flex-direction: column; gap: 2px; position: relative;
  transition: background var(--fast), border-color var(--fast);
}
.slot:hover { background: var(--slot-hover); border-color: var(--line-1); }

/* Class block: glazed tile */
.class-block {
  --fc: var(--accent-fill);            /* JS sets per-course */
  flex: 1; min-height: 56px; padding: 6px 8px;
  border-radius: var(--r1); border-end-start-radius: var(--r-cut);
  background: var(--bg3);                                   /* fallback */
  background: color-mix(in srgb, var(--fc) 24%, var(--bg2));
  border-inline-start: 3px solid var(--fc);
  color: var(--ink); font-size: var(--fs-2xs);
  display: flex; flex-direction: column; justify-content: center;
  overflow: hidden; position: relative; cursor: default;
  transition: box-shadow var(--fast), transform var(--fast);
}
.class-block:hover { box-shadow: var(--sh1); }
.class-block-name { font-family: var(--font-display); font-weight: 700; line-height: 1.35; margin-bottom: 2px; }
.class-block-prof, .class-block-loc { color: var(--ink-2); font-size: var(--fs-2xs); }
```

Conflict styling (`.class-block.conflict` on `--err-*`, `color-mix(in srgb, var(--err-fill) 26%, var(--bg2))`, ⚠ marker), `just-added` finite pulse, `.remove-btn` (28 px visual / 44 px hit, coarse-pointer always-on, scrim `rgba(2,8,6,.5)`), `.timetable-empty`: **keep round-1 rules**, retargeted to new tokens.

### c.10 Curriculum map

```css
.sem-title {
  font-family: var(--font-display); font-weight: 700; font-size: var(--fs-xs);
  color: var(--ink-2); display: flex; align-items: center; gap: var(--sp2);
  margin-bottom: var(--sp2); padding-bottom: 0; border-bottom: none;
  letter-spacing: 0.5px;
}
.sem-title::after { content: ''; flex: 1; height: 1px; background: var(--line-0); } /* rule line after text */
.sem-title .sem-units { color: var(--gold); font-weight: 650; font-size: var(--fs-2xs); }
.cur-card {
  border-radius: var(--r2); border-end-start-radius: var(--r-cut);
  padding: 10px 12px; cursor: pointer;
  border: 1px solid var(--line-0); background: var(--bg2);
  transition: all var(--fast); position: relative;
}
.cur-card:hover:not(.locked) { transform: translateY(-1px); box-shadow: var(--sh1); }
.cur-card-name { font-size: var(--fs-xs); font-weight: 600; line-height: 1.4; margin-bottom: 4px; }
```

Status variants (`passed/failed/available/taking/locked`), glyphs, legend, offered-dot: keep round-1 rules on new triads; `.cur-card.available` uses `--accent-dim/--accent-border/--accent`; the light-theme override for available-text (round-1 QA DEF-5) can be dropped — the new light `--accent` already reaches 5.7:1 on `--accent-dim`. `.offered-dot` → `--ok-fill`, glow removed (flat 6 px dot + `box-shadow: 0 0 0 2px var(--ok-bg)`).

### c.11 Badges & chips

```css
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: var(--r-pill);
  font-size: var(--fs-2xs); font-weight: 700; white-space: nowrap;
  border: 1px solid transparent;
}
.badge-male    { background: rgba(95,141,239,0.16);  color: #7FB5FF; }
.badge-female  { background: rgba(229,107,140,0.16); color: #FF9EC9; }
.badge-mixed   { background: rgba(181,126,220,0.16); color: #C9A6FF; }
[data-theme="light"] .badge-male   { background: rgba(29,78,216,0.10);  color: #1D4ED8; }
[data-theme="light"] .badge-female { background: rgba(190,24,93,0.10);  color: #BE185D; }
[data-theme="light"] .badge-mixed  { background: rgba(109,40,217,0.10); color: #6D28D9; }
.badge-unit    { background: var(--line-0); color: var(--ink-2); }
.badge-success { background: var(--ok-bg); color: var(--ok-text); border-color: var(--ok-border); }
.badge-warning { background: var(--warn-bg); color: var(--warn-text); border-color: var(--warn-border); }
.badge-danger  { background: var(--err-bg); color: var(--err-text); border-color: var(--err-border); }
.badge-primary { background: var(--accent-dim); color: var(--accent); border-color: var(--accent-border); }

.time-chip {
  font-size: var(--fs-2xs); background: var(--bg1); color: var(--ink-2);
  border: 1px solid var(--line-1); border-radius: var(--r-pill); padding: 2px 9px;
  white-space: nowrap; font-feature-settings: 'tnum' 1;
}
[data-theme="light"] .time-chip { background: var(--bg0); }
.time-chip.exam-chip { background: var(--gold-dim); color: var(--gold); border-color: var(--gold-border); }
```

Exam chips going saffron ties "dates = gold" across the whole app (unit numbers, time rail, exam chips).

### c.12 Modals & mobile sheet

```css
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(4,10,8,0.72);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  z-index: 100; display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity var(--mid), visibility 0s var(--mid);
}
[data-theme="light"] .modal-backdrop { background: rgba(31,42,37,0.45); }
.modal-backdrop.open { opacity: 1; visibility: visible; pointer-events: all;
                       transition: opacity var(--mid), visibility 0s; }
.modal-box {
  background: var(--bg2); border: 1px solid var(--line-1);
  border-radius: var(--r4); padding: var(--sp6);
  max-width: 640px; width: 90%; max-height: 85vh;
  box-shadow: var(--sh3); display: flex; flex-direction: column; overflow: hidden;
  transform: translateY(14px) scale(0.98); transition: transform var(--slow);
}
.modal-backdrop.open .modal-box { transform: none; }
.modal-title { font-family: var(--font-display); font-weight: 750; font-size: var(--fs-lg); }
/* Mobile: bottom sheet with grab handle */
@media (max-width: 768px) {
  .modal-backdrop { align-items: flex-end; }
  .modal-box {
    width: 100%; max-width: none !important; max-height: 88dvh;
    border-radius: var(--r4) var(--r4) 0 0; border-bottom: none;
    padding-bottom: calc(var(--sp6) + env(safe-area-inset-bottom, 0px));
    transform: translateY(32px);
  }
  .modal-box::before {
    content: ''; align-self: center; width: 40px; height: 4px;
    border-radius: var(--r-pill); background: var(--line-2); margin-bottom: var(--sp3);
  }
}
```

`.modal-close` (36 px + extended hit), `.modal-header`, sticky table head: keep round-1 rules on new tokens (sticky `th` background: `var(--bg2)`).

### c.13 Toasts

```css
.toast {
  background: var(--bg4); border: 1px solid var(--line-1);
  border-inline-start-width: 3px;
  border-radius: var(--r2); border-end-start-radius: var(--r-cut);
  padding: 11px 16px; display: flex; align-items: center; gap: 10px;
  font-size: var(--fs-sm); min-width: 260px; max-width: 380px;
  box-shadow: var(--sh3); pointer-events: all;
  transform: translateY(16px); opacity: 0;
  transition: transform var(--slow), opacity var(--mid);
}
[data-theme="light"] .toast { background: var(--bg2); }
.toast.show { transform: none; opacity: 1; }
```

Status edge/icon colors and close-button hit area: keep round-1 rules (tokens already retargeted).

### c.14 Empty states

```css
.empty-state { /* layout unchanged */ }
.empty-state-icon {
  width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;
  font-size: 1.7rem; opacity: 1;
  background: var(--bg3); color: var(--ink-2);
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
}
.empty-state-title { font-family: var(--font-display); font-weight: 700; font-size: var(--fs-md); color: var(--ink-2); }
.empty-state-desc  { font-size: var(--fs-sm); color: var(--ink-3); max-width: 280px; line-height: 1.7; }
```

The octagon icon-well repeats the brand motif. All round-1 empty states (timetable CTA, curriculum, conflicts) keep their copy and behavior.

### c.15 Mobile bottom nav + unit pill (index.html `<style>` block)

Height moves 62 → 64 px (see §d.1 for the two dependent edits).

```css
.mob-nav {
  display: flex; flex-shrink: 0; height: 64px;
  background: var(--bg1);                                       /* fallback */
  background: color-mix(in srgb, var(--bg1) 92%, transparent);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  border-top: 1px solid var(--line-1);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.mob-nav-btn { /* structure unchanged */ color: var(--ink-3); font-weight: 650; }
.mob-nav-btn.active { color: var(--accent); }
.mob-nav-btn.active .mob-nav-icon-wrap {
  background: var(--accent-dim); border: 1px solid var(--accent-border);
  border-radius: var(--r-pill); border-end-start-radius: var(--r-cut);
  padding: 4px 18px; margin-bottom: 1px;
}
.mob-nav-badge {
  background: var(--gold-fill); color: var(--on-gold);
  border: 2px solid var(--bg1); border-radius: var(--r-pill);
  font-family: var(--font-display); font-weight: 800;
}
.mob-unit-pill {
  display: flex; align-items: center; gap: 6px;
  background: var(--gold-dim); border: 1px solid var(--gold-border);
  border-radius: var(--r-pill); padding: 5px 13px 5px 9px;
  color: var(--gold); font-weight: 700; font-size: var(--fs-xs);
  font-family: inherit; cursor: pointer; position: relative;
  -webkit-tap-highlight-color: transparent;
}
.mob-unit-pill::after { content: ''; position: absolute; inset: -8px; }  /* 44px hit */
.mob-unit-pill.over { background: var(--err-bg); border-color: var(--err-border); color: var(--err-text); }
.mob-unit-num { font-family: var(--font-display); font-size: 1.05rem; font-weight: 800; }
```

JS keeps `wrap.style.background = 'var(--blue-dim)'` for the active view (`student-planner.js:863`) — the alias resolves to `--accent-dim` and agrees with the class-based rule above. No JS change.

### c.16 Professor summary cards — hero stats

```css
.summary-card {
  background: var(--bg2); border: 1px solid var(--line-0);
  border-radius: var(--r3); border-end-start-radius: var(--r-cut);
  padding: var(--sp4) var(--sp5); flex: 1; min-width: 140px;
  position: relative; overflow: hidden;
}
.summary-card::before {   /* status spine */
  content: ''; position: absolute; inset-inline-start: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: var(--r-pill); background: var(--line-1);
}
.summary-card-label { font-size: var(--fs-2xs); color: var(--ink-3); font-weight: 600; margin-bottom: 6px; line-height: 1.4; }
.summary-card-value {
  font-family: var(--font-display); font-weight: 800;
  font-size: var(--fs-3xl); line-height: 1.1; letter-spacing: -0.01em;
}
.summary-card.danger::before  { background: var(--err-fill); }
.summary-card.warning::before { background: var(--warn-fill); }
.summary-card.success::before { background: var(--ok-fill); }
.summary-card.primary::before { background: var(--accent-fill); }
.summary-card.danger  .summary-card-value { color: var(--err-text); }
.summary-card.warning .summary-card-value { color: var(--warn-text); }
.summary-card.success .summary-card-value { color: var(--ok-text); }
.summary-card.primary .summary-card-value { color: var(--accent); }
```

Conflict cards (`.conflict-card`, severity pills, `.conflict-pair` in display font weight 700): keep round-1 structure; `hard/soft` tints on new `--err/--warn` triads; severity pill `hard` = `--err-fill` + white, `soft` = `--warn-fill` + `#1F1200`. Mobile summary-card responsive rules (2-col) keep, with `.summary-card-value` mobile size `var(--fs-xl)`.

### c.17 Data-editor essentials

Page tabs (in `data-editor.html` `<style>`): adopt the c.5 underline-seam pattern:

```css
.page-tabs { display: flex; gap: var(--sp2); padding: 0 16px; background: transparent; border-bottom: 2px solid var(--line-0); }
.page-tab  { padding: 12px 22px; min-height: 48px; cursor: pointer; background: transparent; border: none;
             font-family: var(--font-display); font-weight: 650; font-size: var(--fs-sm);
             color: var(--ink-3); position: relative; }
.page-tab:hover  { color: var(--ink); }
.page-tab.active { color: var(--accent); border-bottom: none; }
.page-tab.active::after { content: ''; position: absolute; bottom: -2px; inset-inline: 12%; height: 3px;
                          border-radius: 3px 3px 0 0;
                          background: linear-gradient(90deg, var(--accent-fill), var(--gold-fill)); }
```

Tables (`.rule-table`, `.cur-table`, shared `.data-table`): headers `--ink-3` microcaps in display font 650; row hairlines `--line-0`; `.cur-table th` background `--bg1`. `.info-box` → `background: var(--accent-dim); border: 1px solid var(--accent-border); border-radius: var(--r2); border-end-start-radius: var(--r-cut);`. Code area textarea background `--bg0` (dark) / `--bg3` (light). All round-1 form-label associations and 36 px dense-input allowances stay.

### c.18 AI panel & FAB (hidden unless enabled)

`.ai-fab`: `background: var(--gold-fill); color: var(--on-gold); box-shadow: 0 4px 20px rgba(231,179,60,.35);` (replaces the violet-blue gradient). `.ai-fab-dot` → `--ok-fill` with `border-color: var(--bg0)`. Panel/bubbles: retarget to `--bg*/--line*/--ink*`; user bubble `background: var(--accent-fill); color: var(--on-accent);`. `.ai-quick-btn` hover → `--accent-dim/--accent`. Send button = `.btn-primary` colors, 44 px on mobile. No structural change.

---

## (d) Per-Page Notes & Exact HTML Changes

### d.1 `apps/web/index.html`

1. **Line 9 — font link.** Replace the static Vazirmatn CSS with the Variable one:
   ```html
   <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-Variable-font-face.css" rel="stylesheet"/>
   ```
   (Estedad needs no `<link>`; its `@font-face` lives in `main.css`, §b.1.)
2. **Brand mark.** Replace `<div class="brand-logo">📚</div>` with `<div class="brand-logo" aria-hidden="true">و</div>`. **Delete** the local `.brand-logo` rule from the page `<style>` (lines 26–31) — it moves to `main.css` (§c.2).
3. **Professor link (line 295).** Replace the inline violet styling with gold:
   `style="background:var(--gold-dim);color:var(--gold);border-color:var(--gold-border);text-decoration:none"`.
4. **Topbar heights.** In the page `<style>`: `.app-topbar` height `54px → 60px` (desktop) and `50px → 56px` (mobile block). Update the mobile pane height calc accordingly:
   `height: calc(100dvh - 50px - 62px)` → `calc(100dvh - 56px - 64px)`.
5. **Bottom nav height.** `.mob-nav` height `62px → 64px` in both the base rule and the `@supports` safe-area rule (`calc(64px + env(...))`).
6. Replace the remaining page-`<style>` skins with the §c.4/§c.15 rules (`.unit-display`, `.gpa-box`, `.mob-nav*`, `.mob-unit-pill`; `.mob-sched-title` gets `font-family: var(--font-display)`). Layout rules (grid areas, transforms, view switching, safe-area) are untouched. The `.gpa-box input` min-height opt-out (QA DEF-3) stays.
7. Everything else (tabs markup, modals, unit sheet, exam modal, AI panel, scripts) — **no markup change**.

### d.2 `apps/web/professor.html`

1. Font link swap (same as d.1-1).
2. **Line 87** — replace the inline-styled gradient logo div with `<div class="brand-logo" aria-hidden="true">و</div>`.
3. Legend rects (lines 145–147) keep `var(--red)/var(--yellow)/var(--blue)` — aliases resolve to `--err-fill/--warn-fill/--accent-fill`, which are the correct new meanings. No edit required (optional: rewrite to canonical names).
4. Page `<style>`: `.controls-bar`/`.summary-bar` backgrounds keep working via aliases; `.tt-grid` inherits the §c.9 hero treatment from main.css; `.ai-explain-btn` unchanged (round-1 rules).
5. `.topbar` gets the §c.3 band treatment from main.css; `.topbar-brand-name` is already the page `h1` — keep.

### d.3 `apps/web/data-editor.html`

1. Font link swap (same as d.1-1).
2. **Line 63** — replace the inline-styled gradient logo div with `<div class="brand-logo" aria-hidden="true">و</div>`.
3. Page `<style>`: replace the `.page-tabs/.page-tab` block with §c.17; table styles retargeted per §c.17. Tab **buttons** (round-1 conversion) stay buttons with their ARIA.

### d.4 `apps/web/styles/main.css`

Full rewrite: §b.1 token block + §c component rules + kept round-1 blocks (reset, reduced-motion, focus-visible, remove-btn, conflict pulse keyframes, skeleton, sr-only, print, responsive helpers). Also:
- Toast mobile offset: `bottom: calc(62px + …)` → `calc(64px + …)`.
- Scrollbar: `::-webkit-scrollbar { width: 8px; height: 8px; }`, thumb `var(--sc)` pill.
- Keep the `.text-*`/`.font-*` utility classes pointing at the same token names.
- Recommended section order: fonts → tokens → reset → base/atmosphere → typography utilities → components (c.2–c.18) → responsive → print.

### d.5 JS constant changes (the only script edits)

1. **`apps/web/scripts/features/ui.js` line 137** — replace `FACULTY_PALETTE` (currently 12 cool blues/violets) with 12 hues tuned for `color-mix` over both new surface worlds:
   ```js
   const FACULTY_PALETTE = [
       '#2FBFA9', '#E0A72E', '#5B8DEF', '#E07856',
       '#8CC152', '#B57EDC', '#E56B8C', '#4EC9DD',
       '#BDB13F', '#8B93E8', '#5FBF77', '#CC7ABF',
   ];
   ```
   (Teal, saffron, lapis, terracotta, pistachio, orchid, rose, aqua, olive-gold, periwinkle, green, magenta — decorative only; block text contrast is carried by the 24 % `color-mix` + `--ink`, verified ≥ 7.9:1 dark / ≥ 12:1 light for mid hues.)
2. **`apps/web/scripts/pages/student-planner.js` line 109** — fallback `'#3b82f6'` → `'#2FBFA9'`.

No other JS changes. `professor-dashboard.js:108` (`var(--yellow)`/`var(--blue)`) and `student-planner.js:863` (`var(--blue-dim)`) resolve correctly through the alias layer.

---

## (e) Font Loading Plan

| Face | Role | Loading | Size |
|---|---|---|---|
| **Vazirmatn Variable** (wght 100–900) | body/reading | `<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-Variable-font-face.css" rel="stylesheet"/>` on all three pages (replaces the static-weights CSS; same family name `'Vazirmatn'`, so nothing else breaks). Its internal `src` resolves to `…/fonts/webfonts/Vazirmatn[wght].woff2` on the same CDN. | ~108 KB woff2 |
| **Estedad Variable** (wght 100–900) | display/identity | Self-authored `@font-face` at the top of `main.css` (§b.1): `https://cdn.jsdelivr.net/gh/aminabedi68/Estedad@8.5/fonts/Estedad%5Bwght%5D.woff2`, `format('woff2-variations')`, `font-display: swap`. (The Estedad repo ships no font-face CSS on jsdelivr — verified; the direct woff2 URL returns HTTP 200, `font/woff2`.) | ~118 KB woff2 |

**Why Estedad:** it is the strongest openly-licensed contemporary Persian display sans (OFL, by Amin Abedi) — geometric, confident at heavy weights, clearly different in voice from Vazirmatn's humanist neutrality, with full Persian-digit coverage and a variable weight axis, so one file serves everything from 650-weight buttons to 800-weight hero numerals. Vazirmatn stays for running text because it is the better long-form reading face — the pairing *is* the identity.

**CSP:** the current policy already includes `style-src … https://cdn.jsdelivr.net` and `font-src 'self' https://cdn.jsdelivr.net data:` on all three pages — **no CSP change needed**. Net payload: two variable files (~226 KB) replace up to nine static Vazirmatn weight files; `font-display: swap` with the Tahoma fallback keeps first paint unblocked.

---

## (f) Accessibility Acceptance Criteria

Inherits the full round-1 checklist (spec 01 §e) — every item must still pass. Round-2 additions/re-verifications:

- [ ] All §b.2 contrast pairs re-measured in the implemented CSS, **both themes**: ink levels on each surface, accent/gold text, status triads on tinted bgs, button labels on fills, badges, class-block text over `color-mix` surfaces (test the lightest faculty hue `#E0A72E` and the darkest `#5B8DEF`), all ≥ 4.5:1.
- [ ] No text below 11.5 px (`--fs-2xs` floor). Estedad used no smaller than `--fs-2xs`, and only at weight ≥ 600 below `--fs-sm`.
- [ ] `backdrop-filter` surfaces (topbar, mob-nav, modal backdrop) keep their text pairs AA over the busiest underlying content; a solid `background` fallback is declared before every `color-mix()`/blur usage.
- [ ] Tile-cut corners never clip focus rings (`outline-offset: 2px` verified on course cards, cur-cards, toasts, nav pills).
- [ ] Focus ring visible on the new transparent-background tabs and page-tabs in both themes.
- [ ] Status meaning never rides on saffron: gold = identity/numerals only; warnings are orange + glyph + text (verify exam chips [gold] are not confusable with warning chips [orange + ⚠]).
- [ ] Touch: 44 px effective targets preserved everywhere round 1 fixed them (remove-btn, modal-close, tabs, mob-nav, unit pill, send-btn); the new 42 px inputs reach 44 px in the mobile media query.
- [ ] `prefers-reduced-motion`: new hover lifts/glows and the modal settle animation collapse to ≤ 0.01 ms; no infinite animation anywhere.
- [ ] Light-theme modal backdrop (0.45 ink scrim) still gives the sheet ≥ 3:1 edge contrast against the page.
- [ ] RTL: `border-end-start-radius`, `inset-inline`, `border-inline-start` render the cut/spines on the correct side with `dir="rtl"`; the select chevron stays at the visual end.
- [ ] Persian digits still render via `toPersianNum()` in both fonts (Estedad and Vazirmatn both cover U+06F0–U+06F9); `tnum` alignment on the time rail and unit counts.
- [ ] Print: timetable prints legibly (blocks keep `print-color-adjust: exact`; body prints on white).
- [ ] One `h1` per page; all round-1 ARIA (dialogs, tablists, `aria-live`, `aria-pressed`, labels) untouched by the reskin.

---

## (g) Non-Goals

- **No** framework, build step, preprocessor, or icon system; emoji icons stay (standardized per round 1). Vanilla stack only.
- **No** information-architecture changes: three pages, sidebar tabs + mobile bottom nav, modal exams/AI, same flows.
- **No** renaming of JS-rendered class names; no restructuring of DOM that page controllers generate (the two §d.5 constant edits are the only script changes).
- **No** changes to `apps/web/generated/**`, domain logic, storage schema, AI client, or CSP.
- **No** new features (no drag-and-drop, comparison, ICS export, undo — undo remains a round-1 P2 item).
- **No** app-wide migration to logical properties; only the new rules introduced here use them.
- **No** grain/noise textures in this pass (the atmosphere gradients carry the depth); a data-URI grain overlay is a deliberate follow-up option, not part of the one implementation pass.
- **No** self-hosting of fonts in this pass (CDN is in CSP and cached); self-hosting both woff2 files under `apps/web/fonts/` is the documented follow-up if offline use becomes a requirement.
