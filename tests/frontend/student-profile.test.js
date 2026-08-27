'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'apps/web/index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'apps/web/scripts/pages/student-planner.js'), 'utf8');

test('student profile is an accessible local-only academic context dialog', () => {
    assert.match(html, /id="profileBtn"[^>]+aria-haspopup="dialog"/);
    assert.match(html, /id="studentProfileModal"/);
    assert.match(html, /role="dialog" aria-modal="true"/);
    assert.match(html, /id="profileFaculty" required/);
    assert.match(html, /id="profileGroup" required/);
    assert.match(html, /id="profileCohort"/);
    assert.match(html, /id="profileGpa"[^>]+min="0" max="20"/);
    assert.match(html, /فقط در مرورگر همین دستگاه ذخیره می‌شود/);
    assert.match(html, /شماره دانشجویی یا اطلاعات هویتی دریافت نمی‌کنیم/);
});

test('profile stays separate from catalog search filters and offers honest curriculum routing', () => {
    for (const preference of ['faculty', 'group', 'cohort', 'gpa']) {
        assert.match(script, new RegExp(`setPreference\\('${preference}'`));
    }
    assert.match(script, /function saveSearchFilters\(\)/);
    assert.match(script, /setPreference\('searchFaculty'/);
    assert.doesNotMatch(script, /document\.getElementById\('facultyFilter'\)\.value = faculty/);
    assert.doesNotMatch(script, /document\.getElementById\('groupFilter'\)\.value = group/);
    assert.match(script, /curriculumDataNotice\(curriculum, selectedCohort\)/);
    assert.match(script, /فعلاً نقشه درسی این رشته در داده‌های پروژه موجود نیست/);
    assert.match(script, /function getCurriculumCoverage\(curriculum, cohort = ''\)/);
    assert.match(script, /منبع رسمی این نقشه در داده‌های پروژه ثبت نشده است/);
    assert.match(script, /کد تطبیق ثبت نشده/);
    assert.match(script, /function deleteStudentProfile\(\)/);
});

test('curriculum is derived from the saved academic profile, not temporary search filters', () => {
    const currentCurriculum = script.match(/function getCurrentCurriculum\(\) \{[\s\S]*?\n\}/)?.[0];
    const renderCurriculum = script.match(/function renderCurriculumTab\(\) \{[\s\S]*?\n\}/)?.[0];
    assert.ok(currentCurriculum, 'curriculum lookup must remain directly testable');
    assert.ok(renderCurriculum, 'curriculum renderer must remain directly testable');
    assert.match(currentCurriculum, /getAcademicProfile\(\)/);
    assert.doesNotMatch(currentCurriculum, /facultyFilter|groupFilter/);
    assert.match(renderCurriculum, /getAcademicProfile\(\)/);
    assert.doesNotMatch(renderCurriculum, /facultyFilter|groupFilter/);
    assert.match(script, /برای نمایش نقشه درسی، رشته‌ات را در پروفایل تحصیلی انتخاب کن/);
    assert.match(script, /cohort: stateRepository\.getPreference\('cohort'\)/);
    assert.doesNotMatch(renderCurriculum, /cohortSelect|onCohortChange/);
});
