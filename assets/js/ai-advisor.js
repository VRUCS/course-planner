/**
 * ai-advisor.js — دستیار مشاور انتخاب واحد
 * نیاز دارد: ai.js، utils.js، app.js (برای context)
 */

const Advisor = (() => {

    let history = [];
    let isOpen  = false;
    let isTyping = false;

    // ─── System prompt ────────────────────────────────────────────────────────
    function buildSystemPrompt() {
        const ctx = AI.buildStudentContext();
        return `تو یک دستیار مشاور تحصیلی دانشگاهی هستی که در انتخاب واحد کمک می‌کنی.

اطلاعات دانشجو:
${ctx || 'اطلاعاتی در دسترس نیست.'}

قوانین پاسخ‌دادن:
- همیشه به فارسی روان پاسخ بده
- پاسخ‌هایت کوتاه و مفید باشد (حداکثر ۱۵۰ کلمه)
- از اطلاعات دانشجو برای شخصی‌سازی پاسخ استفاده کن
- اگر اطلاعات کافی نداری، بگو که دانشجو باید رشته‌اش را از تب جستجو انتخاب کند
- پیشنهادهات واقع‌بینانه و براساس داده‌های موجود باشد`;
    }

    // ─── UI helpers ───────────────────────────────────────────────────────────
    function getPanel()    { return document.getElementById('aiPanel'); }
    function getMessages() { return document.getElementById('aiMessages'); }
    function getInput()    { return document.getElementById('aiInput'); }

    function open() {
        if (isOpen) return;
        isOpen = true;
        getPanel().classList.add('open');
        getInput()?.focus();
        if (history.length === 0) appendWelcome();
    }

    function close() {
        isOpen = false;
        getPanel().classList.remove('open');
    }

    function toggle() { isOpen ? close() : open(); }

    function appendWelcome() {
        const configured = AI.isConfigured();
        const msg = configured
            ? 'سلام! من دستیار انتخاب واحد هستم. می‌توانی از من درباره برنامه‌ات، پیش‌نیازها، یا پیشنهاد درس بپرسی. 😊'
            : '⚠️ برای استفاده از دستیار، کلید API را در **پنل ادمین ← تنظیمات AI** وارد کنید.';
        appendMessage('assistant', msg);
    }

    function appendMessage(role, content, streaming = false) {
        const msgs = getMessages();
        if (!msgs) return;

        const bubble = document.createElement('div');
        bubble.className = `ai-msg ai-msg-${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'ai-avatar';
        avatar.textContent = role === 'assistant' ? '🤖' : '👤';

        const text = document.createElement('div');
        text.className = 'ai-bubble';
        text.innerHTML = formatMessage(content);
        if (streaming) text.dataset.streaming = '1';

        bubble.appendChild(avatar);
        bubble.appendChild(text);
        msgs.appendChild(bubble);
        msgs.scrollTop = msgs.scrollHeight;
        return text; // برای streaming
    }

    function formatMessage(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    function showTypingIndicator() {
        const msgs = getMessages();
        if (!msgs || isTyping) return;
        isTyping = true;
        const el = document.createElement('div');
        el.className = 'ai-msg ai-msg-assistant';
        el.id = 'aiTyping';
        el.innerHTML = `<div class="ai-avatar">🤖</div>
            <div class="ai-bubble ai-typing-bubble">
                <span></span><span></span><span></span>
            </div>`;
        msgs.appendChild(el);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function hideTypingIndicator() {
        isTyping = false;
        document.getElementById('aiTyping')?.remove();
    }

    // ─── Send message ─────────────────────────────────────────────────────────
    async function send(text) {
        text = text.trim();
        if (!text || isTyping) return;

        if (!AI.isConfigured()) {
            open();
            Toast.warning('کلید API تنظیم نشده. به پنل ادمین بروید.');
            return;
        }

        appendMessage('user', text);
        clearInput();

        history.push({ role: 'user', content: text });
        showTypingIndicator();

        const messages = [
            { role: 'system', content: buildSystemPrompt() },
            ...history.slice(-10), // حداکثر ۱۰ پیام آخر برای صرفه‌جویی در توکن
        ];

        try {
            hideTypingIndicator();
            const bubbleEl = appendMessage('assistant', '', true);
            let fullResponse = '';

            for await (const chunk of AI.stream(messages)) {
                fullResponse += chunk;
                bubbleEl.innerHTML = formatMessage(fullResponse);
                const msgs = getMessages();
                if (msgs) msgs.scrollTop = msgs.scrollHeight;
            }

            delete bubbleEl.dataset.streaming;
            history.push({ role: 'assistant', content: fullResponse });

        } catch (e) {
            hideTypingIndicator();
            appendMessage('assistant', `⚠️ خطا: ${e.message}`);
        }
    }

    function clearInput() {
        const inp = getInput();
        if (inp) { inp.value = ''; inp.style.height = 'auto'; }
    }

    function clearHistory() {
        history = [];
        const msgs = getMessages();
        if (msgs) msgs.innerHTML = '';
        appendWelcome();
    }

    // ─── پیشنهادهای سریع ─────────────────────────────────────────────────────
    const QUICK_PROMPTS = [
        'چه درس‌هایی برای این ترم پیشنهاد می‌دی؟',
        'برنامه‌ام خیلی سنگینه؟',
        'با وضع فعلیم کِی فارغ‌التحصیل می‌شم؟',
    ];

    // ─── Public API ───────────────────────────────────────────────────────────
    return { open, close, toggle, send, clearHistory, QUICK_PROMPTS };

})();

// ─── Global event handlers (called from HTML) ─────────────────────────────
function aiSendFromInput() {
    const inp = document.getElementById('aiInput');
    if (inp?.value.trim()) Advisor.send(inp.value);
}

function aiHandleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        aiSendFromInput();
    }
}

function aiQuickPrompt(text) { Advisor.send(text); }
