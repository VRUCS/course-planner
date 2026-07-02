'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepository } = require('../../apps/web/scripts/adapters/planner-storage.js');

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    };
}

test('selection repository rejects stale, corrupt, and unknown course ids', () => {
    const now = 2_000_000_000_000;
    const storage = memoryStorage();
    const repository = createRepository(storage, { now: () => now });

    storage.setItem('uni_schedule_v2', '{broken');
    assert.deepEqual([...repository.loadSelection(new Set(['a']))], []);

    storage.setItem('uni_schedule_v2', JSON.stringify({ selected: ['a', 'removed'], ts: now }));
    assert.deepEqual([...repository.loadSelection(new Set(['a']))], ['a']);

    storage.setItem('uni_schedule_v2', JSON.stringify({
        selected: ['a'],
        ts: now - 61 * 86400000,
    }));
    assert.deepEqual([...repository.loadSelection(new Set(['a']))], []);
});

test('repository round-trips progress and preferences through its adapter', () => {
    const storage = memoryStorage();
    const repository = createRepository(storage, { now: () => 123 });
    repository.saveSelection(new Set(['a']));
    assert.deepEqual([...repository.loadSelection(new Set(['a']))], ['a']);

    repository.saveCurriculumProgress({ passed: new Set(['intro']), failed: new Set(['math']) });
    const progress = repository.loadCurriculumProgress();
    assert.deepEqual([...progress.passed], ['intro']);
    assert.deepEqual([...progress.failed], ['math']);

    repository.setPreference('cohort', '۱۴۰۲');
    assert.equal(repository.getPreference('cohort'), '۱۴۰۲');
    repository.setPreference('cohort', null);
    assert.equal(repository.getPreference('cohort'), '');
});

test('unavailable browser storage degrades to an empty in-memory state', () => {
    const unavailable = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('quota exceeded'); },
        removeItem() { throw new Error('blocked'); },
    };
    const repository = createRepository(unavailable);
    assert.deepEqual([...repository.loadSelection(new Set(['a']))], []);
    assert.deepEqual([...repository.loadCurriculumProgress().passed], []);
    assert.equal(repository.getPreference('cohort'), '');
    assert.doesNotThrow(() => repository.saveSelection(new Set(['a'])));
    assert.doesNotThrow(() => repository.setPreference('cohort', '۱۴۰۲'));
});
