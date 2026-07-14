# UI/UX Redesign Handoff — انتخاب واحد هوشمند

**Status:** Approved implementation specification (Review Agent, 2026-07-03)  
**Date:** 2026-07-03  
**Direction:** “Planning cockpit”: calm, legible, decision-first, Persian/RTL-native  
**Implementation constraint:** Preserve the static vanilla HTML/CSS/JS architecture and all deterministic planning behavior. Do not edit generated data files.

## 1. Executive decision

The product should stop feeling like a course database beside a timetable and become a guided planning workspace. The primary flow is:

1. establish the student's context;
2. discover a course;
3. compare sections using time, instructor, capacity, exam, and conflicts;
4. add a section with predictable feedback;
5. continuously validate units, clashes, and curriculum progress;
6. review a concise “ready to register” summary.

This is an evolutionary redesign, not a rewrite. The current implementation already has good deterministic checks, responsive navigation, dark/light themes, accessible dialogs, course decision data, and a usable timetable. The redesign changes hierarchy and interaction architecture so those strengths are easier to understand.

### Delivery boundary

The implementation target is deliberately split into two levels so the redesign can ship coherently in this repository:

- **Required in this implementation:** student planner shell and hierarchy, course-first grouping, search plus the filters supported by current data, safe replacement/risk confirmation, durable plan health, weekly/list/exam views, final review, responsive behavior, and the shared semantic visual tokens.
- **Required alignment, not workflow rewrites:** professor and data-editor pages adopt the shared tokens, focus treatment, header/control styling, responsive containment, and replace non-decorative emoji actions where touched. Their existing deterministic workflows remain intact.
- **Deferred enhancements:** professor metric-driven selection/highlighting, editor-wide dirty tracking and undo, time-range filtering, registration export formats beyond copy/print/JSON, and virtualized results. They are follow-on work and are not blockers for approving the student redesign.

No backend, framework, build step, generated-data edit, account system, or registration submission is introduced.

### Success measures

- A first-time student can add a suitable section and find it in the schedule without instruction.
- A returning student can understand “what needs attention” within five seconds.
- The student can compare sections of the same course without scanning repeated full cards.
- No action relies on color, hover, or hidden controls.
- Student, professor, and editor pages share one recognizable system.
- Core tasks work at 320 CSS px, 768 px, 1024 px, and 1440 px without clipped controls or body-level horizontal scrolling.

## 2. Audit

### Product and implementation inspected

- Public student planner: `apps/web/index.html`
- Professor conflict dashboard: `apps/web/professor.html`
- Internal data editor: `apps/web/data-editor.html`
- Shared design system: `apps/web/styles/main.css`
- Page behavior and dynamic DOM: `apps/web/scripts/pages/*.js`
- Existing redesign and QA records: `docs/uiux-redesign/`

No browser binary or Playwright/Puppeteer runtime is installed. The audit therefore combines DOM/CSS/JS inspection with the repository's prior contrast, responsive, and QA evidence. Visual verification remains required during implementation.

### What is already strong and must be preserved

- Persian-first RTL document structure and Vazirmatn typography.
- Local-only planner state and no mandatory account.
- Search across a large offering set with faculty/group filtering.
- Decision data on course cards: instructor, sessions, exam, capacity, units, gender, conflict preview.
- Explicit add/remove state and direct removal from the timetable.
- Unit cap derived from GPA and represented on desktop/mobile.
- Empty, conflict, loading, toast, modal, and reduced-motion treatments.
- Curriculum progress and prerequisite-path behavior.
- Professor conflict classification and deterministic analysis.
- Dark and light themes with repaired AA contrast.

### Primary UX problems

