// State
let selectedCourses = new Set();
// اگر فایل data.js هنوز لود نشده باشد، آرایه خالی در نظر می‌گیریم
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
}

// --- Filter Setup ---
function setupFilters() {
    // Extract Unique Faculties
    const faculties = [...new Set(courses.map(c => c.faculty))].sort();
    faculties.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        els.faculty.appendChild(opt);
    });
}

function populateGroups() {
    // Populate groups based on selected faculty
    const selectedFac = els.faculty.value;
    els.group.innerHTML = '<option value="">همه گروه‌های آموزشی</option>';
    
    let filteredGroups = courses;
    if (selectedFac) {
        filteredGroups = courses.filter(c => c.faculty === selectedFac);
    }
    
    const groups = [...new Set(filteredGroups.map(c => c.group))].sort();
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        els.group.appendChild(opt);
    });
}

// --- Rendering List ---
function renderList() {
    const term = els.search.value.toLowerCase();
    const fac = els.faculty.value;
    const grp = els.group.value;
    const gen = els.gender.value;

    const filtered = courses.filter(c => {
        return (
            (!fac || c.faculty === fac) &&
            (!grp || c.group === grp) &&
            (!gen || c.gender.includes(gen)) && // includes because data might be "زن" or "ویژه خواهران"
            (c.name.toLowerCase().includes(term) || c.id.includes(term) || c.prof.toLowerCase().includes(term))
        );
    });

    els.stats.textContent = `${filtered.length} درس پیدا شد`;
    els.list.innerHTML = '';

    // Limit rendering for performance if too many results
    const toRender = filtered.slice(0, 100); 

    toRender.forEach(c => {
        const el = document.createElement('div');
        el.className = `course-card ${selectedCourses.has(c.id) ? 'selected' : ''}`;
        el.onclick = () => toggleCourse(c.id);

        // Gender Badge Color
        let genderClass = 'mixed';
        if (c.gender.includes('مرد') || c.gender.includes('برادر')) genderClass = 'male';
        if (c.gender.includes('زن') || c.gender.includes('خواهر')) genderClass = 'female';

        el.innerHTML = `
            <div class="card-header">
                <span class="course-name">${c.name}</span>
                <span class="badge ${genderClass}">${c.gender}</span>
            </div>
            <div class="card-details">
                <span class="course-id">${c.id}</span>
                <span class="prof-name">👤 ${c.prof}</span>
            </div>
        `;
        els.list.appendChild(el);
    });

    if(filtered.length > 100) {
        const info = document.createElement('div');
        info.style.textAlign = 'center';
        info.style.padding = '10px';
        info.style.color = '#888';
        info.textContent = '... نتایج فیلتر را دقیق‌تر کنید ...';
        els.list.appendChild(info);
    }
}

// --- Schedule Logic ---
function toggleCourse(id) {
    if (selectedCourses.has(id)) selectedCourses.delete(id);
    else selectedCourses.add(id);
    
    renderList(); // Update highlights
    updateTimetable();
}

