// ===== STATE =====
let selectedCourses = new Set();
const courses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];
const STORAGE_KEY = 'uni_schedule_data';
const CURRICULUM_KEY = 'uni_curriculum_state';
const EXPIRY_DAYS = 60;

let curriculumState = {
    passedCourses: new Set(),
    failedCourses: new Set()
};
let selectedCohort = localStorage.getItem('selectedCohort') || '';

let activeSidebarTab = 'search';

// Faculty → CSS color (assigned at runtime)
const FACULTY_PALETTE = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ef4444', '#06b6d4', '#ec4899', '#f97316',
    '#84cc16', '#14b8a6'
];
let facultyColorMap = {}; // faculty name → hex color

// ===== INIT =====
function init() {
    setupFacultyColors();
    loadFromStorage();
    loadCurriculumState();
    setupFilters();
    renderTimetableGrid();
    renderList();
    updateTimetable(); // renderFacultyLegend داخل updateTimetable صدا می‌شه
    updateUnitCounter();

    document.getElementById('facultyFilter').addEventListener('change', () => {
        populateGroups(); renderList();
        if (activeSidebarTab === 'curriculum') renderCurriculumTab();
    });
    document.getElementById('groupFilter').addEventListener('change', () => {
        renderList();
        if (activeSidebarTab === 'curriculum') renderCurriculumTab();
    });
    document.getElementById('genderFilter').addEventListener('change', renderList);
    document.getElementById('searchInput').addEventListener('input', renderList);
}

// ===== FACULTY COLORS =====
function setupFacultyColors() {
    const faculties = [...new Set(courses.map(c => c.faculty))].sort();
    faculties.forEach((f, i) => {
        facultyColorMap[f] = FACULTY_PALETTE[i % FACULTY_PALETTE.length];
    });
}

function getFacultyColor(facultyName) {
    return facultyColorMap[facultyName] || '#60a5fa';
}

function renderFacultyLegend() {
    const legend = document.getElementById('facultyLegend');
    if (!legend) return;
    // فقط دانشکده‌هایی که درس‌های انتخاب‌شده دارند
    const usedFaculties = new Set();
    selectedCourses.forEach(id => {
        const c = courses.find(x => x.id === id);
        if (c) usedFaculties.add(c.faculty);
    });
    if (usedFaculties.size <= 1) { legend.innerHTML = ''; return; }
    legend.innerHTML = [...usedFaculties].map(f =>
        `<span class="legend-item">
            <span class="legend-dot" style="background:${getFacultyColor(f)}"></span>
            ${f}
        </span>`
    ).join('');
}

// ===== UNIT COUNTER =====
function getSelectedUnits() {
    let total = 0;
    selectedCourses.forEach(id => {
        const c = courses.find(x => x.id === id);
        if (c) total += (c.units || 0);
    });
    return total;
}

function updateUnitCounter() {
    const units = getSelectedUnits();
    const badge = document.getElementById('unitBadge');
    const countEl = document.getElementById('unitCount');
    const headerEl = document.getElementById('selectedCountHeader');

    countEl.textContent = toPersianNum(units);
    if (badge) {
        badge.classList.toggle('over-limit', units > 20);
        badge.title = units > 20 ? 'بیشتر از حد مجاز (۲۰ واحد)' : '';
    }
    if (headerEl) {
        const n = selectedCourses.size;
        headerEl.textContent = n > 0
            ? `${toPersianNum(n)} درس — ${toPersianNum(units)} واحد${units > 20 ? ' ⚠️' : ''}`
            : 'هیچ درسی انتخاب نشده';
    }
}

function toPersianNum(n) {
    return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
    activeSidebarTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tabBtn${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    if (tab === 'curriculum') renderCurriculumTab();
}

// ===== STORAGE =====
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selected: Array.from(selectedCourses),
        timestamp: Date.now()
    }));
}

function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        if ((Date.now() - data.timestamp) / 86400000 > EXPIRY_DAYS) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
        data.selected.forEach(id => {
            if (courses.some(c => c.id === id)) selectedCourses.add(id);
        });
    } catch (e) { console.error(e); }
}

function saveCurriculumState() {
    localStorage.setItem(CURRICULUM_KEY, JSON.stringify({
        passed: Array.from(curriculumState.passedCourses),
        failed: Array.from(curriculumState.failedCourses),
        timestamp: Date.now()
    }));
}

