'use strict';

const assert = require('node:assert/strict');
const domain = require('../../assets/js/domain.js');

assert.equal(domain.normalizeText('  برنامه‌نويسي ۱۲ '), 'برنامه نویسی 12');
assert.equal(domain.getDayIndex('کلاس دوشنبه'), 2);
assert.equal(domain.getDayIndex('پنج‌شنبه'), -1);
assert.equal(domain.getTimeSlot(13), '13');

const first = domain.parseSchedule('شنبه 08:00 - 09:30 مکان: ۱۰۱');
const overlapping = domain.parseSchedule('شنبه 09:00 - 10:00');
const adjacent = domain.parseSchedule('شنبه 09:30 - 10:30');
assert.equal(first.length, 1);
assert.equal(first[0].location, '101');
assert.equal(domain.sessionsOverlap(first, overlapping), true);
assert.equal(domain.sessionsOverlap(first, adjacent), false);

const courses = [{ id: 'a', units: 3 }, { id: 'b', units: 2 }];
assert.equal(domain.totalUnits(new Set(['a', 'b']), courses), 5);
assert.deepEqual(
    domain.validateCourse({ id: '1', name: 'درس', faculty: 'فنی', group: 'کامپیوتر', units: 3 }),
    [],
);
assert.ok(domain.validateCourse({ id: '', units: 50 }).length >= 4);

console.log('domain tests passed');
