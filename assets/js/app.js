// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const courses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];

const state = {
    selected: new Set(),           // IDs of selected courses
    activeSidebarTab: 'search',
    cohort: localStorage.getItem('selectedCohort') || '',
    curriculum: { passed: new Set(), failed: new Set() },
};

const KEYS = {
    schedule: 'uni_schedule_v2',
    curriculum: 'uni_curriculum_v2',
    cohort: 'selectedCohort',
};
const MAX_UNITS = 20;

// Faculty → color mapping (built at init)
const facultyColors = {};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
function init() {
    buildFacultyColors();
    loadState();
    setupFilters();
    buildTimetableGrid();
    renderCourseList();
    updateTimetable();
    updateUnitDisplay();

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(renderCourseList, 280));
    document.getElementById('facultyFilter').addEventListener('change', () => { rebuildGroupFilter(); renderCourseList(); syncCurriculumTab(); });
    document.getElementById('groupFilter').addEventListener('change', () => { renderCourseList(); syncCurriculumTab(); });
    document.getElementById('genderFilter').addEventListener('change', renderCourseList);
}

// ═══════════════════════════════════════════════════════════════════════════
// FACULTY COLORS
// ═══════════════════════════════════════════════════════════════════════════
function buildFacultyColors() {
    [...new Set(courses.map(c => c.faculty))].sort().forEach((f, i) => {
        facultyColors[f] = FACULTY_PALETTE[i % FACULTY_PALETTE.length];
    });
}

