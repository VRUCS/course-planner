// Global State
let selectedCourses = new Set();
const courses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];

// DOM Elements
const els = {
    faculty: document.getElementById('facultyFilter'),
    group: document.getElementById('groupFilter'),
    gender: document.getElementById('genderFilter'),
    search: document.getElementById('searchInput'),
    list: document.getElementById('courseList'),
    stats: document.getElementById('stats'),
    timetable: document.getElementById('timetable'),
    examModal: document.getElementById('examModal'),
    examBody: document.getElementById('examBody')
};

function init() {
    setupFilters();
    renderTimetableGrid();
    renderList();
    
    els.faculty.addEventListener('change', () => { populateGroups(); renderList(); });
    els.group.addEventListener('change', renderList);
    els.gender.addEventListener('change', renderList);
    els.search.addEventListener('input', renderList);
}

// --- Filters ---
function setupFilters() {
    const faculties = [...new Set(courses.map(c => c.faculty))].sort();
    faculties.forEach(f => els.faculty.add(new Option(f, f)));
}

function populateGroups() {
    const selectedFac = els.faculty.value;
    els.group.innerHTML = '<option value="">همه گروه‌ها</option>';
    const filtered = selectedFac ? courses.filter(c => c.faculty === selectedFac) : courses;
    const groups = [...new Set(filtered.map(c => c.group))].sort();
    groups.forEach(g => els.group.add(new Option(g, g)));
}

// --- Helper: Normalize String for Search ---
function normalizeStr(str) {
    return str ? str.replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase() : '';
}

