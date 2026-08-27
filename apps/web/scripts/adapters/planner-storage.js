/**
 * Persistence adapter for planner state.
 *
 * localStorage is injected instead of accessed by domain code. Corrupt or old
 * browser data is treated as absent so one bad value cannot prevent startup.
 */
(function initPlannerStorage(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.PlannerStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildPlannerStorage() {
    'use strict';

    const DEFAULT_KEYS = Object.freeze({
        schedule: 'uni_schedule_v2',
        curriculum: 'uni_curriculum_v2',
        cohort: 'selectedCohort',
        faculty: 'uni_faculty',
        group: 'uni_group',
        searchFaculty: 'uni_search_faculty',
        searchGroup: 'uni_search_group',
        gpa: 'uni_gpa',
        onboarding: 'uni_planner_onboarding_v1',
        helpGuide: 'uni_planner_help_guide_v1',
        calendarStart: 'uni_calendar_start_v1',
        calendarEnd: 'uni_calendar_end_v1',
    });

    function safeParse(raw, fallback) {
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function createRepository(storage, { now = Date.now, keys = DEFAULT_KEYS } = {}) {
        if (!storage) throw new TypeError('A Storage-compatible adapter is required');

        function getItem(key) {
            try {
                return storage.getItem(key);
            } catch {
                return null;
            }
        }

        function setItem(key, value) {
            try {
                storage.setItem(key, value);
            } catch {
                // Persistence is an enhancement; quota/privacy errors must not
                // break the planner's in-memory behavior.
            }
        }

        function removeItem(key) {
            try {
                storage.removeItem(key);
            } catch {
                // See setItem: unavailable storage degrades to memory-only use.
            }
        }

        function loadSelection(validIds, maxAgeDays = 60) {
            const data = safeParse(getItem(keys.schedule), null);
            if (!data || !Array.isArray(data.selected) || !Number.isFinite(data.ts)) return new Set();
            if ((now() - data.ts) / 86400000 >= maxAgeDays) return new Set();
            return new Set(data.selected.filter(id => validIds.has(id)));
        }

        function saveSelection(selectedIds) {
            setItem(keys.schedule, JSON.stringify({
                selected: [...selectedIds],
                ts: now(),
            }));
        }

        function loadCurriculumProgress() {
            const data = safeParse(getItem(keys.curriculum), {});
            return {
                passed: new Set(Array.isArray(data.passed) ? data.passed : []),
                failed: new Set(Array.isArray(data.failed) ? data.failed : []),
            };
        }

        function saveCurriculumProgress({ passed, failed }) {
            setItem(keys.curriculum, JSON.stringify({
                passed: [...passed],
                failed: [...failed],
            }));
        }

        function getPreference(name, fallback = '') {
            const key = keys[name];
            return key ? getItem(key) || fallback : fallback;
        }

        function setPreference(name, value) {
            const key = keys[name];
            if (!key) throw new RangeError(`Unknown preference: ${name}`);
            if (value === null || value === undefined || value === '') removeItem(key);
            else setItem(key, String(value));
        }

        return Object.freeze({
            loadSelection,
            saveSelection,
            loadCurriculumProgress,
            saveCurriculumProgress,
            getPreference,
            setPreference,
        });
    }

    function createMemoryStorage(initial = {}) {
        const values = new Map(Object.entries(initial));
        return {
            getItem(key) { return values.get(key) ?? null; },
            setItem(key, value) { values.set(key, String(value)); },
            removeItem(key) { values.delete(key); },
        };
    }

    return Object.freeze({ DEFAULT_KEYS, createMemoryStorage, createRepository });
});
