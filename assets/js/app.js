// State
let selectedCourses = new Set();
// اگر دیتابیس لود نشد، با آرایه خالی شروع کن
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
    examBody: document.getElementById('examBody'),
    fileInput: document.getElementById('fileInput')
};

// --- Initialization ---
function init() {
    setupFilters();
    renderTimetableGrid();
    renderList();
    
    // Event Listeners
    els.faculty.addEventListener('change', () => { populateGroups(); renderList(); });
    els.group.addEventListener('change', renderList);
    els.gender.addEventListener('change', renderList);
    els.search.addEventListener('input', renderList);
    
    if(els.fileInput) {
        els.fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            for (const file of files) await processFile(file);
            els.fileInput.value = ''; 
            setupFilters();
            populateGroups();
            renderList();
        });
    }
}

// --- Helper: Normalize String ---
// تمام فاصله‌های عجیب، اینترها و اعداد فارسی را یکدست می‌کند
function normalizeStr(str) {
    if (!str) return '';
    return str
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
        .replace(/۰/g, '0').replace(/۱/g, '1').replace(/۲/g, '2').replace(/۳/g, '3').replace(/۴/g, '4')
        .replace(/۵/g, '5').replace(/۶/g, '6').replace(/۷/g, '7').replace(/۸/g, '8').replace(/۹/g, '9')
        .replace(/\s+/g, ' ') // تبدیل تمام فاصله‌های چندتایی و اینترها به یک اسپیس
        .trim();
}

// --- Manual File Processing ---
function processFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(event.target.result, 'text/html');
            parseAndAppendCourses(doc);
            resolve();
        };
        reader.readAsText(file);
    });
}

function parseAndAppendCourses(doc) {
    const rows = doc.querySelectorAll('tr');
    let added = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 13) return; 

        const firstCellText = cells[0].innerText.trim();
        if (isNaN(firstCellText) || firstCellText === '') return;

        const rawId = normalizeStr(cells[4].innerText);
        
        // جلوگیری از تکراری
        if (courses.some(c => c.id === rawId)) return;

        courses.push({
            id: rawId,
            name: normalizeStr(cells[5].innerText),
            faculty: normalizeStr(cells[1].innerText),
            group: normalizeStr(cells[3].innerText),
            gender: normalizeStr(cells[11].innerText),
            prof: normalizeStr(cells[12].innerText),
            time_html: cells[13].innerHTML, 
            exam_text: normalizeStr(cells[13].innerText)
        });
        added++;
    });
    if(added > 0) console.log(`${added} درس جدید اضافه شد.`);
}

// --- Filters & UI ---
function setupFilters() {
    while (els.faculty.options.length > 1) els.faculty.remove(1);
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

function renderList() {
    const term = normalizeStr(els.search.value).toLowerCase();
    const fac = els.faculty.value;
    const grp = els.group.value;
    const gen = els.gender.value;

    const filtered = courses.filter(c => {
        const cName = normalizeStr(c.name).toLowerCase();
        const cProf = normalizeStr(c.prof).toLowerCase();
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
        if (c.gender.includes('مرد') || c.gender.includes('برادر')) badgeClass = 'male';
        if (c.gender.includes('زن') || c.gender.includes('خواهر')) badgeClass = 'female';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <strong style="font-size:0.9rem;">${c.name}</strong>
                <span class="badge ${badgeClass}">${c.gender}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                <span>${c.id}</span>
                <span>👤 ${c.prof}</span>
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
    const lines = html.split(/<br\s*\/?>/i);
    
    lines.forEach(line => {
        let text = normalizeStr(line);
        if (!text || text.includes('امتحان')) return;

        let day = getDayIndex(text);
        if (day === -1) return;

        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            const startH = parseInt(timeMatch[1]);
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
                    isTA: text.includes('حل تمرین'),
                });
            }
        }
    });
    return sessions;
}

function updateTimetable() {
    document.querySelectorAll('.slot').forEach(el => el.innerHTML = '');
    const slotMap = {};

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

    Object.keys(slotMap).forEach(key => {
        const slotEl = document.getElementById(`slot-${key}`);
        if (!slotEl) return;
        const blocks = slotMap[key];
        
        // تداخل واقعی: اگر کدهای درس متفاوت باشند
        const uniqueIds = new Set(blocks.map(b => b.courseId));
        const isConflict = uniqueIds.size > 1;

        blocks.forEach(b => {
            const div = document.createElement('div');
            div.className = `class-block ${isConflict ? 'conflict' : ''}`;
            if (blocks.length > 1 && !isConflict) div.classList.add('multi-part');
            
            div.title = `${b.courseName}\n${b.prof}\n${b.raw}`;
            const type = b.isTA ? '(ت)' : '';
            div.innerHTML = `<span>${b.courseName} ${type}</span><span style="font-size:0.65rem; opacity:0.8">${b.prof}</span>`;
            slotEl.appendChild(div);
        });
    });
}

// --- Theme ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    
    const btn = document.querySelector('.btn-theme');
    if(btn) btn.textContent = next === 'light' ? '🌗 تم' : '☀️ تم';
}

const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const btn = document.querySelector('.btn-theme');
if(btn) btn.textContent = savedTheme === 'light' ? '🌗 تم' : '☀️ تم';

// --- Exams Logic (Fixed) ---
function openExamModal() {
    els.examBody.innerHTML = '';
    const selectedList = [...selectedCourses].map(id => courses.find(c => c.id === id));
    
    selectedList.sort((a, b) => {
        const da = extractDate(a.exam_text);
        const db = extractDate(b.exam_text);
        if (da === '-') return 1;
        if (db === '-') return -1;
        return da.localeCompare(db);
    });

    // Conflict Check
    const dateCounts = {};
    selectedList.forEach(c => {
        const d = extractDate(c.exam_text);
        if(d !== '-') dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    selectedList.forEach(c => {
        const row = document.createElement('tr');
        const date = extractDate(c.exam_text);
        const time = extractTime(c.exam_text);
        
        if (date !== '-' && dateCounts[date] > 1) row.className = 'exam-conflict';

        row.innerHTML = `<td>${c.name}</td><td>${date}</td><td>${time}</td>`;
        els.examBody.appendChild(row);
    });
    els.examModal.style.display = 'flex';
}
function closeExamModal() { els.examModal.style.display = 'none'; }

// *** اصلاح شده: فقط تاریخی که داخل پرانتز جلوی "امتحان" باشد ***
function extractDate(txt) {
    const m = txt.match(/امتحان.*?\((\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2})\)/);
    return m ? m[1] : '-';
}

// *** اصلاح شده: فقط ساعتی که بعد از کلمه "ساعت" باشد ***
function extractTime(txt) {
    const m = txt.match(/امتحان.*?ساعت\s*:\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
    return m ? m[1] : '-';
}

init();