| Finding | User consequence | Priority |
|---|---|---|
| The interface opens directly into a dense database view with no lightweight orientation or academic-context summary. | New users do not know which faculty/group/cohort controls matter or what data semester they are viewing. | P0 |
| Search results treat every section as a separate, equally prominent course card. | Repeated course names create scanning fatigue and make section comparison slow. | P0 |
| Filters are always expanded and visually compete with results. There is no active-filter summary or one-action reset. | Mobile users lose vertical space; all users can forget why results are restricted. | P0 |
| The desktop timetable consumes most space but is primarily a result, while course discovery is constrained to a 370 px rail. | Rich result metadata wraps and becomes harder to compare; the primary work surface is backwards for early planning. | P0 |
| Validation is scattered among card chips, toast messages, unit meter, exam modal, and timetable styling. | Users must hunt to answer “Is this plan valid?” | P0 |
| Adding a conflicting course is allowed but feedback is transient; there is no durable attention queue or explicit override explanation. | A warning can be missed and the plan may remain invalid. | P0 |
| Capacity is largely a thin color bar and title text. | Exact availability is not quickly understandable and is weak for non-visual/accessibility use. | P1 |
| Mobile uses three destinations but no persistent plan-health indication beyond count/units. | Problems are discovered only after opening the schedule. | P1 |
| There is no consolidated final review/export surface for registration. | The experience ends with a timetable rather than a confident next step. | P1 |
| Emoji iconography is semantically inconsistent and visually noisy at small sizes. | The system feels less cohesive and some icons vary by platform. | P1 |
| Desktop and mobile are separate modes at 768 px with no intermediate tablet composition. | 769–1000 px widths can feel compressed. | P1 |
| Professor controls, summary, legend, timetable, and conflict list all occupy separate horizontal bands. | The page spends substantial height before the analyst reaches actual conflicts. | P1 |
| Data editor navigation and dense tables are functional but visually disconnected from public pages. | Internal maintainers learn a second UI dialect. | P2 |

### Heuristic observations

- **Visibility of status:** selection count and units are visible; overall validity is not.
- **Match to mental model:** students think in courses first and sections second; the UI lists sections first.
- **Error prevention:** pre-add conflicts are shown, but a risky click proceeds with no deliberate confirmation.
- **Recognition over recall:** exam and class conflicts live in different surfaces.
- **User control:** removal is good; undo after add/remove is still absent.
- **Efficiency:** filters and search work, but no sort, saved view, or compact comparison exists.
- **Consistency:** multiple topbar/inline-style variants and emoji conventions weaken the shared system.

## 3. Target users and jobs

### Primary: undergraduate student

Often on a phone, under time pressure, and working from a university registration system in parallel. Needs to:

- find required or desired courses;
- choose among sections;
- avoid class/exam conflicts;
- respect unit limits;
- understand prerequisites and curriculum status;
- reproduce course/section codes in Golestan;
- retain work privately on the same device.

### Secondary: academic advisor or professor

Usually on desktop. Needs to:

- select faculty and group;
- identify hard and soft conflicts;
- see why a pair conflicts;
- prioritize actionable issues;
- print or share a concise report.

### Tertiary: curriculum/data maintainer

Needs dense, keyboard-friendly editing, validation, clear dirty/saved status, and safe import/export. This page receives system alignment but not a workflow rewrite.

## 4. Information architecture

### Student planner

```
Application shell
├── Planner (default)
│   ├── Discovery
│   │   ├── Search
│   │   ├── Filter/sort
│   │   └── Grouped course results → sections
│   └── Current plan
│       ├── Weekly schedule
│       ├── Plan health / attention queue
│       └── Review & registration summary
├── Curriculum
│   ├── Cohort progress
│   ├── Semester groups
│   └── Prerequisite path
└── Assistance
    └── Optional AI advisor, clearly secondary
```

Desktop keeps discovery and current plan visible together. Mobile uses bottom navigation:

1. `دروس`
2. `برنامه`
3. `چارت`

The `برنامه` item carries both selected count and an error dot when the plan needs attention. Exams are no longer a top-level isolated destination; they appear in Plan Review, with an optional dialog from the schedule.

### Professor dashboard

```
Header
├── Scope controls (faculty, group, conflict type)
├── Compact metrics (clickable filters)
└── Analysis workspace
    ├── Conflict list (primary)
    └── Timetable (supporting context)
```

## 5. Core interaction design

### 5.1 First-run context

On first visit, show a non-modal “شروع سریع” panel above results:

- title: `برای چه رشته‌ای برنامه می‌چینی؟`
- faculty, group, and cohort fields;
- semester snapshot label sourced from available data metadata, or `نیم‌سال جاری` if metadata does not exist;
- primary action `نمایش درس‌ها`;
- secondary `فعلاً همه درس‌ها را ببین`.

