'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('application version is visible in the shell and print footer', () => {
    const html = read('apps/web/index.html');
    assert.match(html, /name="application-version" content="0\.1\.0"/);
    assert.match(html, /class="app-version"[^>]*>v0\.1\.0<\/small>/);
    assert.match(html, /entekhab-vahed · v0\.1\.0/);
});

test('about dialog documents project purpose, privacy, license, and source', () => {
    const html = read('apps/web/index.html');
    assert.match(html, /id="aboutModal"/);
    assert.match(html, /پروژهٔ کارشناسی/);
    assert.match(html, /localStorage/);
    assert.match(html, /GNU GPLv3/);
    assert.match(html, /https:\/\/github\.com\/VRUCS\/course-planner/);
    assert.match(html, /href="https:\/\/github\.com\/VRUCS\/course-planner\/issues" target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /گزارش خطا یا پیشنهاد/);
    assert.match(html, /قابلیت اختیاری دستیار هوشمند/);
});

test('course search and sidebar filters retain usable form sizing', () => {
    const html = read('apps/web/index.html');
    const css = read('apps/web/styles/main.css');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    const storage = read('apps/web/scripts/adapters/planner-storage.js');
    assert.match(css, /input\[type=search\]/);
    assert.match(css, /\.search-wrapper \{ position: relative; width: 100%; \}/);
    assert.match(css, /\[hidden\] \{ display: none !important; \}/);
    assert.match(css, /\.sidebar \.section-action\{grid-column:1\/-1;justify-content:stretch\}/);
    assert.match(html, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.filter-row \.filter-toggle \{ grid-column: 1 \/ -1;/);
    assert.match(html, /class="search-wrapper" role="search"/);
    assert.match(controller, /if \(group\.sections\.length === 1\)/);
    assert.match(controller, /class="single-course-facts"/);
    assert.match(controller, /<dt>استاد<\/dt>/);
    assert.match(controller, /<dt>زمان کلاس<\/dt>/);
    assert.match(controller, /افزودن به برنامه/);
    assert.match(storage, /searchFaculty: 'uni_search_faculty'/);
    assert.match(storage, /searchGroup: 'uni_search_group'/);
    assert.match(controller, /function saveSearchFilters\(\)/);
    assert.match(controller, /stateRepository\.setPreference\('searchFaculty'/);
    assert.match(controller, /stateRepository\.setPreference\('faculty', faculty\)/);
    assert.doesNotMatch(controller, /facultyFilter'\)\.value = faculty/);
});

test('tablet navigation shares the 1100px workspace breakpoint in JS and CSS', () => {
    const controller = read('apps/web/scripts/pages/student-planner.js');
    const css = read('apps/web/styles/main.css');
    assert.match(controller, /window\.innerWidth <= 1100/);
    assert.match(css, /min-width:769px\) and \(max-width:1100px/);
    assert.match(css, /\.sidebar, \.main \{ width:100% !important/);
});

test('mobile navigation synchronizes tabs without replacing the global tab handler', () => {
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(controller, /function syncMobileNavigation\(view\)/);
    assert.doesNotMatch(controller, /window\.switchTab\s*=\s*\(/);
    assert.match(controller, /if \(view === 'search' \|\| view === 'curriculum'\) \{/);
});

test('student tablists expose complete tab relationships and keyboard enhancement', () => {
    const html = read('apps/web/index.html');
    const ui = read('apps/web/scripts/features/ui.js');
    assert.match(html, /id="mnSchedule" role="tab" aria-selected="false" tabindex="-1" aria-controls="weeklyView"/);
    assert.match(html, /aria-controls="weeklyView"/);
    ['weeklyView', 'listView', 'examsView'].forEach(id => {
        assert.match(html, new RegExp(`id="${id}"[^>]*role="tabpanel"`));
    });
    ['ArrowRight', 'ArrowLeft', 'Home', 'End'].forEach(key => assert.match(ui, new RegExp(key)));
});

test('curriculum identity and entry year come from the profile context', () => {
    const html = read('apps/web/index.html');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(html, /id="curriculumControls"[^>]*><\/div>/);
    assert.doesNotMatch(html, /id="cohortSelect"/);
    assert.match(controller, /cur-profile-context/);
    assert.match(controller, /cohort: stateRepository\.getPreference\('cohort'\)/);
    assert.match(controller, /ورودی انتخاب نشده/);
});

test('planner hierarchy keeps the next action and current status visible', () => {
    const html = read('apps/web/index.html');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    const css = read('apps/web/styles/main.css');
    assert.match(html, /class="workflow-hint"/);
    assert.match(html, /class="plan-status-content"/);
    assert.match(html, /id="healthPill" role="status"/);
    assert.match(controller, /function focusCourseSearch()/);
    assert.match(controller, /onclick="focusCourseSearch\(\)"/);
    assert.match(controller, /class="empty-state-card"/);
    assert.match(css, /\.empty-state-card \{/);
    assert.match(css, /\.plan-status-actions \{/);
    assert.match(html, /class="plan-status-context"/);
    assert.match(html, /id="unitDisplayPlan"/);
    assert.match(html, /id="planGpaValue"/);
    assert.match(controller, /\['', 'Sheet', 'Plan'\]/);
});

test('undo toast action has independent sizing from the icon-only close button', () => {
    const css = read('apps/web/styles/main.css');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(controller, /undo\.type = 'button'; undo\.className = 'toast-action'/);
    assert.match(css, /\.toast-action \{/);
    assert.match(css, /\.toast-action \.icon \{ width: 15px; height: 15px; \}/);
    assert.match(css, /white-space: nowrap; position: relative;/);
});

test('shared programmatic tab selection synchronizes aria-selected and roving tabindex', () => {
    const ui = read('apps/web/scripts/features/ui.js');
    const source = ui.match(/function selectTab\(tab\) \{[\s\S]*?\n\}/)?.[0];
    assert.ok(source, 'selectTab implementation must remain directly testable');
    const select = new Function(`${source}; return selectTab;`)();
    const attributes = new Map();
    const makeTab = name => ({
        name,
        tabIndex: -1,
        setAttribute(key, value) { attributes.set(`${name}:${key}`, value); },
        closest() { return tablist; },
    });
    const first = makeTab('first');
    const second = makeTab('second');
    const tablist = { querySelectorAll: () => [first, second] };

    select(second);
    assert.equal(attributes.get('first:aria-selected'), 'false');
    assert.equal(attributes.get('second:aria-selected'), 'true');
    assert.equal(first.tabIndex, -1);
    assert.equal(second.tabIndex, 0);
});

test('plan UI exposes corrective actions and unsupported-session warning', () => {
    const html = read('apps/web/index.html');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(html, /id="scheduleWarning"/);
    assert.match(controller, /data-review-issue/);
    assert.match(controller, /focusPlanIssue/);
    assert.match(controller, /view === 'exams' \? 'examsView' : 'listView'/);
    assert.match(controller, /id="examListFocus" tabindex="-1"/);
    assert.match(controller, /id="planListFocus" tabindex="-1"/);
    assert.match(controller, /selectTab\(activeTab\)/);
    assert.match(controller, /خارج از بازهٔ جدول/);
    assert.match(controller, /formatSessionChip\(session\)/);
    assert.match(controller, /session\.slot === null/);
});

test('storage and data-driven actions cannot break startup or become inline script injection', () => {
    const storage = read('apps/web/scripts/adapters/planner-storage.js');
    const theme = read('apps/web/scripts/features/ui.js');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(storage, /createMemoryStorage/);
    assert.match(theme, /getThemeStorage/);
    assert.match(controller, /browserStorage = \(\(\) => \{/);
    assert.doesNotMatch(controller, /onclick="removeCourse\('\$\{SafeDOM\.escape\(course\.id\)\}\)/);
});

test('schedule print uses a dedicated A4 landscape document view', () => {
    const html = read('apps/web/index.html');
    const css = read('apps/web/styles/main.css');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(html, /class="print-header"/);
    assert.match(html, /id="printTimetable"/);
    assert.match(html, /onclick="printSchedule\(\)"/);
    assert.match(css, /@page \{ size: A4 landscape;/);
    assert.match(css, /font-family: 'Vazirmatn', Tahoma, sans-serif !important/);
    assert.match(css, /color-scheme: light !important/);
    assert.match(css, /\.main \{[\s\S]*?background: #fff !important; color: #172033 !important;/);
    assert.match(css, /--print-accent: #57d4ce/);
    assert.match(css, /\.print-class-time/);
    assert.match(controller, /function printSchedule\(\)/);
    assert.match(controller, /function renderPrintTimetable\(\)/);
    assert.match(controller, /session\.endMinutes - session\.startMinutes/);
    assert.match(controller, /window\.addEventListener\('afterprint'/);
});

test('responsive secondary actions have a mobile action sheet', () => {
    const html = read('apps/web/index.html');
    const controller = read('apps/web/scripts/pages/student-planner.js');
    assert.match(html, /id="mobMoreBtn"/);
    assert.match(html, /id="mobileActionsModal"/);
    assert.match(html, /runMobileAction\('calendar'\)/);
    assert.match(html, /href="professor\.html"/);
    assert.match(controller, /function openMobileActions\(\)/);
    assert.match(controller, /function runMobileAction\(action\)/);
});

test('professor dashboard has a skip link, main landmark, and width-safe conflict panel', () => {
    const html = read('apps/web/professor.html');
    assert.match(html, /class="skip-link" href="#professorMain"/);
    assert.match(html, /<main id="professorMain" class="professor-main">/);
    assert.match(html, /class="professor-brand-icon"/);
    assert.match(html, /class="summary-card-header"/);
    assert.match(html, /@media \(max-width: 1180px\)[\s\S]*?\.professor-layout \{ grid-template-columns: 1fr; overflow-y: auto; \}/);
    assert.match(html, /timetable-scroll-hint/);
});

test('action colors and compact controls have accessible contrast and targets', () => {
    const css = read('apps/web/styles/main.css');
    assert.match(css, /--blue:\s+#2563eb/);
    assert.match(css, /--green:\s+#047857/);
    assert.match(css, /--red:\s+#b91c1c/);
    assert.match(css, /\.btn-sm\s+\{ min-height: 36px/);
    assert.match(css, /outline: 3px solid var\(--accent\)/);
});

test('extension escapes page-provided labels before inserting popup markup', () => {
    const source = read('apps/extension/popup.js');
    const escapeSource = source.match(/function escapeHtml\(value\) \{[\s\S]*?\n\}/)?.[0];
    assert.ok(escapeSource, 'escapeHtml helper must remain directly testable');
    const escapeHtml = new Function(`${escapeSource}; return escapeHtml;`)();
    assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
    assert.match(source, /\$\{escapeHtml\(faculty \|\| '—'\)\}/);
    assert.match(source, /\$\{escapeHtml\(group \|\| '—'\)\}/);
});
