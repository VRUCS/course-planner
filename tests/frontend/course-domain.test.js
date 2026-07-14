'use strict';

const assert = require('node:assert/strict');
const domain = require('../../apps/web/scripts/domain/course-domain.js');

assert.equal(domain.normalizeText('  برنامه‌نويسي ۱۲ '), 'برنامه نویسی 12');
assert.equal(domain.getDayIndex('کلاس دوشنبه'), 2);
assert.equal(domain.getDayIndex('پنج‌شنبه'), 5);
assert.equal(domain.getTimeSlot(13), '13');

const first = domain.parseSchedule('شنبه 08:00 - 09:30 مکان: ۱۰۱');
const overlapping = domain.parseSchedule('شنبه 09:00 - 10:00');
const adjacent = domain.parseSchedule('شنبه 09:30 - 10:30');
assert.equal(first.length, 1);
assert.equal(first[0].location, '101');
assert.equal(domain.parseSchedule('پنجشنبه 06:00 - 07:00')[0].slot, null);
assert.equal(domain.sessionsOverlap(first, overlapping), true);
assert.equal(domain.sessionsOverlap(first, adjacent), false);

const exam = domain.parseExam('درس(ت): شنبه 13:30-15:30 مکان: ک102 امتحان(1405.03.21) ساعت : 10:30-12:30');
assert.deepEqual(exam, { date: '1405/03/21', startMinutes: 630, endMinutes: 750 });
assert.equal(domain.parseExam('درس(ت): شنبه 13:30-15:30 مکان: ک102'), null);

const noTime = domain.parseExam('امتحان(1405.3.5)');
assert.deepEqual(noTime, { date: '1405/03/05', startMinutes: null, endMinutes: null });

const laterSameDay = domain.parseExam('امتحان(1405/03/21) ساعت : 13:30-15:30');
const otherDay = domain.parseExam('امتحان(1405.03.22) ساعت : 10:30-12:30');
assert.equal(domain.examsOverlap(exam, exam), true);
assert.equal(domain.examsOverlap(exam, laterSameDay), false);
assert.equal(domain.examsOverlap(exam, otherDay), false);
// Unknown time on the same date cannot be proven safe → conflict.
assert.equal(domain.examsOverlap(laterSameDay, domain.parseExam('امتحان(1405.03.21)')), true);
assert.equal(domain.examsOverlap(exam, null), false);

assert.equal(domain.maxUnitsForGpa(11.99), 14);
assert.equal(domain.maxUnitsForGpa(12), 20);
assert.equal(domain.maxUnitsForGpa(16.99), 20);
assert.equal(domain.maxUnitsForGpa(17), 24);
assert.equal(domain.maxUnitsForGpa('18.5'), 24);
assert.equal(domain.maxUnitsForGpa(null), 20);
assert.equal(domain.maxUnitsForGpa(''), 20);
assert.equal(domain.maxUnitsForGpa(25), 20);
assert.equal(domain.maxUnitsForGpa(-1), 20);

const courses = [{ id: 'a', units: 3 }, { id: 'b', units: 2 }];
assert.equal(domain.totalUnits(new Set(['a', 'b']), courses), 5);
assert.deepEqual(
    domain.validateCourse({ id: '1', name: 'درس', faculty: 'فنی', group: 'کامپیوتر', units: 3 }),
    [],
);
assert.ok(domain.validateCourse({ id: '', units: 50 }).length >= 4);

console.log('domain tests passed');
