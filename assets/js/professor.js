// ===== DATA =====
const allCourses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];
const rules = (typeof CONFLICT_RULES !== 'undefined') ? CONFLICT_RULES : {};

// ===== HELPERS =====
function normalizeStr(s) {
    if (!s) return '';
    return s.replace(/ي/g, 'ی').replace(/ك/g, 'ک')
        .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776)
        .replace(/\s+/g, ' ').trim();
}

function toPersianNum(n) {
    return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function getDayIndex(text) {
    const t = normalizeStr(text);
    if (t.includes('پنج شنبه') || t.includes('پنجشنبه')) return -1;
    if (t.includes('چهار شنبه') || t.includes('چهارشنبه')) return 4;
    if (t.includes('سه شنبه') || t.includes('سهشنبه')) return 3;
    if (t.includes('دو شنبه') || t.includes('دوشنبه')) return 2;
    if (t.includes('یک شنبه') || t.includes('یکشنبه')) return 1;
    if (t.includes('شنبه')) return 0;
    return -1;
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
        const startH = parseInt(m[1]);
        let slot = null;
        if (startH >= 7 && startH < 10) slot = '08';
        else if (startH >= 10 && startH < 12) slot = '10';
        else if (startH >= 13 && startH < 15) slot = '13';
        else if (startH >= 15 && startH < 17) slot = '15';
        else if (startH >= 17) slot = '17';
        if (slot) sessions.push({ day, slot, startH, endH: parseInt(m[3]) });
    });
    return sessions;
}

function sessionsOverlap(sessA, sessB) {
    return sessA.some(sa => sessB.some(sb => sa.day === sb.day && sa.slot === sb.slot));
}

// ===== SETUP DROPDOWNS =====
function init() {
    const faculties = [...new Set(allCourses.map(c => c.faculty))].sort();
    const fEl = document.getElementById('facultySelect');
    faculties.forEach(f => fEl.add(new Option(f, f)));

    applyTheme();
    renderEmptyTimetable();
}

function onFacultyChange() {
    const fac = document.getElementById('facultySelect').value;
    const gEl = document.getElementById('groupSelect');
    gEl.innerHTML = '<option value="">انتخاب گروه...</option>';
    if (!fac) { render(); return; }
    const groups = [...new Set(allCourses.filter(c => c.faculty === fac).map(c => c.group))].sort();
    groups.forEach(g => gEl.add(new Option(g, g)));
    render();
}

// ===== RULE KEY LOOKUP =====
function getRulesForGroup(faculty, group) {
    const key = `${faculty} >> ${group}`;
    return rules[key] || { mustNotConflict: [], shouldNotConflict: [] };
}

// ===== CONFLICT DETECTION =====
/**
 * For a given pair of base codes (a, b), finds all schedule overlaps
 * among the sections of course a and course b in the loaded data.
 * Returns list of { sectionA, sectionB, times: [string] }
 */
function detectPairConflicts(baseA, baseB, groupCourses) {
    const sectionsA = groupCourses.filter(c => c.id.startsWith(baseA + '_'));
    const sectionsB = groupCourses.filter(c => c.id.startsWith(baseB + '_'));
    const conflicts = [];

    sectionsA.forEach(secA => {
        const sessA = parseSchedule(secA.time_html);
        sectionsB.forEach(secB => {
            const sessB = parseSchedule(secB.time_html);
            if (sessionsOverlap(sessA, sessB)) {
                const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
                const times = sessA.filter(sa => sessB.some(sb => sa.day === sb.day && sa.slot === sb.slot))
                    .map(sa => `${dayNames[sa.day]} ${sa.slot}:00`);
                conflicts.push({ sectionA: secA.id, sectionB: secB.id, times });
            }
        });
    });
    return conflicts;
}

// ===== MAIN RENDER =====
function render() {
    const fac = document.getElementById('facultySelect').value;
    const grp = document.getElementById('groupSelect').value;
    if (!fac || !grp) {
        renderEmptyTimetable();
        updateSummary(0, 0, 0, 0);
        document.getElementById('conflictList').innerHTML = `
            <div class="no-conflict">
                <div class="no-conflict-icon">📋</div>
                <div>ابتدا یک گروه آموزشی انتخاب کنید.</div>
            </div>`;
        return;
    }

    document.getElementById('timetableTitle').textContent = `برنامه هفتگی — ${fac} / ${grp}`;

    const groupCourses = allCourses.filter(c => c.faculty === fac && c.group === grp);
    const ruleset = getRulesForGroup(fac, grp);
    const filterType = document.getElementById('conflictFilter').value;

    // Detect all conflicts
    const allConflicts = []; // { type, rule, overlaps }

    if (filterType !== 'soft') {
        (ruleset.mustNotConflict || []).forEach(rule => {
            const overlaps = detectPairConflicts(rule.a, rule.b, groupCourses);
            if (overlaps.length > 0) allConflicts.push({ type: 'hard', rule, overlaps });
        });
    }
    if (filterType !== 'hard') {
        (ruleset.shouldNotConflict || []).forEach(rule => {
            const overlaps = detectPairConflicts(rule.a, rule.b, groupCourses);
            if (overlaps.length > 0) allConflicts.push({ type: 'soft', rule, overlaps });
        });
    }

    // Build set of conflicting course IDs for timetable coloring
    const hardConflictIds = new Set();
    const softConflictIds = new Set();
    allConflicts.forEach(({ type, overlaps }) => {
        overlaps.forEach(({ sectionA, sectionB }) => {
            if (type === 'hard') { hardConflictIds.add(sectionA); hardConflictIds.add(sectionB); }
            else { softConflictIds.add(sectionA); softConflictIds.add(sectionB); }
        });
    });

    // Count totals for summary
    const totalMustPairs = (ruleset.mustNotConflict || []).length;
    const totalSoftPairs = (ruleset.shouldNotConflict || []).length;
    const hardViolations = allConflicts.filter(c => c.type === 'hard').length;
    const softViolations = allConflicts.filter(c => c.type === 'soft').length;
    const okPairs = (totalMustPairs + totalSoftPairs) - (hardViolations + softViolations);

    updateSummary(groupCourses.length, hardViolations, softViolations, Math.max(0, okPairs));
    renderTimetable(groupCourses, hardConflictIds, softConflictIds);
    renderConflictList(allConflicts);
}