function loadCurriculumState() {
    const raw = localStorage.getItem(CURRICULUM_KEY);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        curriculumState.passedCourses = new Set(data.passed || []);
        curriculumState.failedCourses = new Set(data.failed || []);
    } catch (e) { console.error(e); }
}

// ===== HELPERS =====
function normalizeStr(str) {
    if (!str) return '';
    return str
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
        .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776)
        .replace(/\s+/g, ' ').trim();
}

// ===== FILTERS & COURSE LIST =====
function setupFilters() {
    const fEl = document.getElementById('facultyFilter');
    while (fEl.options.length > 1) fEl.remove(1);
    const faculties = [...new Set(courses.map(c => c.faculty))].sort();
    faculties.forEach(f => fEl.add(new Option(f, f)));
}

function populateGroups() {
    const fac = document.getElementById('facultyFilter').value;
    const gEl = document.getElementById('groupFilter');
    gEl.innerHTML = '<option value="">همه گروه‌ها</option>';
    const subset = fac ? courses.filter(c => c.faculty === fac) : courses;
    [...new Set(subset.map(c => c.group))].sort().forEach(g => gEl.add(new Option(g, g)));
}

function renderList() {
    const term = normalizeStr(document.getElementById('searchInput').value).toLowerCase();
    const fac = document.getElementById('facultyFilter').value;
    const grp = document.getElementById('groupFilter').value;
    const gen = document.getElementById('genderFilter').value;

    const filtered = courses.filter(c => {
        const nm = normalizeStr(c.name).toLowerCase();
        const pr = normalizeStr(c.prof).toLowerCase();
        const id = normalizeStr(c.id);
        return (!fac || c.faculty === fac) &&
               (!grp || c.group === grp) &&
               (!gen || c.gender.includes(gen)) &&
               (!term || nm.includes(term) || id.includes(term) || pr.includes(term));
    });

    document.getElementById('stats').textContent = `${toPersianNum(filtered.length)} درس یافت شد`;
    const list = document.getElementById('courseList');
    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">نتیجه‌ای یافت نشد</div></div>`;
        return;
    }

    filtered.slice(0, 100).forEach(c => {
        const isSelected = selectedCourses.has(c.id);
        let badgeClass = 'mixed';
        if (c.gender.includes('مرد') || c.gender.includes('برادر')) badgeClass = 'male';
        if (c.gender.includes('زن') || c.gender.includes('خواهر')) badgeClass = 'female';

        const capacityPct = c.capacity > 0 ? Math.round((c.enrolled / c.capacity) * 100) : 0;
        const capacityText = c.capacity > 0 ? `${toPersianNum(c.enrolled)}/${toPersianNum(c.capacity)}` : '';

        const div = document.createElement('div');
        div.className = `course-card ${isSelected ? 'selected' : ''}`;
        div.onclick = () => toggleCourse(c.id);
        div.innerHTML = `
            <div class="card-top">
                <span class="card-name">${c.name}</span>
                <span class="badge ${badgeClass}">${c.gender}</span>
            </div>
            <div class="card-meta">
                <div class="card-meta-left">
                    <span>${c.id}</span>
                    ${c.units ? `<span class="card-units">${toPersianNum(c.units)} واحد</span>` : ''}
                </div>
                <span title="ظرفیت/ثبت‌نام">${capacityText}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:flex; align-items:center; gap:4px;">
                <span>👤</span><span style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${c.prof}</span>
            </div>
        `;
        list.appendChild(div);
    });

    if (filtered.length > 100) {
        const note = document.createElement('div');
        note.style.cssText = 'text-align:center; font-size:0.75rem; color:var(--text-muted); padding:8px;';
        note.textContent = `... و ${toPersianNum(filtered.length - 100)} درس دیگر. جستجو را محدودتر کنید.`;
        list.appendChild(note);
    }
}

function toggleCourse(id) {
    if (selectedCourses.has(id)) selectedCourses.delete(id);
    else selectedCourses.add(id);
    saveToStorage();
    renderList();
    updateTimetable();
    updateUnitCounter();
    // sync: if curriculum tab is open, re-render so "در حال اخذ" status updates
    if (activeSidebarTab === 'curriculum') renderCurriculumTab();
}

