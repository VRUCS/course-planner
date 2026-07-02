/**
 * Pure domain helpers shared by the browser UI and Node-based tests.
 * No DOM, storage, or network access belongs in this module.
 */
(function initCourseDomain(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.CourseDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildCourseDomain() {
    'use strict';

    const DAY_MAP = Object.freeze({
        'پنج شنبه': -1, 'پنجشنبه': -1,
        'چهار شنبه': 4, 'چهارشنبه': 4,
        'سه شنبه': 3, 'سهشنبه': 3,
        'دو شنبه': 2, 'دوشنبه': 2,
        'یک شنبه': 1, 'یکشنبه': 1,
        'شنبه': 0,
    });

    const DAY_NAMES = Object.freeze(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه']);
    const TIME_SLOTS = Object.freeze(['08', '10', '13', '15', '17']);

    function normalizeText(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
            .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
            .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function getDayIndex(value) {
        const text = normalizeText(value);
        for (const [name, index] of Object.entries(DAY_MAP)) {
            if (text.includes(name)) return index;
        }
        return -1;
    }

    function getTimeSlot(hour) {
        if (hour >= 7 && hour < 10) return '08';
        if (hour >= 10 && hour < 12) return '10';
        if (hour >= 13 && hour < 15) return '13';
        if (hour >= 15 && hour < 17) return '15';
        if (hour >= 17 && hour <= 23) return '17';
        return null;
    }

    function stripHtml(value) {
        return String(value || '').replace(/<[^>]*>/g, ' ');
    }

    function parseSchedule(value) {
        const sessions = [];
        String(value || '').split(/<br\s*\/?>|\n/i).forEach(line => {
            const text = normalizeText(stripHtml(line));
            if (!text || text.includes('امتحان')) return;
            const day = getDayIndex(text);
            if (day === -1) return;
            const match = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
            if (!match) return;
            const slot = getTimeSlot(Number(match[1]));
            if (!slot) return;
            const location = text.match(/مکان:\s*(.+?)\s*$/);
            sessions.push({
                day,
                slot,
                startMinutes: Number(match[1]) * 60 + Number(match[2]),
                endMinutes: Number(match[3]) * 60 + Number(match[4]),
                isTA: text.includes('حل تمرین') || text.includes('(ع)'),
                location: location ? location[1].trim() : '',
            });
        });
        return sessions;
    }

    function parseExam(value) {
        const text = normalizeText(stripHtml(value));
        const date = text.match(/امتحان\s*\((\d{4})[/.](\d{1,2})[/.](\d{1,2})\)/);
        if (!date) return null;
        const pad = part => part.padStart(2, '0');
        const time = text.match(/امتحان.*?ساعت\s*:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        return {
            date: `${date[1]}/${pad(date[2])}/${pad(date[3])}`,
            startMinutes: time ? Number(time[1]) * 60 + Number(time[2]) : null,
            endMinutes: time ? Number(time[3]) * 60 + Number(time[4]) : null,
        };
    }

    function examsOverlap(a, b) {
        if (!a || !b || a.date !== b.date) return false;
        if (Number.isFinite(a.startMinutes) && Number.isFinite(a.endMinutes)
            && Number.isFinite(b.startMinutes) && Number.isFinite(b.endMinutes)) {
            return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
        }
        // Same date with an unknown time cannot be proven safe.
        return true;
    }

    function sessionPairOverlaps(a, b) {
        if (a.day !== b.day) return false;
        if (Number.isFinite(a.startMinutes) && Number.isFinite(a.endMinutes)
            && Number.isFinite(b.startMinutes) && Number.isFinite(b.endMinutes)) {
            return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
        }
        return a.slot === b.slot;
    }

    function sessionsOverlap(first, second) {
        return first.some(a => second.some(b => sessionPairOverlaps(a, b)));
    }

    function totalUnits(selectedIds, courses) {
        const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
        return courses
            .filter(course => selected.has(course.id))
            .reduce((sum, course) => sum + (Number(course.units) || 0), 0);
    }

    /**
     * سقف واحد بر اساس معدل ترم قبل (آیین‌نامه آموزشی):
     * مشروط (< ۱۲) → ۱۴ واحد، عادی → ۲۰ واحد، معدل ≥ ۱۷ → ۲۴ واحد.
     * معدل نامشخص → سقف عادی.
     */
    function maxUnitsForGpa(gpa) {
        if (gpa === null || gpa === undefined || String(gpa).trim() === '') return 20;
        const value = Number(gpa);
        if (!Number.isFinite(value) || value < 0 || value > 20) return 20;
        if (value < 12) return 14;
        if (value >= 17) return 24;
        return 20;
    }

    function validateCourse(course) {
        const errors = [];
        if (!course || typeof course !== 'object') return ['course must be an object'];
        if (!normalizeText(course.id)) errors.push('id is required');
        if (!normalizeText(course.name)) errors.push('name is required');
        if (!normalizeText(course.faculty)) errors.push('faculty is required');
        if (!normalizeText(course.group)) errors.push('group is required');
        if (!Number.isInteger(course.units) || course.units < 0 || course.units > 30) {
            errors.push('units must be an integer between 0 and 30');
        }
        return errors;
    }

    return Object.freeze({
        DAY_MAP, DAY_NAMES, TIME_SLOTS,
        normalizeText, getDayIndex, getTimeSlot, parseSchedule,
        parseExam, examsOverlap,
        sessionsOverlap, totalUnits, maxUnitsForGpa, validateCourse,
    });
});
