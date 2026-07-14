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

    function filterCourses(courses, {
        term = '', faculty = '', group = '', gender = '', day = '',
        units = '', availableOnly = false, conflictFreeOnly = false, selectedCourses = [],
    } = {}) {
        const query = CourseDomain.normalizeText(term).toLocaleLowerCase('fa');
        const selectedSessions = selectedCourses.flatMap(course => CourseDomain.parseSchedule(course.time_html));
        return courses.filter(course => {
            if (faculty && course.faculty !== faculty) return false;
            if (group && course.group !== group) return false;
            if (gender && !CourseDomain.normalizeText(course.gender).includes(CourseDomain.normalizeText(gender))) return false;
            if (units && Number(course.units) !== Number(units)) return false;
            if (availableOnly && !(Number(course.capacity) > 0 && Number(course.enrolled) < Number(course.capacity))) return false;
            const sessions = CourseDomain.parseSchedule(course.time_html);
            if (day !== '' && !sessions.some(session => session.day === Number(day))) return false;
            if (conflictFreeOnly && selectedSessions.length && CourseDomain.sessionsOverlap(sessions, selectedSessions)) return false;
            if (!query) return true;
            return [course.name, course.id, course.prof]
                .some(value => CourseDomain.normalizeText(value).toLocaleLowerCase('fa').includes(query));
        });
    }

    function getBaseCourseId(course) {
        const id = CourseDomain.normalizeText(course?.id);
        const match = id.match(/^(.+)_([^_]+)$/);
        if (match) return match[1];
        return [
            CourseDomain.normalizeText(course?.faculty),
            CourseDomain.normalizeText(course?.name).toLocaleLowerCase('fa'),
            Number(course?.units) || 0,
        ].join('|');
    }

    function getSectionId(course) {
        const id = CourseDomain.normalizeText(course?.id);
        const match = id.match(/^.+_([^_]+)$/);
        return match ? match[1] : id;
    }

    function groupCourses(courses) {
        const groups = new Map();
        courses.forEach(course => {
            const baseId = getBaseCourseId(course);
            if (!groups.has(baseId)) groups.set(baseId, { baseId, course: course, sections: [] });
            groups.get(baseId).sections.push(course);
        });
        return [...groups.values()].map(group => ({
            ...group,
            sections: group.sections.slice().sort((a, b) => String(a.id).localeCompare(String(b.id), 'fa')),
        }));
    }

    function sortCourseGroups(groups, sort = 'relevance') {
        const value = group => {
            if (sort === 'capacity') return Math.max(...group.sections.map(c =>
                Number(c.capacity) > 0 ? Math.max(0, Number(c.capacity) - Number(c.enrolled || 0)) : -1));
            if (sort === 'time') {
                const starts = group.sections.flatMap(c => CourseDomain.parseSchedule(c.time_html))
                    .map(session => session.startMinutes);
                return starts.length ? Math.min(...starts) : Number.MAX_SAFE_INTEGER;
            }
            return 0;
        };
        return groups.slice().sort((a, b) => {
            if (sort === 'name') return a.course.name.localeCompare(b.course.name, 'fa');
            if (sort === 'capacity') return value(b) - value(a);
            if (sort === 'time') return value(a) - value(b);
            return 0;
        });
    }

    function deriveAdditionRisks(course, selectedIds, courses, maxUnits = 20, excludeIds = []) {
        const excluded = new Set(excludeIds);
        const effectiveIds = new Set([...selectedIds].filter(id => !excluded.has(id)));
        const selected = [...effectiveIds].map(id => findCourse(courses, id)).filter(Boolean);
        const sessions = CourseDomain.parseSchedule(course?.time_html);
        const exam = CourseDomain.parseExam(course?.exam_text);
        const classConflicts = selected.filter(other =>
            CourseDomain.sessionsOverlap(sessions, CourseDomain.parseSchedule(other.time_html)));
        const examConflicts = selected.filter(other =>
            CourseDomain.examsOverlap(exam, CourseDomain.parseExam(other.exam_text)));
        const projectedUnits = CourseDomain.totalUnits(effectiveIds, courses) + (Number(course?.units) || 0);
        return {
            classConflicts,
            examConflicts,
            unitOverflow: projectedUnits > maxUnits ? { projectedUnits, maxUnits } : null,
        };
    }

    function planSelectionChange(course, selectedIds, courses, maxUnits = 20, replaceId = null) {
        const before = new Set(selectedIds);
        const replace = replaceId && before.has(replaceId) ? replaceId : null;
        const risks = deriveAdditionRisks(course, before, courses, maxUnits, replace ? [replace] : []);
        const after = new Set(before);
        if (replace) after.delete(replace);
        after.add(course.id);
        return { before, after, replaceId: replace, risks };
    }

    function derivePlanHealth(selectedIds, courses, maxUnits = 20) {
        const selected = [...selectedIds].map(id => findCourse(courses, id)).filter(Boolean);
        const issues = [];
        for (let i = 0; i < selected.length; i += 1) {
            for (let j = i + 1; j < selected.length; j += 1) {
                const first = selected[i];
                const second = selected[j];
                if (CourseDomain.sessionsOverlap(
                    CourseDomain.parseSchedule(first.time_html),
                    CourseDomain.parseSchedule(second.time_html),
                )) issues.push({ type: 'class', courses: [first, second] });
                if (CourseDomain.examsOverlap(
                    CourseDomain.parseExam(first.exam_text),
                    CourseDomain.parseExam(second.exam_text),
                )) issues.push({ type: 'exam', courses: [first, second] });
            }
        }
        const units = CourseDomain.totalUnits(selectedIds, courses);
        if (units > maxUnits) issues.push({ type: 'units', units, maxUnits, courses: [] });
        return { ready: issues.length === 0, issues, units, count: selected.length, maxUnits };
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
                    section: getSectionId(course),
                    startMinutes: session.startMinutes,
                    endMinutes: session.endMinutes,
                    day: session.day,
                    slot: session.slot,
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
        getBaseCourseId,
        getSectionId,
        groupCourses,
        sortCourseGroups,
        deriveAdditionRisks,
        planSelectionChange,
        derivePlanHealth,
        findCourse,
        findExamClash,
        buildTimetable,
        detectPairConflicts,
        evaluateConflictRules,
        getCurriculumStatus,
        buildStudentContext,
    });
});