// ===== TIMETABLE =====
function renderTimetableGrid() {
    const tbl = document.getElementById('timetable');
    tbl.innerHTML = '';
    const days = ['ساعت', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'cell header';
        div.textContent = d;
        tbl.appendChild(div);
    });
    const slots = ['08', '10', '13', '15', '17'];
    const labels = ['۸–۱۰', '۱۰–۱۲', '۱۳–۱۵', '۱۵–۱۷', '۱۷–۱۹'];
    slots.forEach((t, i) => {
        const tDiv = document.createElement('div');
        tDiv.className = 'cell time-label';
        tDiv.textContent = labels[i];
        tbl.appendChild(tDiv);
        for (let d = 0; d < 5; d++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = `slot-${d}-${t}`;
            tbl.appendChild(slot);
        }
    });
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
        const locM = text.match(/مکان:\s*(.+?)(?:\s*$)/);
        const location = locM ? locM[1].trim() : '';
        const h = parseInt(m[1]);
        let slot = null;
        if (h >= 7 && h < 10) slot = '08';
        else if (h >= 10 && h < 12) slot = '10';
        else if (h >= 13 && h < 15) slot = '13';
        else if (h >= 15 && h < 17) slot = '15';
        else if (h >= 17) slot = '17';
        if (slot) sessions.push({ day, slot, isTA: text.includes('حل تمرین'), location });
    });
    return sessions;
}

function updateTimetable() {
    document.querySelectorAll('.slot').forEach(el => el.innerHTML = '');
    const slotMap = {};

    selectedCourses.forEach(id => {
        const course = courses.find(c => c.id === id);
        if (!course) return;
        parseSchedule(course.time_html).forEach(sess => {
            const key = `${sess.day}-${sess.slot}`;
            if (!slotMap[key]) slotMap[key] = [];
            slotMap[key].push({ courseId: id, name: course.name, prof: course.prof, faculty: course.faculty, isTA: sess.isTA, location: sess.location });
        });
    });

    renderFacultyLegend();
    Object.entries(slotMap).forEach(([key, blocks]) => {
        const slotEl = document.getElementById(`slot-${key}`);
        if (!slotEl) return;
        const uniqueIds = new Set(blocks.map(b => b.courseId));
        const isConflict = uniqueIds.size > 1;

        blocks.forEach(b => {
            const color = isConflict ? null : getFacultyColor(b.faculty);
            const div = document.createElement('div');
            div.className = `class-block${isConflict ? ' conflict' : ''}`;
            if (color) div.style.background = color;
            div.title = `${b.name}\n${b.prof}`;

            const close = document.createElement('div');
            close.className = 'remove-btn';
            close.innerHTML = '&times;';
            close.onclick = e => { e.stopPropagation(); toggleCourse(b.courseId); };
            div.appendChild(close);

            const content = document.createElement('div');
            content.innerHTML = `
                <div class="class-block-name">${b.name}${b.isTA ? ' (ت)' : ''}</div>
                <div class="class-block-prof">${b.prof}</div>
                ${b.location ? `<div class="class-block-loc">📍 ${b.location}</div>` : ''}
            `;
            div.appendChild(content);
            slotEl.appendChild(div);
        });
    });
}

// ===== CURRICULUM TRACKER =====

// کد گلستان یک درس برای ورودی انتخاب‌شده
function getCodeForCohort(cur) {
    if (!cur.codes) return null;
    return cur.codes[selectedCohort] || cur.codes['*'] || null;
}

// آیا این درس این ترم ارائه می‌شود؟
function isOfferedThisSemester(cur) {
    const code = getCodeForCohort(cur);
    if (!code) return false;
    return courses.some(c => c.id.startsWith(code + '_'));
}

// آیا این درس الان در برنامه هفتگی دانشجو انتخاب شده؟
function isTakingThisSemester(cur) {
    const code = getCodeForCohort(cur);
    if (!code) return false;
    return courses.some(c => c.id.startsWith(code + '_') && selectedCourses.has(c.id));
}

// پیدا کردن درسنامه برای دانشکده + گروه فعلی
function getCurriculumForCurrentGroup() {
    if (typeof CURRICULUM_REGISTRY === 'undefined') return null;
    const fac = document.getElementById('facultyFilter').value;
    const grp = document.getElementById('groupFilter').value;
    if (!fac || !grp) return null;
    return CURRICULUM_REGISTRY[`${fac} >> ${grp}`] || null;
}

