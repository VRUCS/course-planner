// professor.js — داشبورد استاد
// utils.js قبلاً بارگذاری شده: normalizeStr, toPersianNum, getDayIndex, parseSchedule, sessionsOverlap, Theme

const allCourses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];
const rules = (typeof CONFLICT_RULES !== 'undefined') ? CONFLICT_RULES : {};

// ─── Init ─────────────────────────────────────────────────────────────────
function init() {
    const faculties = [...new Set(allCourses.map(c => c.faculty))].sort();
    const sel = document.getElementById('facultySelect');
    faculties.forEach(f => sel.add(new Option(f, f)));
    buildEmptyTimetable();
}

// ─── Filter handlers ──────────────────────────────────────────────────────
function onFacultyChange() {
    const fac = document.getElementById('facultySelect').value;
    const grp = document.getElementById('groupSelect');
    grp.innerHTML = '<option value="">انتخاب گروه...</option>';
    if (fac) {
        const groups = [...new Set(allCourses.filter(c => c.faculty === fac).map(c => c.group))].sort();
        groups.forEach(g => grp.add(new Option(g, g)));
    }
    render();
}

// ─── Conflict detection ───────────────────────────────────────────────────
function detectPairConflicts(baseA, baseB, groupCourses) {
    const sectA = groupCourses.filter(c => c.id.startsWith(baseA + '_'));
    const sectB = groupCourses.filter(c => c.id.startsWith(baseB + '_'));
    const conflicts = [];
    sectA.forEach(a => {
        const sessA = parseSchedule(a.time_html);
        sectB.forEach(b => {
            const sessB = parseSchedule(b.time_html);
            if (sessionsOverlap(sessA, sessB)) {
                const overlappingSlots = sessA
                    .filter(sa => sessB.some(sb => sa.day === sb.day && sa.slot === sb.slot))
                    .map(sa => `${['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه'][sa.day]} ${sa.slot}:00`);
                conflicts.push({ secA: a.id, secB: b.id, times: overlappingSlots });
            }
        });
    });
    return conflicts;
}

