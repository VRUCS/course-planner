/**
 * ai.js — OpenRouter client مشترک
 * همه فیچرهای AI از این ماژول استفاده می‌کنند.
 * بارگذاری: قبل از ai-advisor.js و بعد از utils.js
 */

const AI = (() => {

    // ─── تنظیمات ─────────────────────────────────────────────────────────────
    const STORAGE_KEY_KEY   = 'ai_api_key';
    const STORAGE_KEY_MODEL = 'ai_model';
    const BASE_URL          = 'https://openrouter.ai/api/v1/chat/completions';

    const MODELS = [
        { id: 'deepseek/deepseek-chat-v3-0324',      label: 'DeepSeek V3 (توصیه‌شده، ارزان)' },
        { id: 'google/gemini-flash-1.5-8b:free',     label: 'Gemini Flash 1.5 8B (رایگان)'  },
        { id: 'qwen/qwen-2.5-7b-instruct:free',      label: 'Qwen 2.5 7B (رایگان)'           },
        { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'LLaMA 3.1 8B (رایگان)'       },
        { id: 'deepseek/deepseek-r1:free',            label: 'DeepSeek R1 (رایگان، استدلال)' },
    ];

    function getSettings() {
        return {
            key:   localStorage.getItem(STORAGE_KEY_KEY)   || '',
            model: localStorage.getItem(STORAGE_KEY_MODEL) || MODELS[0].id,
        };
    }

    function saveSettings(key, model) {
        if (key   !== undefined) localStorage.setItem(STORAGE_KEY_KEY,   key);
        if (model !== undefined) localStorage.setItem(STORAGE_KEY_MODEL, model);
    }

    function isConfigured() {
        return !!getSettings().key;
    }

    // ─── درخواست پایه ────────────────────────────────────────────────────────
    async function _request(messages, { jsonMode = false, stream = false } = {}) {
        const { key, model } = getSettings();
        if (!key) throw new Error('کلید API تنظیم نشده. لطفاً در پنل ادمین وارد کنید.');

        const body = {
            model,
            messages,
            temperature: 0.4,
            max_tokens: 1200,
            stream,
        };
        if (jsonMode) body.response_format = { type: 'json_object' };

        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization':  `Bearer ${key}`,
                'Content-Type':   'application/json',
                'HTTP-Referer':   'https://github.com/entekhab-vahed',
                'X-Title':        'سامانه انتخاب واحد هوشمند',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `خطای API: ${res.status}`);
        }
        return res;
    }

    // ─── درخواست معمولی (JSON mode) ──────────────────────────────────────────
    async function complete(messages, opts = {}) {
        const res  = await _request(messages, { ...opts, stream: false });
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (opts.jsonMode) {
            try { return JSON.parse(content); }
            catch { return { raw: content }; }
        }
        return content;
    }

    // ─── streaming (async generator) ─────────────────────────────────────────
    async function* stream(messages, opts = {}) {
        const res = await _request(messages, { ...opts, stream: true });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop(); // آخرین خط ناقص ممکن است

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;
                try {
                    const json  = JSON.parse(trimmed.slice(6));
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) yield delta;
                } catch { /* skip malformed chunk */ }
            }
        }
    }

    // ─── تست اتصال ───────────────────────────────────────────────────────────
    async function testConnection() {
        const result = await complete([
            { role: 'user', content: 'سلام. فقط بگو «سلام» به فارسی.' }
        ]);
        return result;
    }

    // ─── Context Builder: اطلاعات دانشجو ──────────────────────────────────────
    function buildStudentContext() {
        // این تابع از state و توابع app.js استفاده می‌کند
        // که قبلاً بارگذاری شده‌اند
        const parts = [];

        // رشته/گروه
        const fac = document.getElementById('facultyFilter')?.value;
        const grp = document.getElementById('groupFilter')?.value;
        if (fac && grp) parts.push(`رشته: ${grp} — دانشکده: ${fac}`);

        // ورودی
        const cohort = document.getElementById('cohortSelect')?.value;
        if (cohort) parts.push(`ورودی: ${cohort}`);

        // درس‌های پاس‌شده
        if (typeof state !== 'undefined' && state.curriculum?.passed?.size > 0) {
            const curriculum = typeof getCurrentCurriculum === 'function'
                ? getCurrentCurriculum()
                : null;
            if (curriculum) {
                const passedNames = [...state.curriculum.passed]
                    .map(id => curriculum.courses.find(c => c.id === id)?.name)
                    .filter(Boolean);
                if (passedNames.length)
                    parts.push(`درس‌های پاس‌شده: ${passedNames.join('، ')}`);

                const failedNames = [...state.curriculum.failed]
                    .map(id => curriculum.courses.find(c => c.id === id)?.name)
                    .filter(Boolean);
                if (failedNames.length)
                    parts.push(`درس‌های افتاده: ${failedNames.join('، ')}`);
            }
        }

        // درس‌های انتخابی این ترم
        if (typeof state !== 'undefined' && state.selected?.size > 0 &&
            typeof courses !== 'undefined') {
            const selCourses = [...state.selected]
                .map(id => courses.find(c => c.id === id))
                .filter(Boolean)
                .map(c => `${c.name} (${c.units} واحد)`)
                .slice(0, 10);
            if (selCourses.length)
                parts.push(`درس‌های انتخابی این ترم: ${selCourses.join('، ')}`);
        }

        // درس‌های در دسترس این ترم (از نقشه درسی)
        if (typeof getCurrentCurriculum === 'function' &&
            typeof getCourseStatus === 'function') {
            const curriculum = getCurrentCurriculum();
            if (curriculum) {
                const available = curriculum.courses
                    .filter(c => getCourseStatus(c.id, curriculum) === 'available' &&
                                 typeof isOfferedThisSemester === 'function' &&
                                 isOfferedThisSemester(c))
                    .map(c => `${c.name} (ترم ${c.semester}, ${c.units} واحد)`)
                    .slice(0, 15);
                if (available.length)
                    parts.push(`درس‌های در دسترس این ترم: ${available.join('، ')}`);
            }
        }

        return parts.join('\n');
    }

    // ─── Public API ──────────────────────────────────────────────────────────
    return {
        MODELS,
        getSettings,
        saveSettings,
        isConfigured,
        complete,
        stream,
        testConnection,
        buildStudentContext,
    };
})();