// ===== TIMETABLE =====
function renderEmptyTimetable() {
    const tbl = document.getElementById('timetable');
    tbl.innerHTML = '';
    const days = ['ساعت', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'cell header';
        div.textContent = d;
        tbl.appendChild(div);
    });
    const timeSlots = ['08', '10', '13', '15', '17'];
    const timeLabels = ['۸–۱۰', '۱۰–۱۲', '۱۳–۱۵', '۱۵–۱۷', '۱۷–۱۹'];
    timeSlots.forEach((t, i) => {
        const td = document.createElement('div');
        td.className = 'cell time-label';
        td.textContent = timeLabels[i];
        tbl.appendChild(td);
        for (let d = 0; d < 5; d++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = `slot-${d}-${t}`;
            tbl.appendChild(slot);
        }
    });
}

function renderTimetable(groupCourses, hardConflictIds, softConflictIds) {
    renderEmptyTimetable();

    // Map course → slot entries
    const slotMap = {};
    groupCourses.forEach(course => {
        parseSchedule(course.time_html).forEach(sess => {
            const key = `${sess.day}-${sess.slot}`;
            if (!slotMap[key]) slotMap[key] = [];
            slotMap[key].push(course);
        });
    });

    Object.entries(slotMap).forEach(([key, blockCourses]) => {
        const slotEl = document.getElementById(`slot-${key}`);
        if (!slotEl) return;
        blockCourses.forEach(course => {
            const isHard = hardConflictIds.has(course.id);
            const isSoft = !isHard && softConflictIds.has(course.id);
            const div = document.createElement('div');
            div.className = `class-block${isHard ? ' hard-conflict' : isSoft ? ' soft-conflict' : ''}`;
            if (!isHard && !isSoft) div.style.background = '#3b82f6';
            div.title = `${course.name}\n${course.prof}\n${course.id}`;
            div.innerHTML = `
                <div class="class-block-name">${course.name}</div>
                <div class="class-block-id">${course.id}</div>
            `;
            slotEl.appendChild(div);
        });
    });
}

// ===== CONFLICT LIST =====
function renderConflictList(conflicts) {
    const list = document.getElementById('conflictList');
    if (conflicts.length === 0) {
        list.innerHTML = `
            <div class="no-conflict">
                <div class="no-conflict-icon">✅</div>
                <div>هیچ تداخلی یافت نشد!</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">
                    برنامه این گروه با قوانین تعریف‌شده سازگار است.
                </div>
            </div>`;
        return;
    }

    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    list.innerHTML = conflicts.map(({ type, rule, overlaps }) => {
        const timePills = [...new Set(overlaps.flatMap(o => o.times))].map(t =>
            `<span class="time-pill">${t}</span>`
        ).join('');

        const sectionPairs = overlaps.map(o =>
            `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">${o.sectionA} ↔ ${o.sectionB}</div>`
        ).join('');

        return `
            <div class="conflict-card ${type}">
                <div class="conflict-card-header">
                    <span class="conflict-badge ${type}">${type === 'hard' ? '⛔ سخت' : '⚠️ نرم'}</span>
                </div>
                <div class="conflict-course-pair">${rule.nameA} ↔ ${rule.nameB}</div>
                ${sectionPairs}
                <div class="conflict-reason">${rule.reason}</div>
                <div class="conflict-times">${timePills}</div>
            </div>`;
    }).join('');
}

// ===== SUMMARY =====
function updateSummary(total, hard, soft, ok) {
    document.getElementById('sumTotal').textContent = toPersianNum(total);
    document.getElementById('sumHard').textContent = toPersianNum(hard);
    document.getElementById('sumSoft').textContent = toPersianNum(soft);
    document.getElementById('sumOk').textContent = toPersianNum(ok);
}

// ===== THEME =====
function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function applyTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

// ===== BOOTSTRAP =====
init();