After completion it collapses into a one-line context chip row. Persist the choice locally. Never block browsing.

**Tradeoff:** A blocking onboarding modal could force correct setup but would delay users who only need a course lookup. The inline, dismissible panel provides orientation without a gate.

### 5.2 Search, filters, and sort

- Search remains immediate with 200 ms debounce.
- Placeholder: `نام درس، استاد یا کد درس`
- `Ctrl/Cmd + K` focuses search on desktop.
- A filter button opens:
  - desktop: anchored popover;
  - mobile: bottom sheet.
- Fields in this delivery: faculty, group, gender, day, units, availability (`ظرفیت دارد`), and `بدون تداخل با برنامه`. Time-range filtering is deferred because the current parser/grid discretizes times and needs a separate domain upgrade.
- Sort choices: `مرتبط‌ترین`, `نام درس`, `ظرفیت بیشتر`, `زمان زودتر`.
- Applied filters render as removable chips below the search field.
- `پاک‌کردن همه` appears only when at least one filter is active.
- Results count is announced politely and displayed as `۱٬۵۲۴ ارائه`.

### 5.3 Course-first result grouping

Group offerings by a deterministic base ID: remove only a final `_<section>` suffix from `course.id`; fall back to normalized name + units + faculty when an ID has no suffix. Never merge equal names from different faculties/base IDs. A **course group card** is the default unit:

- course name and base code;
- unit count;
- curriculum status only when the active faculty/group/cohort maps the base code to curriculum data (`پیشنهادی ترم ۵`, `گذراند‌ه‌شده`, `پیش‌نیاز ناقص`); omit the row otherwise;
- summary `۴ گروه ارائه شده · ۲ گروه بدون تداخل`;
- best available section preview;
- expand/collapse chevron and entire header button.

The first matching group may expand automatically after a search; otherwise expansion is user-controlled and preserved during the current session. When expanded, section rows use aligned columns:

```
استاد | زمان کلاس | امتحان | ظرفیت | جنسیت | action
```

On mobile, each row becomes a compact two-column card; the action remains at the visual end. One section can be selected per course group by default. Selecting another section for the same course opens a small replacement confirmation:

`گروه ۰۱ با گروه ۰۳ جایگزین شود؟` — `جایگزینی` / `انصراف`

The current domain does not identify a valid use case for simultaneous sections with the same base ID. Treat this as replacement, while preserving the selected set storage format.

### 5.4 Add behavior and risk handling

- Safe section: add immediately; toast includes `واگردانی`.
- Conflicting section: open a compact confirmation sheet/dialog before mutating selection:
  - exact conflict type;
  - conflicting course and time/exam date;
  - actions `بررسی برنامه`, `با وجود تداخل اضافه کن`, `انصراف`.
- Over-unit-cap addition uses the same pattern and states the calculated limit. If both risks apply, one dialog lists both; do not stack dialogs.
- Persist warnings in Plan Health until resolved; toast is supplementary.
- Buttons use stable labels: `افزودن`, `انتخاب‌شده`, `جایگزینی`, not a mixed “✓ حذف” label. Removal is a separate accessible action.

### 5.5 Plan workspace

Desktop uses a 44/56 split at ≥1280 px: discovery on the right, plan on the left in RTL visual order. Between 1024–1279 px use 48/52. The plan panel contains:

1. **Plan status header**
   - `برنامه این ترم`
   - `۶ درس · ۱۸ از ۲۰ واحد`
   - semantic health pill: `آماده`, `۲ مورد نیازمند بررسی`, or `بیش از سقف واحد`
   - `مرور نهایی` primary/secondary action depending on state.
2. **Attention queue**
   - only visible when issues exist;
   - durable rows for class conflict, exam conflict, and unit overflow; unmet prerequisite appears only when the active curriculum supplies a resolvable prerequisite relation, otherwise the UI must not infer it;
   - each row links to/focuses the affected blocks.
3. **View switch**
   - `هفتگی` (default), `فهرست`, `امتحان‌ها`.
4. **Content**
   - weekly grid;
   - selected-course list for narrow screens/accessibility;
   - chronological exam list.

