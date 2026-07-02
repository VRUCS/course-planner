import js from '@eslint/js';
import globals from 'globals';

// Globals shared between the classic <script>-loaded files. Load order is
// defined in the HTML pages: config → data → domain → utils → ai → feature.
const projectGlobals = {
    APP_CONFIG: 'readonly',
    UNIVERSITY_DATA: 'readonly',
    CURRICULUM_REGISTRY: 'readonly',
    CONFLICT_RULES: 'readonly',
    CourseDomain: 'readonly',
    Theme: 'readonly',
    SafeDOM: 'readonly',
    Toast: 'readonly',
    AI: 'readonly',
    Advisor: 'readonly',
    DAY_MAP: 'readonly',
    DAY_NAMES: 'readonly',
    TIME_SLOTS: 'readonly',
    FACULTY_PALETTE: 'readonly',
    normalizeStr: 'readonly',
    toPersianNum: 'readonly',
    getDayIndex: 'readonly',
    getTimeSlot: 'readonly',
    parseSchedule: 'readonly',
    sessionsOverlap: 'readonly',
    debounce: 'readonly',
    aiQuickPrompt: 'readonly',
    // Defined by app.js; other files access them behind typeof guards
    // because app.js is only loaded on index.html.
    state: 'readonly',
    courses: 'readonly',
    getCurrentCurriculum: 'readonly',
};

// no-redeclare must not treat the files that *define* these shared globals
// as conflicting with the declarations above.
const scriptStyleRedeclare = ['error', { builtinGlobals: false }];

export default [
    {
        ignores: [
            'apps/web/generated/**',
            '_site/**',
            'node_modules/**',
            'data/sources/**',
            'temp/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['apps/web/scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'script',
            globals: { ...globals.browser, ...projectGlobals, module: 'readonly' },
        },
        rules: {
            // Top-level functions here are entry points wired via HTML
            // attributes and later <script> files, so scope-based unused
            // detection produces only false positives.
            'no-unused-vars': 'off',
            'no-redeclare': scriptStyleRedeclare,
        },
    },
    {
        files: ['apps/extension/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                // Defined in extractor.js, which popup.js injects into the
                // page before calling them via chrome.scripting.
                detectTopLevelPageType: 'readonly',
                runExtractionInFrame: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'off',
            'no-redeclare': scriptStyleRedeclare,
        },
    },
    {
        files: ['tests/frontend/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },
];
