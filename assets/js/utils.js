/**
 * utils.js — توابع مشترک سراسری
 * این فایل قبل از تمام فایل‌های JS دیگر بارگذاری می‌شود.
 */

// ─── Theme ────────────────────────────────────────────────────────────────────
const Theme = {
    apply() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    },
    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        return next;
    },
    current() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }
};
Theme.apply();

// ─── Toast notifications ──────────────────────────────────────────────────────
const Toast = (() => {
    let container;
    function getContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };

    function show(message, type = 'info', duration = 4000) {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `
            <span class="toast-icon">${icons[type] || '•'}</span>
            <span class="toast-msg">${message}</span>
            <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        `;
        getContainer().appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 350);
        }, duration);
        return el;
    }

    return {
        show,
        success: (msg, dur) => show(msg, 'success', dur),
        error:   (msg, dur) => show(msg, 'error',   dur || 6000),
        warning: (msg, dur) => show(msg, 'warning', dur),
        info:    (msg, dur) => show(msg, 'info',    dur),
    };
})();

// ─── String normalization ─────────────────────────────────────────────────────
function normalizeStr(str) {
    if (!str) return '';
    return str
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
        .replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
}

function toPersianNum(n) {
    return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

// ─── Day/schedule parsing ─────────────────────────────────────────────────────
const DAY_MAP = {
    'پنج شنبه': -1, 'پنجشنبه': -1,
    'چهار شنبه': 4, 'چهارشنبه': 4,
    'سه شنبه':   3, 'سهشنبه':   3,
    'دو شنبه':   2, 'دوشنبه':   2,
    'یک شنبه':   1, 'یکشنبه':   1,
    'شنبه':      0,
};
const DAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
const TIME_SLOTS = ['08', '10', '13', '15', '17'];

function getDayIndex(text) {
    const t = normalizeStr(text);
    for (const [name, idx] of Object.entries(DAY_MAP)) {
        if (t.includes(name)) return idx;
    }
    return -1;
}

function getTimeSlot(hour) {
    if (hour >= 7  && hour < 10) return '08';
    if (hour >= 10 && hour < 12) return '10';
    if (hour >= 13 && hour < 15) return '13';
    if (hour >= 15 && hour < 17) return '15';
    if (hour >= 17)              return '17';
    return null;
}

function parseSchedule(html) {
    const sessions = [];
    html.split(/<br\s*\/?>/i).forEach(line => {
        const text = normalizeStr(line);
        if (!text || text.includes('امتحان')) return;
        const day = getDayIndex(text);
        if (day === -1) return;
        const m = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        if (!m) return;
        const slot = getTimeSlot(parseInt(m[1]));
        if (!slot) return;
        const locM = text.match(/مکان:\s*(.+?)(?:\s*$)/);
        sessions.push({
            day,
            slot,
            isTA: text.includes('حل تمرین') || text.includes('(ع)'),
            location: locM ? locM[1].trim() : ''
        });
    });
    return sessions;
}

function sessionsOverlap(sessA, sessB) {
    return sessA.some(sa => sessB.some(sb => sa.day === sb.day && sa.slot === sb.slot));
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ─── Faculty color palette ────────────────────────────────────────────────────
// رنگ‌ها عمداً از رنگ‌های status (قرمز conflict، نارنجی warning) دور هستند
const FACULTY_PALETTE = [
    '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4',
    '#a855f7', '#2dd4bf', '#6366f1', '#22d3ee',
    '#34d399', '#818cf8', '#4ade80', '#38bdf8',
];
