/**
 * ai.js — AI client
 *
 * درخواست‌ها به backend (FastAPI) ارسال می‌شوند، نه مستقیم به OpenRouter.
 * API key روی سرور نگه داشته می‌شود.
 *
 * ─── Feature flags ────────────────────────────────────────────────────────
 * AI_INTERACTIVE_ENABLED  — وقتی false است، chat/load/path UI پنهان هستند.
 *                           از /health دریافت می‌شود (یا پیش‌فرض false).
 */

const AI = (() => {

    // آدرس backend — در production باید آدرس واقعی سرور باشد
    const BACKEND_URL = window.__AI_BACKEND_URL || 'http://localhost:8000';

    // ─── Feature flags (از backend می‌آید) ─────────────────────────────────
    let _interactiveEnabled = false;   // پیش‌فرض: غیرفعال
    let _defaultModel = 'deepseek/deepseek-chat-v3-0324';
    let _healthChecked = false;

    // بررسی وضعیت سرور در ابتدا
    async function checkHealth() {
        if (_healthChecked) return;
        try {
            const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
            if (res.ok) {
                const data = await res.json();
                _interactiveEnabled = data.ai_interactive_enabled ?? false;
                _defaultModel       = data.model ?? _defaultModel;
                _healthChecked      = true;
                // نمایش/پنهان FAB بر اساس feature flag
                _updateInteractiveUI();
            }
        } catch {
            // سرور در دسترس نیست — همه فیچرهای AI غیرفعال
            _healthChecked = true;
        }
    }

    function _updateInteractiveUI() {
        const fab = document.getElementById('aiFab');
        if (fab) fab.style.display = _interactiveEnabled ? 'flex' : 'none';
        // badge بار درسی هم مخفی بماند
        const badge = document.getElementById('loadBadge');
        if (badge && !_interactiveEnabled) badge.style.display = 'none';
    }

    function isInteractiveEnabled() { return _interactiveEnabled; }

    // ─── Batch: complete (همیشه فعال) ─────────────────────────────────────
    async function batchComplete(messages, { model, jsonMode = false, maxTokens } = {}) {
        const res = await fetch(`${BACKEND_URL}/api/ai/batch/complete`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model, json_mode: jsonMode, max_tokens: maxTokens }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `خطای سرور: ${res.status}`);
        }
        const data = await res.json();
        if (jsonMode) {
            try { return JSON.parse(data.content); }
            catch { return { raw: data.content }; }
        }
        return data.content;
    }

    // ─── Batch: generate conflict rules (همیشه فعال) ─────────────────────
    async function generateConflictRules(fieldKey, courses, model) {
        const res = await fetch(`${BACKEND_URL}/api/ai/batch/generate-rules`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field_key: fieldKey, courses, model }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `خطای سرور: ${res.status}`);
        }
        return res.json();  // { field_key, rules: { mustNotConflict, shouldNotConflict }, usage }
    }

    // ─── Interactive: complete (نیاز به AI_INTERACTIVE_ENABLED=true) ──────
    async function complete(messages, { model, jsonMode = false, maxTokens } = {}) {
        if (!_interactiveEnabled) throw new Error('فیچرهای تعاملی AI هنوز فعال نشده‌اند.');
        const res = await fetch(`${BACKEND_URL}/api/ai/chat/complete`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model, json_mode: jsonMode, max_tokens: maxTokens }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `خطای سرور: ${res.status}`);
        }
        const data = await res.json();
        if (jsonMode) {
            try { return JSON.parse(data.content); }
            catch { return { raw: data.content }; }
        }
        return data.content;
    }

    // ─── Interactive: streaming (نیاز به AI_INTERACTIVE_ENABLED=true) ─────
    async function* stream(messages, { model, maxTokens } = {}) {
        if (!_interactiveEnabled) throw new Error('فیچرهای تعاملی AI هنوز فعال نشده‌اند.');
        const res = await fetch(`${BACKEND_URL}/api/ai/chat/stream`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model, max_tokens: maxTokens }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `خطای سرور: ${res.status}`);
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;
                try {
                    const json  = JSON.parse(trimmed.slice(6));
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) yield delta;
                } catch { /* skip */ }
            }
        }
    }

    // ─── Context builder (برای interactive) ──────────────────────────────
    function buildStudentContext() {
        const parts = [];
        const fac = document.getElementById('facultyFilter')?.value;
        const grp = document.getElementById('groupFilter')?.value;
        if (fac && grp) parts.push(`رشته: ${grp} — دانشکده: ${fac}`);
        const cohort = document.getElementById('cohortSelect')?.value;
        if (cohort) parts.push(`ورودی: ${cohort}`);

        if (typeof state !== 'undefined' && typeof getCurrentCurriculum === 'function') {
            const cur = getCurrentCurriculum();
            if (cur) {
                const passed = [...(state.curriculum?.passed || [])]
                    .map(id => cur.courses.find(c => c.id === id)?.name).filter(Boolean);
                if (passed.length) parts.push(`پاس‌شده: ${passed.join('، ')}`);

                const failed = [...(state.curriculum?.failed || [])]
                    .map(id => cur.courses.find(c => c.id === id)?.name).filter(Boolean);
                if (failed.length) parts.push(`افتاده: ${failed.join('، ')}`);
            }
        }
        if (typeof state !== 'undefined' && typeof courses !== 'undefined') {
            const sel = [...(state.selected || [])]
                .map(id => courses.find(c => c.id === id))
                .filter(Boolean).map(c => `${c.name} (${c.units}و)`).slice(0, 10);
            if (sel.length) parts.push(`انتخابی این ترم: ${sel.join('، ')}`);
        }
        return parts.join('\n');
    }

    // ─── Public API ───────────────────────────────────────────────────────
    return {
        BACKEND_URL,
        checkHealth,
        isInteractiveEnabled,
        // batch (همیشه فعال)
        batchComplete,
        generateConflictRules,
        // interactive (نیاز به feature flag)
        complete,
        stream,
        buildStudentContext,
    };
})();

// بررسی health سرور هنگام load صفحه
document.addEventListener('DOMContentLoaded', () => AI.checkHealth());