The list view is not optional: it is the text alternative to the visual grid and is easier on small screens.

### 5.6 Timetable

- Use Saturday–Wednesday for the current valid parsed data. If parser support for Thursday is implemented and a selected offering contains it, add Thursday dynamically; never silently discard a successfully parsed day.
- Preserve the current five time bands for this delivery, but display exact start/end time within blocks/list rows. Sessions outside supported bands must appear in list/exam review and produce a visible `خارج از بازهٔ جدول` notice rather than disappear.
- Sticky day header and sticky time axis in scroll containers.
- Course blocks show course, section, start–end time, and location; instructor is shown when space permits.
- Conflict regions use a patterned border plus icon/text, not red alone.
- Clicking/focusing a block opens a details popover with remove, locate in results, and section alternatives.
- When empty, retain the existing useful empty state.
- Print view hides controls and prints plan metadata, selected list, weekly schedule, and warnings.

### 5.7 Review & registration summary

`مرور نهایی` opens a full-height mobile sheet / centered desktop dialog:

- status banner: ready or issue count;
- units and selected-course count;
- unresolved issues with direct fix actions;
- selected courses table: course, section, code, instructor, time, exam;
- actions: `چاپ`, `کپی کد گروه‌ها`, `خروجی JSON` (client-side download; selected IDs plus a schema version);
- microcopy: `ثبت نهایی در سامانه گلستان انجام می‌شود.`

Do not claim this app submits registration.

### 5.8 Curriculum

- Keep semester-grouped cards.
- Add a sticky progress summary: `۴۲ از ۱۳۶ واحد · ۳۱٪`.
- Include a compact legend with both glyph and text.
- Replace click-to-cycle as the only mechanism with an explicit status menu: `گذراند‌ه‌ام`, `در حال گذراندن`, `رد شده`, `بدون وضعیت`.
- A short tap/click opens details; status change is a labelled menu action.
- Offered courses provide `دیدن ارائه‌ها`, which switches to discovery with the course pre-filtered.

### 5.9 Optional AI advisor

- Keep the AI floating action visually secondary.
- First open must disclose that displayed academic context may be sent to the configured provider and require explicit consent before network use.
- Deterministic warnings always render before AI commentary.
- Label output `پیشنهاد دستیار` and never use it as the source of plan validity.
- Disabled/unavailable state explains why without repeatedly attempting requests.

## 6. Visual system

### 6.1 Personality

Use a calm academic workspace rather than a neon dashboard: deep ink/navy dark theme, warm paper-like light theme, indigo brand, restrained teal success, amber warning, and red reserved for blocking errors.

### 6.2 Color tokens

Maintain aliases for existing code during migration, but new components use semantic names.

| Token | Light | Dark | Use |
|---|---:|---:|---|
| `--bg-canvas` | `#F4F6FA` | `#08111F` | app background |
| `--bg-surface` | `#FFFFFF` | `#0E1A2B` | primary panels |
| `--bg-subtle` | `#F8FAFC` | `#142238` | nested controls |
| `--bg-elevated` | `#FFFFFF` | `#182A43` | popovers/dialogs |
| `--border-subtle` | `#E2E8F0` | `#263750` | separators |
| `--border-strong` | `#CBD5E1` | `#40516A` | active boundaries |
| `--text-primary` | `#0F172A` | `#F8FAFC` | headings/body |
| `--text-secondary` | `#475569` | `#B7C3D4` | metadata |
| `--text-tertiary` | `#64748B` | `#94A3B8` | non-essential text |
| `--brand` | `#4338CA` | `#818CF8` | text/focus/active |
| `--brand-solid` | `#4F46E5` | `#4F46E5` | primary button |
| `--brand-soft` | `#EEF2FF` | `#1B2454` | selected background |
| `--success` | `#047857` | `#5EEAD4` | success text |
| `--success-soft` | `#ECFDF5` | `#0D332F` | success surface |
| `--warning` | `#92400E` | `#FCD34D` | warning text |
| `--warning-soft` | `#FFFBEB` | `#382A10` | warning surface |
| `--danger` | `#B91C1C` | `#FDA4AF` | error text |
| `--danger-soft` | `#FEF2F2` | `#3B1620` | error surface |