function renderTimetableGrid() {
    els.timetable.innerHTML = '';
    const headers = ['ساعت', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    headers.forEach(h => {
        const div = document.createElement('div');
        div.className = 'cell header-cell';
        div.textContent = h;
        els.timetable.appendChild(div);
    });

    const times = ['08', '10', '13', '15', '17'];
    const timeLabels = ['08-10', '10-12', '13-15', '15-17', '17-19'];

    times.forEach((t, i) => {
        // Time Label Column
        const tCell = document.createElement('div');
        tCell.className = 'cell time-cell';
        tCell.textContent = timeLabels[i];
        els.timetable.appendChild(tCell);

        // Days Columns (0 to 4)
        for (let d = 0; d < 5; d++) {
            const slot = document.createElement('div');
            slot.className = 'cell';
            slot.id = `slot-${d}-${t}`; // e.g., slot-0-08 (Sat 8am)
            els.timetable.appendChild(slot);
        }
    });
}

function updateTimetable() {
    // Clear slots
    document.querySelectorAll('[id^="slot-"]').forEach(el => el.innerHTML = '');

    selectedCourses.forEach(id => {
        const course = courses.find(c => c.id === id);
        if (!course) return;

        const schedule = parseSchedule(course.time_html);
        schedule.forEach(sess => {
            const slotEl = document.getElementById(`slot-${sess.day}-${sess.time}`);
            if (slotEl) {
                const block = document.createElement('div');
                block.className = 'class-block';
                block.title = `${course.name} \n ${course.prof} \n ${sess.loc}`;
                block.innerHTML = `<div>${course.name}</div><div style="font-size:0.6rem; opacity:0.9">${course.id}</div>`;
                
                // Gender coloring logic for blocks (Optional, currently uses Primary Color)
                 if (course.gender.includes('مرد')) block.style.backgroundColor = 'var(--male)';
                 if (course.gender.includes('زن')) block.style.backgroundColor = 'var(--female)';

                if (slotEl.children.length > 0) {
                    block.classList.add('conflict');
                    Array.from(slotEl.children).forEach(c => c.classList.add('conflict'));
                }
                slotEl.appendChild(block);
            }
        });
    });
}

// --- Helper: Parser (adapted from Python logic) ---
function parseSchedule(html) {
    // Note: We use the HTML string stored in JSON to parse days/times
    // Simple parser logic similar to previous versions
    const sessions = [];
    const lines = html.split(/<br\s*\/?>/i);
    
    lines.forEach(line => {
        const text = line.replace(/&nbsp;/g, ' ').trim();
        if (!text || text.includes('امتحان')) return;

        let day = -1;
        if (text.includes('شنبه') && !text.includes('یک') && !text.includes('دو') && !text.includes('سه') && !text.includes('چهار') && !text.includes('پنج')) day = 0;
        else if (text.includes('یک')) day = 1;
        else if (text.includes('دو')) day = 2;
        else if (text.includes('سه')) day = 3;
        else if (text.includes('چهار')) day = 4;

        if (day === -1) return;

        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):/);
        if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            let slotKey = '';
            if (h >= 7 && h < 10) slotKey = '08';
            else if (h >= 10 && h < 12) slotKey = '10';
            else if (h >= 13 && h < 15) slotKey = '13';
            else if (h >= 15 && h < 17) slotKey = '15';
            else if (h >= 17) slotKey = '17';
            
            // Extract location
            let loc = '';
            const locMatch = text.match(/مکان\s*:\s*([^<]+)/);
            if(locMatch) loc = locMatch[1].trim();

            if (slotKey) sessions.push({ day, time: slotKey, loc });
        }
    });
    return sessions;
}

// --- Exams ---
function openExamModal() {
    els.examBody.innerHTML = '';
    const selectedList = [...selectedCourses].map(id => courses.find(c => c.id === id));
    
    // Sort by Date
    selectedList.sort((a, b) => extractDate(a.exam_text).localeCompare(extractDate(b.exam_text)));

    // Detect Conflicts
    const dateCounts = {};
    selectedList.forEach(c => {
        const d = extractDate(c.exam_text);
        dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    selectedList.forEach(c => {
        const row = document.createElement('tr');
        const dateStr = extractDate(c.exam_text);
        const timeStr = extractTime(c.exam_text);
        
        if (dateCounts[dateStr] > 1) row.className = 'exam-conflict';

        row.innerHTML = `
            <td>${c.name}</td>
            <td>${dateStr}</td>
            <td>${timeStr}</td>
        `;
        els.examBody.appendChild(row);
    });
    
    els.examModal.style.display = 'flex';
}

function closeExamModal() { els.examModal.style.display = 'none'; }

function extractDate(text) {
    const m = text.match(/امتحان\s*\(([\d\./]+)\)/);
    return m ? m[1] : '-';
}
function extractTime(text) {
    const m = text.match(/ساعت\s*:\s*([\d:-]+)/);
    return m ? m[1] : '-';
}

function clearSelection() {
    selectedCourses.clear();
    renderList();
    updateTimetable();
}

// Start
init();