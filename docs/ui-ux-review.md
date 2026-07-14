# UI/UX Design Review — انتخاب واحد هوشمند

**Reviewer:** UI/UX Review Agent  
**Date:** 2026-07-03  
**Artifact reviewed:** `docs/ui-ux-design.md` plus the current HTML, CSS, page controllers, domain modules, storage adapter, generated offering shape, and frontend test setup  
**Verdict:** **Approved for implementation with corrections incorporated into the authoritative design spec**

## Review summary

The “planning cockpit” direction is correct. It fixes the most consequential mismatch in the current UI: students choose a course and then a section, while the current results present every section as an independent full card. The proposal also correctly promotes persistent plan validity over transient toast messages and adds a textual schedule representation needed for mobile and accessibility.

The original proposal was not implementation-ready. It combined a substantial student planner redesign with full professor and editor workflow redesigns, required filters and timetable behavior beyond the current domain model, and left grouping identity ambiguous. Approval was therefore conditional on resolving scope, data contracts, responsive thresholds, and risk behavior in the spec itself. Those corrections are now applied.

## Repository evidence

- The site is static vanilla HTML/CSS/JS with no production build step; `package.json` supplies ESLint and Node domain tests only.
- Offerings expose `id`, `name`, `faculty`, `group`, `units`, `capacity`, `enrolled`, `gender`, `prof`, `time_html`, and `exam_text`. They do not expose semester freshness metadata.
- IDs currently follow a useful `base_section` pattern such as `1110002_01`; grouping can use the final suffix safely with a documented fallback.
- Selection persistence stores complete offering IDs in a set. Replacement can preserve this storage format.
- Existing deterministic helpers cover text normalization, parsed meetings/exams, overlaps, unit totals/caps, curriculum status, and professor conflict rules.
- The current schedule maps meetings into five coarse weekday/time slots. Exact times are parsed, but Thursday and arbitrary visual placement are not currently supported.
- Current results silently stop at 100 offers and ask users to refine search. Explicit incremental group paging is feasible without dependencies.
- Dialog helpers restore focus but do not currently contain focus; new confirmation/review dialogs need a complete dialog pattern.

## Findings and resolutions

| Area | Finding | Resolution incorporated |
|---|---|---|
| Scope | Rebuilding student, professor, and editor workflows together creates a high regression risk and is unlikely to receive adequate QA. | Student planner is the required redesign. Professor/editor receive shared visual and accessibility alignment; deeper workflow concepts are deferred. |
| Group identity | “Normalized course code/name” could merge unrelated offerings or split valid sections. | Strip only the terminal section suffix from ID; use a faculty-aware fallback. Never merge solely by display name. |
| Filters | Time-range filtering was specified although the current grid/domain discretizes meetings. | Removed from required delivery. Day, units, gender, availability, and clash filtering remain feasible. |
| Capacity | `capacity=0` may mean unknown, not full. | Preserve explicit `ظرفیت اعلام نشده`; availability filtering must not treat unknown as available or full. |
| Risk confirmation | Separate conflict and unit dialogs could stack; original mutation timing was not explicit. | Evaluate all risks before mutation and show one combined confirmation. Safe additions remain immediate. |
| Replacement | Multiple sections of one base course currently have no supported user value. | Make second selection an explicit replacement while retaining the selected-ID storage schema. |
| Prerequisites | The app cannot infer prerequisite validity for every offering. | Show prerequisite health only when active curriculum/cohort mapping resolves it; otherwise omit, never guess. |
| Timetable | Dynamic Thursday/time-range requirements exceeded current parser/grid behavior and could hide data. | Current grid may retain five bands/days; exact times appear in text. Successfully parsed extra days must be dynamic, while unsupported sessions get an explicit list warning. |
| Responsive | Fixed pane minimums can exceed available content width around 1024 px. | Use split only when minimums fit; otherwise use the tablet segmented workspace. |
| Result volume | Virtualization adds unnecessary complexity in a no-framework DOM app. | Page course groups in explicit batches of 30 after full-data filter/sort. |
| Theme | “Follow system on first visit” changes established dark-default product behavior. | Preserve current default and persistence; system-following is optional rather than acceptance-critical. |
| Exports | “JSON export” lacked a contract. | Export selected IDs with a schema version through a client-side download; no registration claim. |
| Accessibility | Proposal correctly required dialogs, tabs, live status, list alternative, focus visibility, and RTL isolation, but did not distinguish existing partial dialog support. | Implementation must add focus containment and avoid nested interactive controls in course cards. Group headers and section actions are separate real buttons. |
| Testability | Acceptance criteria mixed aspirational manual testing with unavailable browser automation. | Domain logic must receive Node tests; manual viewport/theme/keyboard checks must be documented. Automated axe is required only if an executable browser audit is available in the implementation environment. |

## Decisions accepted

- Course-first result grouping.
- Persistent Plan Health with class, exam, and unit findings.
- Deliberate but allowed conflict/over-cap override.
- Separate weekly, list, and exam representations sharing one selection state.
- Tablet/mobile single-workspace navigation.
- Final review with copy, print, and local JSON export.
- Semantic colors, restrained surfaces, SVG action icons, and preserved Persian RTL typography.
- Deterministic domain checks remain authoritative; AI remains optional and secondary.

## Decisions rejected or deferred

- A full professor-dashboard interaction rewrite in the same delivery.
- Editor-wide dirty tracking/undo in the same delivery.
- Time-range filtering before domain/grid support is upgraded.
- Virtualized rendering; incremental group paging is simpler and testable.
- Inferred semester freshness when no metadata exists.
- Universal prerequisite warnings without an active resolvable curriculum.
- Changing the product’s initial theme behavior as part of this redesign.

## Required implementation notes

1. Put grouping, risk aggregation, and plan-health derivation in pure domain functions and test them with Node; do not bury policy in DOM rendering.
2. Keep generated files untouched.
3. Preserve storage compatibility. New preferences need namespaced keys and safe defaults.
4. Escape all dataset strings inserted into markup. Prefer DOM construction for interactive rows.
5. Do not make a whole course card a button containing section buttons; that creates invalid nested controls.
6. Announce result totals after debounced updates, not on every raw keystroke.
7. Ensure override confirmations describe every affected course and restore focus to the initiating action.
8. Treat unknown capacity, instructor, schedule, and exam data explicitly.
9. Validate at 320, 375, 768, 1024, and 1440 CSS px in both themes. Where browser automation is unavailable, record a manual/static verification limitation honestly.

## Risks remaining

- Generated IDs appear consistent, but the fallback grouping path must be tested against malformed or suffix-less IDs.
- The large offering set makes repeated full overlap calculation potentially expensive; compute selected sessions once per render and page only after filtering/grouping.
- Existing page-level inline CSS makes shared-system migration prone to specificity conflicts.
- The current coarse timetable cannot represent arbitrary durations spatially; the list view is the complete accessible source until a future grid upgrade.
- Browser and assistive-technology verification may depend on tooling not installed in the repository.

## Approval

The corrected `docs/ui-ux-design.md` is the final authoritative specification for implementation. Approval covers the required student-planner redesign and cross-page visual/accessibility alignment defined in its Delivery Boundary. Deferred concepts are not acceptance blockers and should not be implemented at the expense of correctness, accessibility, or regression coverage in the approved scope.
