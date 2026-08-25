/**
 * AI backend client.
 *
 * درخواست‌ها به backend (FastAPI) ارسال می‌شوند، نه مستقیم به OpenRouter.
 * API key روی سرور نگه داشته می‌شود و هیچ توکنی از کاربر گرفته نمی‌شود؛
 * فعال یا غیرفعال بودن AI را فقط سرور تعیین می‌کند (AI_INTERACTIVE_ENABLED
 * که از /health خوانده می‌شود — پیش‌فرض: غیرفعال).
 */

const AI = (() => {

    // آدرس backend — در production باید آدرس واقعی سرور باشد
    const configuredUrl = window.APP_CONFIG?.backendUrl || window.__AI_BACKEND_URL || '';
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const BACKEND_URL = configuredUrl.replace(/\/+$/, '') || (isLocal ? 'http://localhost:8000' : '');

    function requestHeaders() {
        return { 'Content-Type': 'application/json' };
    }

    // ─── Feature flags (از backend می‌آید) ─────────────────────────────────
    let _interactiveEnabled = false;   // پیش‌فرض: غیرفعال
    let _defaultModel = 'deepseek/deepseek-chat-v3-0324';
    let _healthChecked = false;
    let _contextProvider = () => '';

    function timeoutRequest(options, timeoutMs) {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            return { options: { ...options, signal: AbortSignal.timeout(timeoutMs) }, cleanup() {} };
        }
        if (typeof AbortController === 'undefined') return { options, cleanup() {} };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return {
            options: { ...options, signal: controller.signal },
            cleanup() { clearTimeout(timer); },
        };
    }

    // بررسی وضعیت سرور در ابتدا
    async function checkHealth() {
        if (_healthChecked) return;
        if (!BACKEND_URL) {
            _healthChecked = true;
            _updateInteractiveUI();
            return;
        }
        const request = timeoutRequest({}, 3000);
        try {
            const res = await fetch(`${BACKEND_URL}/health`, request.options);
            if (res.ok) {
                const data = await res.json();
                _interactiveEnabled = data.ai_interactive_enabled ?? false;
                _defaultModel       = data.model ?? _defaultModel;
            }
        } catch {
            // سرور در دسترس نیست — همه فیچرهای AI غیرفعال
        } finally {
            request.cleanup();
            _healthChecked = true;
            // UI always reaches a deterministic state, including HTTP errors.
            _updateInteractiveUI();
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
    function isConfigured() { return _healthChecked && _interactiveEnabled; }

    // ─── Interactive: complete (نیاز به AI_INTERACTIVE_ENABLED=true) ──────
    async function complete(messages, { model, jsonMode = false, maxTokens } = {}) {
        if (!_interactiveEnabled) throw new Error('فیچرهای تعاملی AI هنوز فعال نشده‌اند.');
        const request = timeoutRequest({
            method:  'POST',
            headers: requestHeaders(),
            body: JSON.stringify({ messages, model, json_mode: jsonMode, max_tokens: maxTokens }),
        }, 30000);
        try {
            const res = await fetch(`${BACKEND_URL}/api/ai/chat/complete`, request.options);
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
        } finally {
            request.cleanup();
        }
    }

    // ─── Interactive: streaming (نیاز به AI_INTERACTIVE_ENABLED=true) ─────
    async function* stream(messages, { model, maxTokens } = {}) {
        if (!_interactiveEnabled) throw new Error('فیچرهای تعاملی AI هنوز فعال نشده‌اند.');
        const request = timeoutRequest({
            method:  'POST',
            headers: requestHeaders(),
            body: JSON.stringify({ messages, model, max_tokens: maxTokens }),
        }, 60000);
        try {
            const res = await fetch(`${BACKEND_URL}/api/ai/chat/stream`, request.options);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `خطای سرور: ${res.status}`);
            }

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const parseLine = line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) return '';
                try {
                    const json = JSON.parse(trimmed.slice(6));
                    return json.choices?.[0]?.delta?.content || '';
                } catch { return ''; }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    const delta = parseLine(line);
                    if (delta) yield delta;
                }
            }
            const finalDelta = parseLine(buffer);
            if (finalDelta) yield finalDelta;
        } finally {
            request.cleanup();
        }
    }

    // ─── Context builder (برای interactive) ──────────────────────────────
    function setContextProvider(provider) {
        if (typeof provider !== 'function') throw new TypeError('Context provider must be a function');
        _contextProvider = provider;
    }

    function buildStudentContext() {
        // The transport layer does not know about DOM or planner state.
        return String(_contextProvider() || '');
    }

    // ─── Public API ───────────────────────────────────────────────────────
    return {
        BACKEND_URL,
        checkHealth,
        isConfigured,
        isInteractiveEnabled,
        complete,
        stream,
        setContextProvider,
        buildStudentContext,
    };
})();

// بررسی health سرور هنگام load صفحه
document.addEventListener('DOMContentLoaded', () => AI.checkHealth());