function onCohortChange() {
    selectedCohort = document.getElementById('cohortSelect').value;
    localStorage.setItem('selectedCohort', selectedCohort);
    renderCurriculumTab();
}

function getCourseStatus(courseId, data) {
    const cur = data ? data.courses.find(c => c.id === courseId) : null;

    if (cur && isTakingThisSemester(cur)) return 'taking';
    if (curriculumState.passedCourses.has(courseId)) return 'passed';
    if (curriculumState.failedCourses.has(courseId)) return 'failed';

    if (!cur || !cur.prereqs || cur.prereqs.length === 0) return 'available';
    const allPrereqsPassed = cur.prereqs.every(pid => curriculumState.passedCourses.has(pid));
    return allPrereqsPassed ? 'available' : 'locked';
}

function toggleCurriculumCourse(courseId) {
    const data = getCurriculumForCurrentGroup();
    const status = getCourseStatus(courseId, data);
    if (status === 'locked') return;

    if (curriculumState.passedCourses.has(courseId)) {
        // passed → failed
        curriculumState.passedCourses.delete(courseId);
        curriculumState.failedCourses.add(courseId);
    } else if (curriculumState.failedCourses.has(courseId)) {
        // failed → neutral
        curriculumState.failedCourses.delete(courseId);
    } else {
        // neutral/available → passed
        curriculumState.passedCourses.add(courseId);
    }
    saveCurriculumState();
    renderCurriculumTab();
}

