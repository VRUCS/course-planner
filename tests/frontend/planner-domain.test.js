'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const planner = require('../../apps/web/scripts/domain/planner-domain.js');

const courses = [
    {
        id: 'CS101_01', name: 'برنامه‌نویسی', prof: 'احمدی', faculty: 'فنی',
        group: 'کامپیوتر', units: 3,
        time_html: 'شنبه 08:00 - 09:30', exam_text: 'امتحان(1405.03.21) ساعت : 10:00-12:00',
    },
    {
        id: 'CS102_01', name: 'ساختمان داده', prof: 'رضایی', faculty: 'فنی',
        group: 'کامپیوتر', units: 3,
        time_html: 'شنبه 09:00 - 10:30', exam_text: 'امتحان(1405.03.21) ساعت : 11:00-13:00',
    },
    {
        id: 'M101_01', name: 'ریاضی عمومی', prof: 'کاظمی', faculty: 'علوم',
        group: 'ریاضی', units: 3, time_html: 'دوشنبه 10:00 - 12:00', exam_text: '',
    },
];

test('catalog queries normalize Persian text and respect hierarchy', () => {
    assert.deepEqual(planner.getFaculties(courses), ['علوم', 'فنی']);
    assert.deepEqual(planner.getGroups(courses, 'فنی'), ['کامپیوتر']);
    assert.deepEqual(
        planner.filterCourses(courses, { term: 'برنامه نویسی', faculty: 'فنی' }).map(course => course.id),
        ['CS101_01'],
    );
    assert.deepEqual(planner.filterCourses(courses, { term: 'رضایی' }).map(course => course.id), ['CS102_01']);
});

test('planner derives timetable and exam conflicts without DOM access', () => {
    const selected = new Set(['CS101_01', 'CS102_01']);
    assert.equal(planner.buildTimetable(courses, selected)['0-08'].length, 2);
    assert.equal(planner.findExamClash(courses[1], selected, courses)?.id, 'CS101_01');
    assert.deepEqual(planner.detectPairConflicts('CS101', 'CS102', courses), [{
        secA: 'CS101_01',
        secB: 'CS102_01',
        times: ['شنبه 08:00'],
    }]);
});

test('curriculum status and AI context are derived from explicit inputs', () => {
    const curriculum = {
        courses: [
            { id: 'intro', name: 'مبانی', codes: { '*': 'CS101' }, prereqs: [] },
            { id: 'data', name: 'ساختمان', codes: { '*': 'CS102' }, prereqs: ['intro'] },
        ],
    };
    const input = {
        selectedIds: new Set(),
        passedIds: new Set(),
        failedIds: new Set(),
        cohort: '۱۴۰۲',
    };
    assert.equal(planner.getCurriculumStatus('data', curriculum, input), 'locked');
    input.passedIds.add('intro');
    assert.equal(planner.getCurriculumStatus('data', curriculum, input), 'available');
    input.selectedIds.add('CS102_01');
    assert.equal(planner.getCurriculumStatus('data', curriculum, input), 'taking');

    curriculum.courses[1].codes = { '۱۴۰۱': 'OLD102', '۱۴۰۲': 'CS102' };
    input.selectedIds = new Set(['OLD102_01']);
    assert.equal(planner.getCurriculumStatus('data', curriculum, input), 'available');

    const context = planner.buildStudentContext({
        faculty: 'فنی',
        group: 'کامپیوتر',
        cohort: '۱۴۰۲',
        curriculum,
        passedIds: ['intro'],
        selectedIds: ['CS102_01'],
        courses,
    });
    assert.match(context, /رشته: کامپیوتر/);
    assert.match(context, /پاس‌شده: مبانی/);
    assert.match(context, /انتخابی این ترم: ساختمان داده/);
});
