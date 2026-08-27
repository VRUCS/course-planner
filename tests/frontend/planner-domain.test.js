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
        times: ['شنبه 08:00–09:30 ↔ 09:00–10:30'],
    }]);
});

test('offerings group by terminal section suffix without merging fallback identities', () => {
    const grouped = planner.groupCourses([
        ...courses,
        { ...courses[0], id: 'CS101_02', prof: 'اکبری' },
        { ...courses[0], id: 'legacy', faculty: 'علوم' },
        { ...courses[0], id: 'legacy', faculty: 'فنی' },
    ]);
    assert.equal(grouped.find(group => group.baseId === 'CS101').sections.length, 2);
    assert.equal(grouped.filter(group => group.baseId.includes('|')).length, 2);
    assert.equal(planner.getSectionId({ id: 'CS101_02' }), '02');
});

test('advanced filters preserve unknown capacity semantics and evaluate clashes', () => {
    const catalog = [
        ...courses,
        { ...courses[2], id: 'M102_01', capacity: 0, enrolled: 0 },
        { ...courses[2], id: 'M103_01', capacity: 20, enrolled: 10 },
    ];
    assert.deepEqual(planner.filterCourses(catalog, { availableOnly: true }).map(c => c.id), ['M103_01']);
    assert.deepEqual(planner.filterCourses(catalog, {
        conflictFreeOnly: true,
        selectedCourses: [courses[0]],
    }).map(c => c.id), ['M101_01', 'M102_01', 'M103_01']);
});

test('addition risks and durable plan health aggregate every deterministic issue', () => {
    const selected = new Set(['CS101_01']);
    const risks = planner.deriveAdditionRisks(courses[1], selected, courses, 5);
    assert.deepEqual(risks.classConflicts.map(c => c.id), ['CS101_01']);
    assert.deepEqual(risks.examConflicts.map(c => c.id), ['CS101_01']);
    assert.deepEqual(risks.unitOverflow, { projectedUnits: 6, maxUnits: 5 });

    const health = planner.derivePlanHealth(new Set(['CS101_01', 'CS102_01']), courses, 5);
    assert.equal(health.ready, false);
    assert.deepEqual(health.issues.map(issue => issue.type), ['class', 'exam', 'units']);
});

test('replacement planning excludes the removed section and preserves atomic before/after state', () => {
    const replacement = {
        ...courses[0],
        id: 'CS101_02',
        units: 4,
        time_html: 'دوشنبه 13:00 - 15:00',
        exam_text: 'امتحان(1405.03.25) ساعت : 10:00-12:00',
    };
    const catalog = [...courses, replacement];
    const selected = new Set(['CS101_01', 'M101_01']);
    const change = planner.planSelectionChange(replacement, selected, catalog, 7, 'CS101_01');

    assert.deepEqual(change.risks.classConflicts, []);
    assert.deepEqual(change.risks.examConflicts, []);
    assert.equal(change.risks.unitOverflow, null);
    assert.deepEqual([...change.before], ['CS101_01', 'M101_01']);
    assert.deepEqual([...change.after], ['M101_01', 'CS101_02']);

    const lowerCap = planner.planSelectionChange(replacement, selected, catalog, 6, 'CS101_01');
    assert.deepEqual(lowerCap.risks.unitOverflow, { projectedUnits: 7, maxUnits: 6 });
});

test('timetable retains exact section/time metadata for unplaceable sessions', () => {
    const thursday = {
        ...courses[0],
        id: 'CS103_03',
        time_html: 'پنجشنبه 06:00 - 07:00',
    };
    const timetable = planner.buildTimetable([thursday], new Set([thursday.id]));
    assert.deepEqual(timetable['5-null'][0], {
        id: 'CS103_03',
        name: 'برنامه‌نویسی',
        prof: 'احمدی',
        faculty: 'فنی',
        isTA: false,
        location: '',
        section: '03',
        startMinutes: 360,
        endMinutes: 420,
        day: 5,
        slot: null,
    });
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