All final pairs must be measured; normal text ≥4.5:1, large text ≥3:1, component boundaries/focus indicators ≥3:1.

Faculty colors are identifiers only. Course blocks use a 4 px faculty-colored inline-start border on a neutral/tinted surface; text always uses semantic text colors.

### 6.3 Typography

Font stack: `Vazirmatn, system-ui, sans-serif`. Self-host WOFF2 if practical; CDN fallback is acceptable under current constraints.

| Role | Size / line | Weight |
|---|---|---|
| Page title | 24 / 36 px | 800 |
| Section title | 18 / 30 px | 700 |
| Card title | 16 / 26 px | 700 |
| Body | 14 / 24 px | 400 |
| Control | 14 / 22 px | 600 |
| Metadata | 12 / 20 px | 500 |

No rendered text below 12 px. Numeric codes use Vazirmatn with `font-variant-numeric: tabular-nums`; do not switch Persian text runs to monospace.

### 6.4 Spacing, shape, elevation

- 4 px base grid: `4, 8, 12, 16, 20, 24, 32, 40`.
- Page gutter: 16 mobile, 24 tablet, 32 desktop.
- Panel radius 16 px; cards 12 px; controls 10 px; pills fully rounded.
- Control height: 40 px desktop, minimum 44 px coarse pointer/mobile.
- Shadows only for overlays/elevated panels:
  - `--shadow-1: 0 1px 2px rgba(15,23,42,.06)`
  - `--shadow-2: 0 12px 32px rgba(2,6,23,.16)`
- Prefer borders and surface contrast over abundant shadows.

### 6.5 Icons

Use a small inline SVG set (Lucide-style 20/24 px, `currentColor`, RTL-safe) for interface actions. Emoji may remain only as empty-state illustration and must be decorative. Every icon-only action has an accessible name and tooltip on hover/focus.

### 6.6 Component states

Every interactive component specifies:

- default;
- hover (fine pointer);
- active;
- focus-visible 2 px ring + 2 px offset;
- disabled with readable label, not opacity below 0.55;
- loading with stable dimensions;
- error when relevant.

Use 120–180 ms transitions on color/opacity/transform. No continuous animation. Honor `prefers-reduced-motion`.

## 7. Exact screen specifications

### 7.1 Student desktop, ≥1024 px

- App header: 64 px, sticky, brand at inline-start; context chips and plan health near center; theme/help at inline-end.
- Content height: viewport minus header. Body does not scroll; each workspace pane owns its scroll.
- At 1280 px and wider, discovery is 44% (min 440 px, max 640 px) and plan consumes the remainder (min 520 px).
- At 1024–1279 px, use a 48/52 split when both pane minimums fit after gutters; otherwise use the tablet-style segmented switch. Content must never force body overflow.
- Search toolbar sticks to pane top.
- Course group list has 12 px gap and 24 px bottom inset.
- Plan status/attention remain above the independently scrolling view content.
- AI button: bottom 24 px, left 24 px in RTL layout; must not cover timetable controls.

### 7.2 Student tablet, 769–1023 px (and any desktop width where pane minimums do not fit)

- Header remains 56 px.
- Use a segmented top switch `دروس | برنامه | چارت`; show one full-width workspace at a time.
- Preserve state and scroll position between views.
- Filters use a sheet; plan views use list as default below 900 px, with weekly grid selectable.

### 7.3 Student mobile, ≤768 px

- Header 52 px; brand text, unit count, and theme/menu only.
- View area ends above a bottom nav of 64 px plus safe-area inset.
- Search toolbar: 16 px padding; 44 px search; filter button 44 px.
- Course group cards use 12 px outer margin.
- Sheets occupy at most `min(88dvh, 720px)`, have a visible drag handle, close button, heading, and focus trap.
- Bottom nav labels never hide; active destination uses icon + text + 3 px indicator.
- When keyboard opens, input/actions remain visible and bottom nav may hide.
- Schedule defaults to list view; weekly grid is horizontally scrollable with sticky axes.

### 7.4 Professor desktop