// ─── Main render ──────────────────────────────────────────────────────────
function render() {
    const fac = document.getElementById('facultySelect').value;
    const grp = document.getElementById('groupSelect').value;
    const filterType = document.getElementById('conflictFilter').value;

    if (!fac || !grp) {
        buildEmptyTimetable();
        setSummary(0, 0, 0, 0);
        document.getElementById('conflictList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">ابتدا یک گروه انتخاب کنید</div>
            </div>`;
        return;
    }

    document.getElementById('ttTitle').textContent = `برنامه هفتگی — ${fac} / ${grp}`;
    const groupCourses = allCourses.filter(c => c.faculty === fac && c.group === grp);
    const ruleset = rules[`${fac} >> ${grp}`] || { mustNotConflict: [], shouldNotConflict: [] };

    const allConflicts = [];
    if (filterType !== 'soft') {
        (ruleset.mustNotConflict || []).forEach(rule => {
            const overlaps = detectPairConflicts(rule.a, rule.b, groupCourses);
            if (overlaps.length) allConflicts.push({ type: 'hard', rule, overlaps });
        });
    }
    if (filterType !== 'hard') {
        (ruleset.shouldNotConflict || []).forEach(rule => {
            const overlaps = detectPairConflicts(rule.a, rule.b, groupCourses);
            if (overlaps.length) allConflicts.push({ type: 'soft', rule, overlaps });
        });
    }

    const hardIds = new Set(), softIds = new Set();
    allConflicts.forEach(({ type, overlaps }) => {
        overlaps.forEach(({ secA, secB }) => {
            const set = type === 'hard' ? hardIds : softIds;
            set.add(secA); set.add(secB);
        });
    });

    const totalPairs = (ruleset.mustNotConflict?.length || 0) + (ruleset.shouldNotConflict?.length || 0);
    const hardViol = allConflicts.filter(c => c.type === 'hard').length;
    const softViol = allConflicts.filter(c => c.type === 'soft').length;
    setSummary(groupCourses.length, hardViol, softViol, Math.max(0, totalPairs - hardViol - softViol));

    buildTimetable(groupCourses, hardIds, softIds);
    buildConflictList(allConflicts);
}

// ─── Timetable ────────────────────────────────────────────────────────────
function buildEmptyTimetable() {
    const tbl = document.getElementById('timetable');
    tbl.innerHTML = '';
    ['ساعت','شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه'].forEach((d, i) => {
        const el = document.createElement('div');
        el.className = 'timetable-header';
        el.textContent = d;
        if (i === 0) el.style.cssText = 'background:transparent;color:var(--t3);font-size:.7rem;';
        tbl.appendChild(el);
    });
    const labels = ['۸–۱۰','۱۰–۱۲','۱۳–۱۵','۱۵–۱۷','۱۷–۱۹'];
    ['08','10','13','15','17'].forEach((t, i) => {
        const lbl = document.createElement('div');
        lbl.className = 'time-label'; lbl.textContent = labels[i];
        tbl.appendChild(lbl);
        for (let d = 0; d < 5; d++) {
            const slot = document.createElement('div');
            slot.className = 'slot'; slot.id = `slot-${d}-${t}`;
            tbl.appendChild(slot);
        }
    });
}

function buildTimetable(groupCourses, hardIds, softIds) {
    buildEmptyTimetable();
    const slotMap = {};
    groupCourses.forEach(course => {
        parseSchedule(course.time_html).forEach(sess => {
            const key = `${sess.day}-${sess.slot}`;
            (slotMap[key] ??= []).push(course);
        });
    });

    Object.entries(slotMap).forEach(([key, blockCourses]) => {
        const el = document.getElementById(`slot-${key}`);
        if (!el) return;
        blockCourses.forEach(c => {
            const isHard = hardIds.has(c.id);
            const isSoft = !isHard && softIds.has(c.id);
            const div = document.createElement('div');
            div.className = `class-block${isHard ? ' conflict' : ''}`;
            if (!isHard) {
                const color = isSoft ? 'var(--yellow)' : 'var(--blue)';
                div.style.background = color;
                if (isSoft) div.style.backgroundImage = `linear-gradient(160deg,${color}cc,${color}88)`;
                else div.style.backgroundImage = `linear-gradient(160deg,${color}dd,${color}99)`;
            }
            div.title = `${c.name}\n${c.prof}\n${c.id}`;
            div.innerHTML = `
                <div class="class-block-name">${c.name}</div>
                <div class="class-block-prof" style="font-size:.58rem;opacity:.7">${c.id}</div>
            `;
            el.appendChild(div);
        });
    });
}

// ─── Conflict list ────────────────────────────────────────────────────────
function buildConflictList(conflicts) {
    const list = document.getElementById('conflictList');
    if (!conflicts.length) {
        list.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">✅</div>
            <div class="empty-state-title">هیچ تداخلی یافت نشد</div>
            <div class="empty-state-desc">برنامه این گروه با قوانین تعریف‌شده سازگار است.</div>
        </div>`;
        return;
    }

    list.innerHTML = conflicts.map(({ type, rule, overlaps }) => {
        const timePills = [...new Set(overlaps.flatMap(o => o.times))]
            .map(t => `<span class="time-chip">${t}</span>`).join('');
        const sections = overlaps.map(o => `${o.secA} ↔ ${o.secB}`)
            .map(s => `<div style="font-size:.68rem;color:var(--t2);margin-top:2px">${s}</div>`).join('');
        return `
            <div class="conflict-card ${type}">
                <div class="conflict-header">
                    <span class="conflict-severity ${type}">${type === 'hard' ? '⛔ سخت' : '⚠️ نرم'}</span>
                </div>
                <div class="conflict-pair">${rule.nameA} ↔ ${rule.nameB}</div>
                <div class="conflict-sections">${sections}</div>
                <div class="conflict-reason">${rule.reason}</div>
                <div class="conflict-times">${timePills}</div>
            </div>`;
    }).join('');
}

function setSummary(total, hard, soft, ok) {
    document.getElementById('sumTotal').textContent = toPersianNum(total);
    document.getElementById('sumHard').textContent  = toPersianNum(hard);
    document.getElementById('sumSoft').textContent  = toPersianNum(soft);
    document.getElementById('sumOk').textContent    = toPersianNum(ok);
}

init();
