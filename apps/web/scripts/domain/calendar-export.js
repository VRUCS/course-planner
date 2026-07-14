/**
 * Pure iCalendar exporter for weekly class sessions.
 */
(function initCalendarExport(root, factory) {
    const dependency = typeof module === 'object' && module.exports
        ? require('./course-domain.js')
        : root.CourseDomain;
    const api = factory(dependency);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.CalendarExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildCalendarExport(CourseDomain) {
    'use strict';

    function parseDate(value) {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function formatDate(date) {
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    }

    function formatDateTime(date, minutes) {
        return `${formatDate(date)}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
    }

    function firstDayOnOrAfter(start, courseDay) {
        const jsDay = [6, 0, 1, 2, 3, 4][courseDay];
        const result = new Date(start);
        result.setDate(result.getDate() + ((jsDay - start.getDay() + 7) % 7));
        return result;
    }

    function escapeText(value) {
        return String(value || '')
            .replace(/\\/g, '\\\\')
            .replace(/\r?\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }

    function stamp(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    function buildCalendarIcs(options) {
        const start = parseDate(options.startDate);
        const end = parseDate(options.endDate);
        if (!start || !end || end < start) throw new Error('INVALID_TERM_RANGE');
        const courses = options.courses || [];
        const timeZone = options.timeZone || 'Asia/Tehran';
        const reminderMinutes = Number(options.reminderMinutes);
        const now = options.now || new Date();
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Entekhab Vahed//Student Planner//FA',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${escapeText(options.calendarName || 'برنامه دانشگاه')}`,
            `X-WR-TIMEZONE:${timeZone}`,
        ];
        let eventCount = 0;

        courses.forEach(course => {
            CourseDomain.parseSchedule(course.time_html).forEach((session, index) => {
                const firstDate = firstDayOnOrAfter(start, session.day);
                if (firstDate > end) return;
                const description = [
                    `استاد: ${course.prof || 'اعلام نشده'}`,
                    `کد گروه: ${course.id || '—'}`,
                    `دانشکده: ${course.faculty || '—'}`,
                ].join('\n');
                lines.push(
                    'BEGIN:VEVENT',
                    `UID:${escapeText(`${course.id || 'course'}-${index}@entekhab-vahed.local`)}`,
                    `DTSTAMP:${stamp(now)}`,
                    `DTSTART;TZID=${timeZone}:${formatDateTime(firstDate, session.startMinutes)}`,
                    `DTEND;TZID=${timeZone}:${formatDateTime(firstDate, session.endMinutes)}`,
                    `RRULE:FREQ=WEEKLY;UNTIL=${formatDate(end)}T235959Z`,
                    `SUMMARY:${escapeText(course.name || 'کلاس دانشگاه')}`,
                    `DESCRIPTION:${escapeText(description)}`,
                    `LOCATION:${escapeText(session.location)}`,
                );
                if (Number.isFinite(reminderMinutes) && reminderMinutes > 0) {
                    lines.push(
                        'BEGIN:VALARM',
                        `TRIGGER:-PT${Math.round(reminderMinutes)}M`,
                        'ACTION:DISPLAY',
                        `DESCRIPTION:${escapeText(`یادآوری کلاس ${course.name || ''}`)}`,
                        'END:VALARM',
                    );
                }
                lines.push('END:VEVENT');
                eventCount += 1;
            });
        });
        lines.push('END:VCALENDAR');
        return { content: `${lines.join('\r\n')}\r\n`, eventCount };
    }

    return Object.freeze({ buildCalendarIcs });
});
