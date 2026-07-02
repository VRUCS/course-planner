/**
 * Framework-neutral application services for the course planner.
 *
 * This module deliberately has no DOM, storage, or network access. Keeping
 * policy here makes the browser controllers thin and permits direct Node tests.
 */
(function initPlannerDomain(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(module.require('./course-domain.js'));
    } else if (root) {
        root.PlannerDomain = factory(root.CourseDomain);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildPlannerDomain(CourseDomain) {
    'use strict';

    if (!CourseDomain) throw new Error('PlannerDomain requires CourseDomain');

    function uniqueSorted(values) {
        return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fa'));
    }

    function getFaculties(courses) {
        return uniqueSorted(courses.map(course => course.faculty));
    }

    function getGroups(courses, faculty = '') {
        return uniqueSorted(courses
            .filter(course => !faculty || course.faculty === faculty)
            .map(course => course.group));
    }

    function filterCourses(courses, { term = '', faculty = '', group = '' } = {}) {
        const query = CourseDomain.normalizeText(term).toLocaleLowerCase('fa');
        return courses.filter(course => {
            if (faculty && course.faculty !== faculty) return false;
            if (group && course.group !== group) return false;
            if (!query) return true;
            return [course.name, course.id, course.prof]
                .some(value => CourseDomain.normalizeText(value).toLocaleLowerCase('fa').includes(query));
        });
    }

    function findCourse(courses, id) {
        return courses.find(course => course.id === id) || null;
    }

    function findExamClash(course, selectedIds, courses) {
        const exam = CourseDomain.parseExam(course?.exam_text);
        if (!exam) return null;
        for (const id of selectedIds) {
            if (id === course.id) continue;
            const other = findCourse(courses, id);
            if (other && CourseDomain.examsOverlap(exam, CourseDomain.parseExam(other.exam_text))) {
                return other;
            }
        }
        return null;
    }

    function buildTimetable(courses, selectedIds) {
        const slots = {};
        for (const id of selectedIds) {
            const course = findCourse(courses, id);
            if (!course) continue;
            for (const session of CourseDomain.parseSchedule(course.time_html)) {
                const key = `${session.day}-${session.slot}`;
                (slots[key] ??= []).push({
                    id: course.id,
                    name: course.name,
                    prof: course.prof,
                    faculty: course.faculty,
                    isTA: session.isTA,
                    location: session.location,
                });
            }
        }
        return slots;
    }

    function detectPairConflicts(baseA, baseB, groupCourses) {
        const sectionsA = groupCourses.filter(course => course.id.startsWith(`${baseA}_`));
        const sectionsB = groupCourses.filter(course => course.id.startsWith(`${baseB}_`));
        const conflicts = [];

        for (const sectionA of sectionsA) {
            const sessionsA = CourseDomain.parseSchedule(sectionA.time_html);
            for (const sectionB of sectionsB) {
                const sessionsB = CourseDomain.parseSchedule(sectionB.time_html);
                if (!CourseDomain.sessionsOverlap(sessionsA, sessionsB)) continue;
                const times = sessionsA
                    .filter(a => sessionsB.some(b => a.day === b.day
                        && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes))
                    .map(session => `${CourseDomain.DAY_NAMES[session.day]} ${session.slot}:00`);
                conflicts.push({ secA: sectionA.id, secB: sectionB.id, times });
            }
        }
        return conflicts;
    }

    function evaluateConflictRules(groupCourses, ruleset, filterType = 'all') {
        const conflicts = [];
        const append = (type, rule) => {
            const overlaps = detectPairConflicts(rule.a, rule.b, groupCourses);
            if (overlaps.length) conflicts.push({ type, rule, overlaps });
        };
        if (filterType !== 'soft') (ruleset?.mustNotConflict || []).forEach(rule => append('hard', rule));
        if (filterType !== 'hard') (ruleset?.shouldNotConflict || []).forEach(rule => append('soft', rule));
        return conflicts;
    }

    function getCurriculumStatus(courseId, curriculum, {
        selectedIds,
        passedIds,
        failedIds,
        cohort = '',
    }) {
        const course = curriculum.courses.find(item => item.id === courseId);
        if (!course) return 'locked';
        const activeCode = course.codes?.[cohort] || course.codes?.['*'];
        if (activeCode && [...selectedIds].some(id => id.startsWith(`${activeCode}_`))) return 'taking';
        if (passedIds.has(courseId)) return 'passed';
        if (failedIds.has(courseId)) return 'failed';
        return (course.prereqs || []).every(id => passedIds.has(id)) ? 'available' : 'locked';
    }

    function buildStudentContext({
        faculty = '',
        group = '',
        cohort = '',
        curriculum = null,
        passedIds = [],
        failedIds = [],
        selectedIds = [],
        courses = [],
    } = {}) {
        const parts = [];
        if (faculty && group) parts.push(`رشته: ${group} — دانشکده: ${faculty}`);
        if (cohort) parts.push(`ورودی: ${cohort}`);

        const curriculumNames = ids => ids
            .map(id => curriculum?.courses.find(course => course.id === id)?.name)
            .filter(Boolean);
        const passed = curriculumNames([...passedIds]);
        const failed = curriculumNames([...failedIds]);
        if (passed.length) parts.push(`پاس‌شده: ${passed.join('، ')}`);
        if (failed.length) parts.push(`افتاده: ${failed.join('، ')}`);

        const selected = [...selectedIds]
            .map(id => findCourse(courses, id))
            .filter(Boolean)
            .slice(0, 10)
            .map(course => `${course.name} (${course.units}و)`);
        if (selected.length) parts.push(`انتخابی این ترم: ${selected.join('، ')}`);
        return parts.join('\n');
    }

    return Object.freeze({
        getFaculties,
        getGroups,
        filterCourses,
        findCourse,
        findExamClash,
        buildTimetable,
        detectPairConflicts,
        evaluateConflictRules,
        getCurriculumStatus,
        buildStudentContext,
    });
});