// --- List Rendering ---
function renderList() {
    const term = normalizeStr(els.search.value);
    const fac = els.faculty.value;
    const grp = els.group.value;
    const gen = els.gender.value;

    const filtered = courses.filter(c => {
        const cName = normalizeStr(c.name);
        const cProf = normalizeStr(c.prof);
        const cId = normalizeStr(c.id);
        
        return (
            (!fac || c.faculty === fac) &&
            (!grp || c.group === grp) &&
            (!gen || c.gender.includes(gen)) &&
            (cName.includes(term) || cId.includes(term) || cProf.includes(term))
        );
    });

    els.stats.textContent = `${filtered.length} درس`;
    els.list.innerHTML = '';

    filtered.slice(0, 100).forEach(c => {
        const div = document.createElement('div');
        div.className = `course-card ${selectedCourses.has(c.id) ? 'selected' : ''}`;
        div.onclick = () => toggleCourse(c.id);
        
        let badgeClass = 'mixed';
        if (c.gender.includes('مرد') || c.gender.includes('پسر')) badgeClass = 'male';
        if (c.gender.includes('زن') || c.gender.includes('خواهر')) badgeClass = 'female';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <strong style="font-size:0.9rem;">${c.name}</strong>
                <span class="badge ${badgeClass}">${c.gender}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted);">
                ${c.id} | 👤 ${c.prof}
            </div>
        `;
        els.list.appendChild(div);
    });
}

function toggleCourse(id) {
    if (selectedCourses.has(id)) selectedCourses.delete(id);
    else selectedCourses.add(id);
    renderList();
    updateTimetable();
}

// --- Timetable Logic ---
function renderTimetableGrid() {
    els.timetable.innerHTML = '';
    const days = ['ساعت', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'cell header';
        div.textContent = d;
        els.timetable.appendChild(div);
    });

    const timeSlots = ['08', '10', '13', '15', '17'];
    const timeLabels = ['08-10', '10-12', '13-15', '15-17', '17-19'];

    timeSlots.forEach((t, i) => {
        const tDiv = document.createElement('div');
        tDiv.className = 'cell';
        tDiv.style.fontWeight = 'bold';
        tDiv.textContent = timeLabels[i];
        els.timetable.appendChild(tDiv);

        for (let d = 0; d < 5; d++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = `slot-${d}-${t}`;
            els.timetable.appendChild(slot);
        }
    });
}

// *** اصلاح شده: پارس کردن دقیق روزها ***
function getDayIndex(text) {
    const t = normalizeStr(text).replace(/\u200c/g, ' ').replace(/\s+/g, ' '); // حذف نیم‌فاصله و فاصله‌های اضافه
    
    // ترتیب مهم است: طولانی‌ترها اول
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
    // جدا کردن خطوط بر اساس br
    const lines = html.split(/<br\s*\/?>/i);
    
    lines.forEach(line => {
        let text = normalizeStr(line);
        if (!text || text.includes('امتحان')) return;

        let day = getDayIndex(text);
        if (day === -1) return;

        // پیدا کردن ساعت
        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            const startH = parseInt(timeMatch[1]);
            const endH = parseInt(timeMatch[3]);
            
            // نگاشت ساعت شروع به اسلات
            let slot = null;
            if (startH >= 7 && startH < 10) slot = '08';
            else if (startH >= 10 && startH < 12) slot = '10';
            else if (startH >= 13 && startH < 15) slot = '13';
            else if (startH >= 15 && startH < 17) slot = '15';
            else if (startH >= 17) slot = '17';

            if (slot) {
                sessions.push({ 
                    day, 
                    slot, 
                    rawText: text,
                    // نوع درس برای نمایش بهتر
                    isTA: text.includes('حل تمرین'),
                    isPrac: text.includes('(ع)')
                });
            }
        }
    });
    return sessions;
}

function updateTimetable() {
    // پاک کردن محتوای قبلی
    document.querySelectorAll('.slot').forEach(el => el.innerHTML = '');

    // جمع‌آوری تمام سشن‌ها
    const slotMap = {}; // Key: "day-slot" -> Value: Array of blocks

    selectedCourses.forEach(id => {
        const course = courses.find(c => c.id === id);
        if (!course) return;

        const schedule = parseSchedule(course.time_html);
        schedule.forEach(sess => {
            const key = `${sess.day}-${sess.slot}`;
            if (!slotMap[key]) slotMap[key] = [];
            
            slotMap[key].push({
                courseId: course.id,
                courseName: course.name,
                prof: course.prof,
                isTA: sess.isTA,
                raw: sess.rawText
            });
        });
    });

    // رندر کردن و تشخیص تداخل هوشمند
    Object.keys(slotMap).forEach(key => {
        const slotEl = document.getElementById(`slot-${key}`);
        if (!slotEl) return;

        const blocks = slotMap[key];
        
        // **منطق تداخل هوشمند:**
        // بررسی می‌کنیم آیا بیش از ۱ کد درس متفاوت در این اسلات وجود دارد؟
        // اگر همه بلاک‌ها مربوط به یک درس باشند (مثلاً درس + حل تمرین)، تداخلی نیست.
        const uniqueCourseIds = new Set(blocks.map(b => b.courseId));
        const hasConflict = uniqueCourseIds.size > 1;

        blocks.forEach(b => {
            const div = document.createElement('div');
            div.className = `class-block ${hasConflict ? 'conflict' : ''}`;
            if (blocks.length > 1 && !hasConflict) div.classList.add('multi-part'); // استایل برای درس‌های چند تکه
            
            div.title = `${b.courseName}\n${b.prof}\n${b.raw}`;
            
            let displayType = b.isTA ? '(حل تمرین)' : '';
            div.innerHTML = `
                <span>${b.courseName} ${displayType}</span>
                <span style="font-size:0.65rem; opacity:0.8">${b.prof}</span>
            `;
            
            slotEl.appendChild(div);
        });
    });
}

// --- Theme ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// --- Exams ---
function openExamModal() {
    els.examBody.innerHTML = '';
    const selectedList = [...selectedCourses].map(id => courses.find(c => c.id === id));
    
    // Sort logic
    selectedList.sort((a, b) => (a.exam_text || '').localeCompare(b.exam_text || ''));

    // Conflict Check (Simple date check)
    const dateCount = {};
    selectedList.forEach(c => {
        const d = extractDate(c.exam_text);
        if(d !== '-') dateCount[d] = (dateCount[d] || 0) + 1;
    });

    selectedList.forEach(c => {
        const row = document.createElement('tr');
        const date = extractDate(c.exam_text);
        const time = extractTime(c.exam_text);
        
        if (date !== '-' && dateCount[date] > 1) row.className = 'exam-conflict';

        row.innerHTML = `<td>${c.name}</td><td>${date}</td><td>${time}</td>`;
        els.examBody.appendChild(row);
    });
    els.examModal.style.display = 'flex';
}
function closeExamModal() { els.examModal.style.display = 'none'; }

function extractDate(txt) { 
    const m = txt.match(/\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2}/);
    return m ? m[0] : '-';
}
function extractTime(txt) {
    const m = txt.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/);
    return m ? m[0] : '-';
}

init();