function renderCurriculumTab() {
    const container = document.getElementById('curriculumScroll');
    const controlsEl = document.getElementById('curriculumControls');
    const fac = document.getElementById('facultyFilter').value;
    const grp = document.getElementById('groupFilter').value;

    // هیچ گروهی انتخاب نشده
    if (!fac || !grp) {
        controlsEl.style.display = 'none';
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🗺️</div>
            <div class="empty-text">از تب «جستجوی درس» ابتدا یک دانشکده و گروه آموزشی انتخاب کنید.</div>
        </div>`;
        return;
    }

    const data = getCurriculumForCurrentGroup();

    // گروه انتخاب شده ولی درسنامه‌ای ندارد
    if (!data) {
        controlsEl.style.display = 'none';
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🚧</div>
            <div class="empty-text">
                نقشه درسی <strong>${grp}</strong> هنوز اضافه نشده.<br>
                <span style="font-size:0.8rem;color:var(--text-muted);">می‌توانید با <code>ai_extract.py</code> آن را بسازید.</span>
            </div>
        </div>`;
        return;
    }

    // درسنامه موجود است — ورودی سلکتور را آپدیت کن
    controlsEl.style.display = 'block';
    const cohortEl = document.getElementById('cohortSelect');
    if (cohortEl.dataset.group !== `${fac}|${grp}`) {
        cohortEl.innerHTML = '';
        (data.cohorts || []).forEach(c => cohortEl.add(new Option(`ورودی ${c}`, c)));
        cohortEl.dataset.group = `${fac}|${grp}`;
        // اگر ورودی ذخیره‌شده در لیست هست، انتخابش کن
        if (selectedCohort && data.cohorts.includes(selectedCohort)) {
            cohortEl.value = selectedCohort;
        } else {
            selectedCohort = data.cohorts[data.cohorts.length - 1]; // آخرین ورودی پیش‌فرض
            cohortEl.value = selectedCohort;
            localStorage.setItem('selectedCohort', selectedCohort);
        }
    }

    // Group by semester
    const semMap = {};
    data.courses.forEach(c => {
        if (!semMap[c.semester]) semMap[c.semester] = [];
        semMap[c.semester].push(c);
    });

    const semesters = Object.keys(semMap).map(Number).sort((a, b) => a - b);

    let html = '';
    const semNames = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم'];
    semesters.forEach(sem => {
        const semLabel = semNames[sem - 1] || `ترم ${sem}`;
        html += `<div class="semester-block">
            <div class="semester-title">ترم ${semLabel}</div>
            <div class="curriculum-grid">`;

        semMap[sem].forEach(c => {
            const status = getCourseStatus(c.id, data);
            const offered = isOfferedThisSemester(c);
            const tooltipMap = {
                taking:    'در حال اخذ این ترم — کلیک برای علامت‌گذاری پاس',
                passed:    'پاس شده — کلیک: به افتاده تبدیل شود',
                failed:    'افتاده — کلیک: حذف علامت',
                available: offered ? 'در دسترس و این ترم ارائه می‌شود — کلیک برای علامت‌گذاری' : 'در دسترس اما این ترم ارائه نمی‌شود',
                locked:    `قفل — پیش‌نیاز: ${(c.prereqs || []).map(pid => { const p = data.courses.find(x => x.id === pid); return p ? p.name : pid; }).join('، ')}`
            };
            const offeredDot = (offered && status !== 'passed' && status !== 'taking')
                ? `<span style="width:6px;height:6px;border-radius:50%;background:var(--success);flex-shrink:0;" title="این ترم ارائه می‌شود"></span>` : '';

            html += `
                <div class="cur-card ${status}" onclick="toggleCurriculumCourse('${c.id}')"
                     title="${tooltipMap[status] || ''}">
                    <div class="cur-card-name">${c.name}</div>
                    <div class="cur-card-meta">
                        <span>${toPersianNum(c.units)} واحد</span>
                        <div style="display:flex;align-items:center;gap:4px;">${offeredDot}<span class="cur-card-status"></span></div>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    });

    // Recommendations
    const recs = getRecommendations(data);
    if (recs.length > 0) {
        html += `<div class="recommendations">
            <div class="rec-title">💡 پیشنهاد این ترم</div>`;
        recs.slice(0, 6).forEach(c => {
            html += `
                <div class="rec-item" onclick="filterToSearchCourse('${c.id}')" title="کلیک برای جستجو در لیست درس‌ها">
                    <span>${c.name}</span>
                    <span class="rec-item-units">${toPersianNum(c.units)} واحد</span>
                </div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

function getRecommendations(data) {
    if (!data) return [];
    return data.courses.filter(c => {
        const status = getCourseStatus(c.id, data);
        return status === 'available' && isOfferedThisSemester(c);
    }).sort((a, b) => a.semester - b.semester);
}

function filterToSearchCourse(courseId) {
    const data = getCurriculumForCurrentGroup();
    if (!data) return;
    const cur = data.courses.find(c => c.id === courseId);
    if (!cur) return;
    const code = getCodeForCohort(cur);
    if (!code) return;
    switchTab('search');
    document.getElementById('searchInput').value = code;
    renderList();
}

// ===== THEME =====
function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = next === 'light' ? '🌗 تم' : '☀️ تم';
}

// Apply saved theme
(function applyTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = saved === 'light' ? '🌗 تم' : '☀️ تم';
})();

// ===== EXAMS =====
function openExamModal() {
    const body = document.getElementById('examBody');
    body.innerHTML = '';
    const list = [...selectedCourses].map(id => courses.find(c => c.id === id)).filter(Boolean);

    list.sort((a, b) => {
        const da = extractDate(a.exam_text), db = extractDate(b.exam_text);
        if (da === '-') return 1; if (db === '-') return -1;
        return da.localeCompare(db);
    });

    const dateCounts = {};
    list.forEach(c => { const d = extractDate(c.exam_text); if (d !== '-') dateCounts[d] = (dateCounts[d] || 0) + 1; });

    list.forEach(c => {
        const date = extractDate(c.exam_text), time = extractTime(c.exam_text);
        const row = document.createElement('tr');
        if (date !== '-' && dateCounts[date] > 1) row.className = 'exam-conflict';
        row.innerHTML = `<td>${c.name}</td><td>${date}</td><td>${time}</td>`;
        body.appendChild(row);
    });

    if (list.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">هیچ درسی انتخاب نشده است</td></tr>';
    }
    document.getElementById('examModal').style.display = 'flex';
}

function closeExamModal() { document.getElementById('examModal').style.display = 'none'; }

function extractDate(txt) {
    const m = txt.match(/امتحان.*?\((\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2})\)/);
    return m ? m[1] : '-';
}
function extractTime(txt) {
    const m = txt.match(/امتحان.*?ساعت\s*:\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
    return m ? m[1] : '-';
}

init();