function getFacultyColor(faculty) {
    return facultyColors[faculty] || '#3b82f6';
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════
function saveState() {
    localStorage.setItem(KEYS.schedule, JSON.stringify({
        selected: [...state.selected],
        ts: Date.now()
    }));
}

function loadState() {
    try {
        const raw = localStorage.getItem(KEYS.schedule);
        if (raw) {
            const d = JSON.parse(raw);
            const age = (Date.now() - d.ts) / 86400000;
            if (age < 60) d.selected.forEach(id => { if (courses.some(c => c.id === id)) state.selected.add(id); });
        }
    } catch (e) { /* ignore */ }
    try {
        const raw = localStorage.getItem(KEYS.curriculum);
        if (raw) {
            const d = JSON.parse(raw);
            state.curriculum.passed = new Set(d.passed || []);
            state.curriculum.failed = new Set(d.failed || []);
        }
    } catch (e) { /* ignore */ }
}

function saveCurriculumState() {
    localStorage.setItem(KEYS.curriculum, JSON.stringify({
        passed: [...state.curriculum.passed],
        failed: [...state.curriculum.failed],
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR TABS
// ═══════════════════════════════════════════════════════════════════════════
function switchTab(tab) {
    state.activeSidebarTab = tab;
    ['search', 'curriculum'].forEach(t => {
        document.getElementById(`tabBtn${t[0].toUpperCase() + t.slice(1)}`)
            .classList.toggle('active', t === tab);
        document.getElementById(`tab${t[0].toUpperCase() + t.slice(1)}`)
            .classList.toggle('active', t === tab);
    });
    if (tab === 'curriculum') renderCurriculumTab();
}

function syncCurriculumTab() {
    if (state.activeSidebarTab === 'curriculum') renderCurriculumTab();
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERS & COURSE LIST
// ═══════════════════════════════════════════════════════════════════════════
function setupFilters() {
    const sel = document.getElementById('facultyFilter');
    const faculties = [...new Set(courses.map(c => c.faculty))].sort();
    faculties.forEach(f => sel.add(new Option(f, f)));
}

function rebuildGroupFilter() {
    const fac = document.getElementById('facultyFilter').value;
    const sel = document.getElementById('groupFilter');
    sel.innerHTML = '<option value="">همه گروه‌ها</option>';
    const subset = fac ? courses.filter(c => c.faculty === fac) : courses;
    [...new Set(subset.map(c => c.group))].sort().forEach(g => sel.add(new Option(g, g)));
}

function renderCourseList() {
    const term = normalizeStr(document.getElementById('searchInput').value).toLowerCase();
    const fac  = document.getElementById('facultyFilter').value;
    const grp  = document.getElementById('groupFilter').value;
    const gen  = document.getElementById('genderFilter').value;

    const filtered = courses.filter(c => {
        const nm = normalizeStr(c.name).toLowerCase();
        const pr = normalizeStr(c.prof).toLowerCase();
        const id = normalizeStr(c.id);
        return (!fac  || c.faculty === fac) &&
               (!grp  || c.group  === grp) &&
               (!gen  || c.gender.includes(gen)) &&
               (!term || nm.includes(term) || id.includes(term) || pr.includes(term));
    });

    document.getElementById('courseCount').textContent =
        `${toPersianNum(filtered.length)} درس`;
    document.getElementById('selectedStat').textContent =
        state.selected.size ? `${toPersianNum(state.selected.size)} انتخاب‌شده` : '';

    const list = document.getElementById('courseList');
    list.innerHTML = '';

    if (!filtered.length) {
        list.innerHTML = `<div class="empty-state" style="padding:40px 0">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">نتیجه‌ای یافت نشد</div>
        </div>`;
        return;
    }

    const frag = document.createDocumentFragment();
    filtered.slice(0, 100).forEach(c => {
        const isSelected = state.selected.has(c.id);
        const color  = getFacultyColor(c.faculty);
        const cap    = c.capacity || 0;
        const enr    = c.enrolled || 0;
        const capPct = cap > 0 ? Math.min(100, Math.round(enr / cap * 100)) : 0;
        const capClass = capPct >= 90 ? 'full' : capPct >= 60 ? 'half' : '';

        let gClass = 'badge-mixed';
        if (c.gender.includes('مرد') || c.gender.includes('برادر')) gClass = 'badge-male';
        if (c.gender.includes('زن')  || c.gender.includes('خواهر')) gClass = 'badge-female';

        const el = document.createElement('div');
        el.className = `course-card${isSelected ? ' selected' : ''}`;
        el.style.setProperty('--fc', color);
        el.onclick = () => toggleCourse(c.id);
        el.innerHTML = `
            <div class="course-card-name">${c.name}</div>
            <div class="course-card-meta">
                <span class="course-card-id">${c.id}</span>
                <div style="display:flex;gap:4px;align-items:center">
                    ${c.units ? `<span class="badge badge-unit">${toPersianNum(c.units)}و</span>` : ''}
                    <span class="badge ${gClass}">${c.gender}</span>
                </div>
            </div>
            <div class="course-card-prof">${c.prof}</div>
            ${cap > 0 ? `
            <div class="capacity-bar" title="ظرفیت: ${toPersianNum(enr)}/${toPersianNum(cap)}">
                <div class="capacity-bar-fill ${capClass}" style="width:${capPct}%"></div>
            </div>` : ''}
        `;
        frag.appendChild(el);
    });

    if (filtered.length > 100) {
        const note = document.createElement('p');
        note.style.cssText = 'text-align:center;font-size:.72rem;color:var(--t3);padding:10px 0;';
        note.textContent = `... و ${toPersianNum(filtered.length - 100)} درس دیگر. جستجو را دقیق‌تر کنید.`;
        frag.appendChild(note);
    }
    list.appendChild(frag);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE COURSE SELECTION
// ═══════════════════════════════════════════════════════════════════════════
function toggleCourse(id) {
    if (state.selected.has(id)) {
        state.selected.delete(id);
    } else {
        state.selected.add(id);
        const c = courses.find(x => x.id === id);
        if (c) Toast.info(`${c.name} اضافه شد`, 2000);
    }
    saveState();
    renderCourseList();
    updateTimetable();
    updateUnitDisplay();
    if (state.activeSidebarTab === 'curriculum') renderCurriculumTab();
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIT DISPLAY
// ═══════════════════════════════════════════════════════════════════════════
function updateUnitDisplay() {
    let total = 0;
    state.selected.forEach(id => {
        const c = courses.find(x => x.id === id);
        if (c) total += c.units || 0;
    });

    const pct  = Math.min(100, Math.round(total / MAX_UNITS * 100));
    const fill = document.getElementById('unitBarFill');
    const countEl = document.getElementById('unitCount');
    const display = document.getElementById('unitDisplay');
    const info  = document.getElementById('selectedInfo');

    if (countEl)  countEl.textContent = toPersianNum(total);
    if (fill) {
        fill.style.width = `${pct}%`;
        fill.style.background = total > MAX_UNITS ? 'var(--red)' : total > MAX_UNITS * 0.8 ? 'var(--yellow)' : 'var(--blue)';
    }
    if (display) {
        display.classList.toggle('warning', total > MAX_UNITS * 0.8 && total <= MAX_UNITS);
        display.classList.toggle('danger',  total > MAX_UNITS);
    }
    if (info) {
        if (state.selected.size > 0) {
            info.style.display = 'block';
            info.textContent = `${toPersianNum(state.selected.size)} درس انتخاب‌شده — ${toPersianNum(total)} واحد${total > MAX_UNITS ? ' (بیشتر از حد مجاز)' : ''}`;
            info.style.color = total > MAX_UNITS ? 'var(--red)' : 'var(--t3)';
        } else {
            info.style.display = 'none';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════
function buildTimetableGrid() {
    const tbl = document.getElementById('timetable');
    tbl.innerHTML = '';
    const days = ['ساعت', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    days.forEach(d => {
        const el = document.createElement('div');
        el.className = d === 'ساعت' ? 'timetable-header' : 'timetable-header';
        el.textContent = d;
        if (d === 'ساعت') el.style.cssText = 'background:transparent;color:var(--t3);font-size:.7rem;';
        tbl.appendChild(el);
    });
    const labels = ['۸–۱۰', '۱۰–۱۲', '۱۳–۱۵', '۱۵–۱۷', '۱۷–۱۹'];
    TIME_SLOTS.forEach((t, i) => {
        const label = document.createElement('div');
        label.className = 'time-label';
        label.textContent = labels[i];
        tbl.appendChild(label);
        for (let d = 0; d < 5; d++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = `slot-${d}-${t}`;
            tbl.appendChild(slot);
        }
    });
}

function updateTimetable() {
    document.querySelectorAll('.slot').forEach(el => el.innerHTML = '');
    const slotMap = {};

    state.selected.forEach(id => {
        const c = courses.find(x => x.id === id);
        if (!c) return;
        parseSchedule(c.time_html).forEach(sess => {
            const key = `${sess.day}-${sess.slot}`;
            (slotMap[key] ??= []).push({ id, name: c.name, prof: c.prof, faculty: c.faculty, isTA: sess.isTA, location: sess.location });
        });
    });

    Object.entries(slotMap).forEach(([key, blocks]) => {
        const el = document.getElementById(`slot-${key}`);
        if (!el) return;
        const uniqueIds = new Set(blocks.map(b => b.id));
        const hasConflict = uniqueIds.size > 1;

        blocks.forEach(b => {
            const color = hasConflict ? null : getFacultyColor(b.faculty);
            const div = document.createElement('div');
            div.className = `class-block${hasConflict ? ' conflict' : ''}`;
            if (color) { div.style.background = color; div.style.backgroundImage = `linear-gradient(160deg, ${color}dd, ${color}99)`; }
            div.title = `${b.name}\n${b.prof}${b.location ? '\n📍 ' + b.location : ''}`;

            const rm = document.createElement('div');
            rm.className = 'remove-btn'; rm.innerHTML = '×';
            rm.onclick = e => { e.stopPropagation(); toggleCourse(b.id); };
            div.appendChild(rm);

            const content = document.createElement('div');
            content.innerHTML = `
                <div class="class-block-name">${b.name}${b.isTA ? ' <small>(ت)</small>' : ''}</div>
                <div class="class-block-prof">${b.prof}</div>
                ${b.location ? `<div class="class-block-loc">${b.location}</div>` : ''}
            `;
            div.appendChild(content);
            el.appendChild(div);
        });
    });

    updateFacultyLegend(slotMap);
}

function updateFacultyLegend(slotMap) {
    const used = new Set();
    Object.values(slotMap).flat().forEach(b => used.add(b.faculty));
    const legend = document.getElementById('facultyLegend');
    if (!legend) return;
    if (used.size <= 1) { legend.innerHTML = ''; return; }
    legend.innerHTML = [...used].map(f => `
        <span class="faculty-legend-item">
            <span class="faculty-legend-dot" style="background:${getFacultyColor(f)}"></span>
            ${f}
        </span>`).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRICULUM TRACKER
// ═══════════════════════════════════════════════════════════════════════════
function getCurrentCurriculum() {
    if (typeof CURRICULUM_REGISTRY === 'undefined') return null;
    const fac = document.getElementById('facultyFilter').value;
    const grp = document.getElementById('groupFilter').value;
    if (!fac || !grp) return null;
    return CURRICULUM_REGISTRY[`${fac} >> ${grp}`] || null;
}

function getCodeForCohort(cur) {
    if (!cur.codes) return null;
    return cur.codes[state.cohort] || cur.codes['*'] || null;
}

function isOfferedThisSemester(cur) {
    const code = getCodeForCohort(cur);
    return code ? courses.some(c => c.id.startsWith(code + '_')) : false;
}

function isTakingThisSemester(cur) {
    const code = getCodeForCohort(cur);
    return code ? courses.some(c => c.id.startsWith(code + '_') && state.selected.has(c.id)) : false;
}

function getCourseStatus(id, data) {
    const cur = data?.courses.find(c => c.id === id);
    if (cur && isTakingThisSemester(cur)) return 'taking';
    if (state.curriculum.passed.has(id)) return 'passed';
    if (state.curriculum.failed.has(id)) return 'failed';
    if (!cur?.prereqs?.length) return 'available';
    return cur.prereqs.every(pid => state.curriculum.passed.has(pid)) ? 'available' : 'locked';
}

function toggleCurriculumCourse(id) {
    const data = getCurrentCurriculum();
    const st = getCourseStatus(id, data);
    if (st === 'locked') return;
    if (state.curriculum.passed.has(id)) {
        state.curriculum.passed.delete(id); state.curriculum.failed.add(id);
    } else if (state.curriculum.failed.has(id)) {
        state.curriculum.failed.delete(id);
    } else {
        state.curriculum.passed.add(id);
    }
    saveCurriculumState();
    renderCurriculumTab();
}

function onCohortChange() {
    state.cohort = document.getElementById('cohortSelect').value;
    localStorage.setItem(KEYS.cohort, state.cohort);
    renderCurriculumTab();
}

function renderCurriculumTab() {
    const container = document.getElementById('curriculumScroll');
    const controls  = document.getElementById('curriculumControls');
    const fac = document.getElementById('facultyFilter').value;
    const grp = document.getElementById('groupFilter').value;

    if (!fac || !grp) {
        controls.style.display = 'none';
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🗺️</div>
            <div class="empty-state-title">نقشه درسی</div>
            <div class="empty-state-desc">از تب جستجو، یک دانشکده و گروه انتخاب کنید.</div>
        </div>`;
        return;
    }

    const data = getCurrentCurriculum();
    if (!data) {
        controls.style.display = 'none';
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🚧</div>
            <div class="empty-state-title">هنوز اضافه نشده</div>
            <div class="empty-state-desc">نقشه درسی «${grp}» موجود نیست. از پنل ادمین وارد کنید.</div>
        </div>`;
        return;
    }

    // Setup cohort selector
    controls.style.display = 'block';
    const cohortEl = document.getElementById('cohortSelect');
    if (cohortEl.dataset.forGroup !== `${fac}|${grp}`) {
        cohortEl.innerHTML = '';
        (data.cohorts || []).forEach(c => cohortEl.add(new Option(`ورودی ${c}`, c)));
        cohortEl.dataset.forGroup = `${fac}|${grp}`;
        if (state.cohort && data.cohorts?.includes(state.cohort)) {
            cohortEl.value = state.cohort;
        } else {
            state.cohort = data.cohorts?.[data.cohorts.length - 1] || '';
            cohortEl.value = state.cohort;
            localStorage.setItem(KEYS.cohort, state.cohort);
        }
    }

    // Build semester map
    const semMap = {};
    data.courses.forEach(c => (semMap[c.semester] ??= []).push(c));
    const semNames = ['اول','دوم','سوم','چهارم','پنجم','ششم','هفتم','هشتم'];

    const recs = data.courses.filter(c => {
        const st = getCourseStatus(c.id, data);
        return st === 'available' && isOfferedThisSemester(c);
    }).sort((a, b) => a.semester - b.semester);

    const statusTooltip = {
        taking:    'در حال اخذ — کلیک برای علامت‌گذاری پاس',
        passed:    'پاس شده — کلیک: تبدیل به افتاده',
        failed:    'افتاده — کلیک: حذف علامت',
        available: 'در دسترس — کلیک برای علامت‌گذاری پاس',
        locked:    'قفل: پیش‌نیاز لازم است',
    };

    let html = '';
    Object.keys(semMap).map(Number).sort((a, b) => a - b).forEach(sem => {
        const semCourses = semMap[sem];
        const semUnits = semCourses.reduce((acc, c) => acc + (c.units || 0), 0);
        html += `<div class="sem-block">
            <div class="sem-title">
                ترم ${semNames[sem - 1] || sem}
                <span class="sem-units">${toPersianNum(semUnits)} واحد</span>
            </div>
            <div class="cur-grid">`;

        semCourses.forEach(c => {
            const st = getCourseStatus(c.id, data);
            const offered = isOfferedThisSemester(c);
            const offeredDot = (offered && st !== 'passed' && st !== 'taking')
                ? `<span class="offered-dot" title="این ترم ارائه می‌شود"></span>` : '';

            html += `
                <div class="cur-card ${st}" onclick="toggleCurriculumCourse('${c.id}')"
                     title="${statusTooltip[st] || ''}">
                    <div class="cur-card-name">${c.name}</div>
                    <div class="cur-card-footer">
                        <span class="cur-card-units">${toPersianNum(c.units)} واحد</span>
                        <div style="display:flex;align-items:center;gap:4px;">
                            ${offeredDot}
                            <span class="cur-status-dot"></span>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div></div>';
    });

    if (recs.length) {
        html += `<div class="rec-section">
            <div class="rec-title">💡 پیشنهاد این ترم (${toPersianNum(recs.length)} درس)</div>`;
        recs.slice(0, 6).forEach(c => {
            html += `<div class="rec-item" onclick="jumpToSearch('${c.id}')">
                <span>${c.name}</span>
                <span class="badge badge-unit">${toPersianNum(c.units)}و</span>
            </div>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function jumpToSearch(courseId) {
    const data = getCurrentCurriculum();
    if (!data) return;
    const cur = data.courses.find(c => c.id === courseId);
    if (!cur) return;
    const code = getCodeForCohort(cur);
    if (!code) return;
    switchTab('search');
    document.getElementById('searchInput').value = code;
    renderCourseList();
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════
function onToggleTheme() {
    const next = Theme.toggle();
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = next === 'light' ? '🌙' : '🌗';
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMS
// ═══════════════════════════════════════════════════════════════════════════
function openExamModal() {
    const body = document.getElementById('examBody');
    body.innerHTML = '';

    const list = [...state.selected]
        .map(id => courses.find(c => c.id === id)).filter(Boolean)
        .sort((a, b) => {
            const da = extractDate(a.exam_text), db = extractDate(b.exam_text);
            if (da === '—') return 1; if (db === '—') return -1;
            return da.localeCompare(db);
        });

    if (!list.length) {
        body.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--t3);padding:24px">هیچ درسی انتخاب نشده</td></tr>`;
    } else {
        const dateCounts = {};
        list.forEach(c => { const d = extractDate(c.exam_text); if (d !== '—') dateCounts[d] = (dateCounts[d] || 0) + 1; });
        list.forEach(c => {
            const date = extractDate(c.exam_text), time = extractTime(c.exam_text);
            const tr = document.createElement('tr');
            if (date !== '—' && dateCounts[date] > 1) tr.className = 'row-danger';
            tr.innerHTML = `<td>${c.name}</td><td>${date}</td><td>${time}</td>`;
            body.appendChild(tr);
        });
    }
    document.getElementById('examModal').classList.add('open');
}

function closeExamModal() { document.getElementById('examModal').classList.remove('open'); }

function extractDate(txt) {
    const m = txt?.match(/امتحان.*?\((\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2})\)/);
    return m ? m[1] : '—';
}
function extractTime(txt) {
    const m = txt?.match(/امتحان.*?ساعت\s*:\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
    return m ? m[1] : '—';
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT FROM GOLESTAN EXTENSION
// ═══════════════════════════════════════════════════════════════════════════
function importGolestanFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.type === 'offered_courses') {
                Toast.info(`${toPersianNum(data.courses?.length || 0)} درس استخراج‌شده. فایل data.js را جایگزین کنید.`, 6000);
            } else {
                Toast.error('فرمت فایل شناخته نشد.');
            }
        } catch (err) { Toast.error('خطا در خواندن فایل: ' + err.message); }
        input.value = '';
    };
    reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════
init();