- Header 64 px.
- One compact filter toolbar, 72–88 px.
- Metrics are four equal selectable cards, maximum 96 px high; active metric has `aria-pressed=true`.
- Workspace: conflict list 420 px at inline-start, timetable fills remainder.
- Conflict list row: severity, course pair, shared time, affected cohort/reason, `نمایش در برنامه`.
- Selecting a row highlights both courses in the grid and reveals explanation.
- At ≤900 px, switch to stacked tabs `تداخل‌ها | برنامه`.

### 7.5 Data editor

- Reuse header, semantic tokens, controls, tabs, dialogs, and toasts.
- Add persistent status: `ذخیره‌شده` / `تغییرات ذخیره‌نشده`.
- Keep tables dense but row controls ≥36 px desktop and ≥44 px touch.
- Sticky table header; horizontal overflow stays inside table container.
- Destructive row actions require confirmation or immediate undo.

## 8. Accessibility requirements

- WCAG 2.2 AA target.
- Exactly one `h1`; hierarchical headings.
- Landmarks: header, nav, main, complementary as appropriate; skip link to main content.
- Real buttons/links/form controls; no clickable `div`.
- Every input has a persistent label or programmatic accessible name; placeholders are examples only.
- Tabs implement arrow keys, Home/End, `aria-selected`, and roving `tabindex`.
- Dialogs/sheets use `aria-modal`, initial focus, focus containment, Escape close, and focus restoration.
- Search results and status updates use restrained `aria-live`; do not announce every keystroke twice.
- Course-group expansion uses `aria-expanded`/`aria-controls`.
- Conflict confirmation identifies the conflicting courses in text.
- Timetable has a synchronized semantic list/table alternative.
- Status never depends on color; use icon, text, and shape.
- Logical CSS properties (`margin-inline`, `border-inline-start`) for all new layout rules.
- Mixed numeric/course-code strings must remain readable under RTL; wrap codes/times in `dir="ltr"` or `<bdi>` where appropriate.
- Pointer target minimum 24×24 CSS px with adequate separation per WCAG; product target is 44×44 for primary/coarse-pointer actions.
- 200% zoom and 400% reflow without loss of functionality.
- Reduced motion and increased text spacing must not break layout.
- Preserve the repository's existing default theme behavior; persist explicit choice. Following system preference is desirable but not required in this delivery because changing the established default is a product decision.

## 9. Content and language

- Tone: concise, reassuring, direct; use conversational Persian consistently.
- Use `درس` for course identity and `گروه` for a section/offer.
- Prefer `تداخل کلاس` and `تداخل امتحان` over generic `خطا`.
- Empty results:
  - title `درسی با این مشخصات پیدا نشد`
  - body `فیلترها را کمتر کن یا نام و کد درس را دوباره بررسی کن.`
  - action `پاک‌کردن فیلترها`
- Network/AI errors never imply planner data is lost.
- Data freshness is visible: `اطلاعات ارائه‌ها: نیم‌سال … · به‌روزرسانی …` when metadata is available.

## 10. Responsive and edge-case behavior

- Long course/instructor names wrap to two lines, then truncate with accessible full text.
- Zero/unknown capacity shows `ظرفیت اعلام نشده`, never a misleading empty bar.
- Missing instructor: `استاد اعلام نشده`.
- Missing schedule/exam: `زمان اعلام نشده` / `تاریخ اعلام نشده`.
- Render the first 30 course groups, with an explicit `نمایش موارد بیشتر` button adding the next 30. The visible count distinguishes groups from offers. Search/filter operates over the full dataset before paging.
- Empty selected plan, one item, maximum normal load, and 30+ selected items must remain usable.
- Offline font failure falls back without layout collapse.
- Local-storage parse/version failure shows recovery guidance and does not white-screen.
- Thursday/variable class durations and courses outside preset grid slots must remain present in the complete list view and final review. If they cannot be placed in the grid, show `خارج از بازهٔ جدول` rather than silently dropping them.

## 11. Implementation order

