'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const CalendarExport = require('../../apps/web/scripts/domain/calendar-export.js');

test('calendar export creates weekly Tehran events with details and reminders', () => {
    const result = CalendarExport.buildCalendarIcs({
        startDate: '2026-09-19',
        endDate: '2026-12-31',
        timeZone: 'Asia/Tehran',
        reminderMinutes: 15,
        now: new Date('2026-07-03T12:00:00Z'),
        courses: [{
            id: '123_01',
            name: 'الگوریتم‌های پیشرفته',
            prof: 'استاد نمونه',
            faculty: 'علوم',
            time_html: 'درس(ت): شنبه 08:00-10:00 مکان: کلاس ۱۰۱',
        }],
    });
    assert.equal(result.eventCount, 1);
    assert.match(result.content, /DTSTART;TZID=Asia\/Tehran:20260919T080000/);
    assert.match(result.content, /RRULE:FREQ=WEEKLY;UNTIL=20261231T235959Z/);
    assert.match(result.content, /SUMMARY:الگوریتم‌های پیشرفته/);
    assert.match(result.content, /LOCATION:کلاس 101/);
    assert.match(result.content, /TRIGGER:-PT15M/);
    assert.match(result.content, /\r\nEND:VCALENDAR\r\n$/);
});

test('calendar export rejects an invalid term range', () => {
    assert.throws(
        () => CalendarExport.buildCalendarIcs({ startDate: '2026-12-01', endDate: '2026-09-01' }),
        /INVALID_TERM_RANGE/,
    );
});
