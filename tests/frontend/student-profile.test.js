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

test('profile applies shared preferences to catalog and offers honest curriculum routing', () => {
    for (const preference of ['faculty', 'group', 'cohort', 'gpa']) {
        assert.match(script, new RegExp(`setPreference\\('${preference}'`));
    }
    assert.match(script, /document\.getElementById\('facultyFilter'\)\.value = faculty/);
    assert.match(script, /document\.getElementById\('groupFilter'\)\.value = group/);
    assert.match(script, /نقشه درسی این رشته موجود است/);
    assert.match(script, /فعلاً نقشه درسی این رشته در داده‌های پروژه موجود نیست/);
    assert.match(script, /function deleteStudentProfile\(\)/);
});
