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
    assert.match(html, /https:\/\/github\.com\/VRUCS\/entekhab-vahed/);
    assert.match(html, /href="https:\/\/github\.com\/VRUCS\/entekhab-vahed\/issues" target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /گزارش خطا یا پیشنهاد/);
    assert.match(html, /قابلیت اختیاری دستیار هوشمند/);
});

test('course search and sidebar filters retain usable form sizing', () => {
    const html = read('apps/web/index.html');
    const css = read('apps/web/styles/main.css');
    const controller = read('apps/web/scripts/pages/student-planner.js');
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
});

test('tablet navigation shares the 1100px workspace breakpoint in JS and CSS', () => {
    const controller = read('apps/web/scripts/pages/student-planner.js');
    const css = read('apps/web/styles/main.css');
    assert.match(controller, /window\.innerWidth <= 1100/);
    assert.match(css, /min-width:769px\) and \(max-width:1100px/);
    assert.match(css, /\.sidebar, \.main \{ width:100% !important/);
});

test('student tablists expose complete tab relationships and keyboard enhancement', () => {
    const html = read('apps/web/index.html');
    const ui = read('apps/web/scripts/features/ui.js');
    assert.match(html, /id="mnSchedule" role="tab" aria-selected="false" tabindex="-1" aria-controls="mainContent"/);
    assert.match(html, /aria-controls="weeklyView"/);
    ['ArrowRight', 'ArrowLeft', 'Home', 'End'].forEach(key => assert.match(ui, new RegExp(key)));
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