1. Introduce semantic token aliases, shared shell, SVG icon primitive, and breakpoint model.
2. Build plan health model/view from existing deterministic outputs.
3. Refactor search toolbar and active filters.
4. Group course offerings and implement section replacement/conflict confirmation.
5. Add plan view switch, durable attention queue, and final review.
6. Upgrade curriculum status controls.
7. Apply shared visual/accessibility alignment to professor dashboard and data editor without rewriting their workflows.
8. Complete responsive, keyboard, screen-reader, print, contrast, and visual regression passes.

No generated dataset should be edited. Domain functions remain source of truth; the UI may aggregate and present their results but must not duplicate planning rules.

## 12. Acceptance criteria

### Student flow

- [ ] First visit explains and optionally captures faculty/group/cohort without blocking browsing.
- [ ] Offerings are grouped course-first; expanding reveals comparable sections.
- [ ] Search, filter, sort, active chips, reset, and result count work with keyboard and touch.
- [ ] Adding a safe section provides visible selection state and undo.
- [ ] Adding a conflicting/over-limit section requires an explicit informed choice.
- [ ] Selecting a second section of the same course offers replacement rather than silent duplication.
- [ ] Plan Health persists all unresolved deterministic issues and links to affected courses.
- [ ] Weekly, list, and exam views reflect the same selected state.
- [ ] Final Review lists units, issues, course/section codes, times, and exams; copy/print/export work.
- [ ] The interface never suggests registration was submitted.

### Responsive

- [ ] 320, 375, 768, 1024, and 1440 px screenshots pass in both themes.
- [ ] No page-level horizontal scroll; only timetable/table containers may scroll horizontally.
- [ ] Tablet uses the specified single-workspace switch, not a crushed desktop split.
- [ ] Bottom navigation and sheet actions respect safe areas and virtual keyboard.
- [ ] Scroll position and selected state persist when changing mobile/tablet destinations.

### Accessibility

- [ ] If an executable browser audit is available, axe/Lighthouse has no critical/serious violations; otherwise document the tooling limitation and complete the specified keyboard/semantic manual checks.
- [ ] Full primary flows pass keyboard-only operation.
- [ ] VoiceOver or NVDA smoke test confirms result expansion, selection, conflict confirmation, Plan Health, and dialog announcements.
- [ ] All measured text/component/focus contrasts meet WCAG 2.2 AA.
- [ ] 200% zoom and 400% reflow pass without clipped actions.
- [ ] Reduced-motion mode has no continuous or spatially disorienting animation.
- [ ] The list view provides complete timetable information without visual-grid interpretation.

### Professor/editor (alignment scope)

- [ ] Both pages use the semantic tokens, shared focus treatment, coherent headers/controls, and accessible names for touched icon actions.
- [ ] Professor page retains its deterministic filters/report and stacks cleanly below 900 px.
- [ ] Editor tables contain their own horizontal overflow and retain keyboard-operable controls.
- [ ] Existing professor/editor workflows do not regress.

### Engineering quality

- [ ] Existing domain, backend, pipeline, lint, and frontend tests pass.
- [ ] New grouping, replacement, filter, Plan Health, and persistence logic has unit tests.
- [ ] No hand-edited files under `apps/web/generated/`.
- [ ] No new framework/build dependency is required.
- [ ] A visual QA matrix is documented for both themes and all target breakpoints.

## 13. Decisions and tradeoffs for review

1. **Course-first grouping is the largest behavior change.** It matches the student's mental model and materially improves comparison, but needs reliable normalization/grouping of offering IDs.
2. **Conflicts remain overridable.** University realities may require temporary invalid plans; blocking them outright would remove user agency. The override must be deliberate and permanently visible.
3. **Tablet gets its own mode.** This adds CSS/interaction work but prevents a narrow, unusable two-pane compromise.
4. **The timetable is no longer the only plan representation.** Maintaining list and grid views costs more, but unlocks mobile usability, accessibility, and print clarity.
5. **SVG replaces most emoji.** This is a contained visual consistency investment, not an external icon framework.
6. **AI stays secondary.** The planner's deterministic checks are the trusted layer; AI cannot alter readiness status.
7. **Light and dark remain first-class.** Implementation must test both rather than treating light mode as an override afterthought.
8. **Approval is scoped.** The student planner redesign and cross-page visual alignment are approved. The deeper professor/editor interaction concepts in section 7 are directional follow-up, not part of this implementation acceptance gate.
