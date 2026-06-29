/**
 * extractor.js — استخراج داده از صفحات گلستان
 * این فایل در هر frame تزریق می‌شود. هر frame نتیجه خودش را برمی‌گرداند.
 */

// ─── نرمال‌سازی متن ──────────────────────────────────────────────────────────
function norm(text) {
    if (!text) return '';
    return text
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
        .replace(/‌/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── تشخیص نوع صفحه (در top-level frame) ───────────────────────────────────
function getTopLevelPageType() {
    if (window.top !== window) return null; // فقط در top frame اجرا شود
    const title = document.title || '';
    if (title.includes('دروس ارائه شده')) return 'offered_courses';
    if (title.includes('تطبيق دروس') || title.includes('فارغ التحصيل')) return 'curriculum_chart';
    return null;
}

// ─── تشخیص محتوای هر iframe ────────────────────────────────────────────────
// بررسی می‌کند آیا این frame داده‌ی دروس ارائه‌شده دارد؟
function frameHasOfferedCourses() {
    const rows = document.querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) continue;
        const first = norm(cells[0].textContent);
        // کد با پسوند گروه: 7 رقم + _ + 2 رقم
        if (/^\d{7}_\d{2}$/.test(first)) return true;
    }
    return false;
}

// بررسی می‌کند آیا این frame داده‌ی تطبیق دروس (چارت) دارد؟
function frameHasCurriculumChart() {
    const rows = document.querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) continue;
        const first = norm(cells[0].textContent);
        const third = norm(cells[2]?.textContent || '');
        // کد ۷ رقمی بدون پسوند + واحد عددی = ردیف چارت
        if (/^\d{7}$/.test(first) && /^\d+$/.test(third)) return true;
    }
    return false;
}

// ─── استخراج دانشکده/گروه از header ردیف ──────────────────────────────────
function extractFacultyGroup() {
    const rows = document.querySelectorAll('tr');
    let faculty = '', group = '';
    for (const row of rows) {
        const text = norm(row.textContent);
        const fMatch = text.match(/دانشكده درس\s*:?\s*([^:\n]+?)(?:گروه|$)/i)
                    || text.match(/دانشکده\s*:?\s*([^:\n]+)/i);
        const gMatch = text.match(/گروه آموزشي\s*:?\s*([^\n:]+)/i)
                    || text.match(/گروه\s*:?\s*([^\n:]+)/i);
        if (fMatch && fMatch[1].trim().length > 2) faculty = norm(fMatch[1]);
        if (gMatch && gMatch[1].trim().length > 2) group = norm(gMatch[1]);
        if (faculty && group) break;
    }
    return { faculty, group };
}

// ─── استخراج دروس ارائه‌شده (ستون ۱۱ یا ۱۳) ───────────────────────────────
function extractOfferedCoursesFromFrame() {
    const courses = [];
    const seen = new Set();
    const { faculty, group } = extractFacultyGroup();

    const rows = document.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) return;

        const code = norm(cells[0].textContent);
        if (!/^\d{7}_\d{2}$/.test(code)) return;
        if (seen.has(code)) return;
        seen.add(code);

        function safeInt(idx) {
            const v = parseInt(norm(cells[idx]?.textContent) || '0');
            return isNaN(v) ? 0 : v;
        }

        // تشخیص فرمت: ۱۱ ستون vs ۱۳ ستون
        // در ۱۳ ستون: [4]=ظرفیت، [5]=ثبت‌نام، [6]=انتظار، [7]=جنسیت، [8]=استاد، [9]=زمان
        // در ۱۱ ستون: [4]=ظرفیت، [5]=جنسیت، [6]=استاد، [7]=زمان
        const col5 = norm(cells[5]?.textContent || '');
        const isLong = /^\d+$/.test(col5) && cells.length >= 12;

        let capacity, enrolled, gender, profIdx, schedIdx;
        if (isLong) {
            capacity = safeInt(4); enrolled = safeInt(5);
            gender = norm(cells[7]?.textContent); profIdx = 8; schedIdx = 9;
        } else {
            capacity = safeInt(4); enrolled = 0;
            gender = norm(cells[5]?.textContent); profIdx = 6; schedIdx = 7;
        }

        const schedCell = cells[schedIdx];
        const timeHtml  = schedCell ? schedCell.innerHTML.replace(/ي/g,'ی').replace(/ك/g,'ک') : '';
        const examText  = schedCell ? norm(schedCell.textContent) : '';

        courses.push({
            id:       code,
            name:     norm(cells[1].textContent),
            faculty:  faculty || '',
            group:    group || '',
            units:    safeInt(2),
            capacity,
            enrolled,
            gender,
            prof:     norm(cells[profIdx]?.textContent || ''),
            time_html: `<td>${timeHtml}</td>`,
            exam_text: examText
        });
    });

    return { courses, faculty, group };
}

// ─── استخراج همه درس‌های چارت (تطبیق دروس) ───────────────────────────────
function extractCurriculumChartFromFrame() {
    const courses = [];
    const { faculty, group } = extractFacultyGroup();

    // نگاشت section headers به نوع درس
    // نکته: بعد از norm() حرف ي → ی تبدیل می‌شود؛ کلیدها باید نرمال‌شده باشند
    const sectionTypeMap = [
        ['دروس پایه',    'core'],
        ['دروس اصلی',    'main'],
        ['دروس اختیاری', 'elective'],
    ];

    let currentType = 'general';
    const rows = document.querySelectorAll('tr');

    rows.forEach(row => {
        const text = norm(row.textContent);

        // تشخیص عنوان section
        for (const [keyword, type] of sectionTypeMap) {
            if (text.includes(keyword) && text.includes('برنامه')) {
                currentType = type;
                return;
            }
        }

        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;

        const code = norm(cells[0].textContent);
        if (!/^\d{7}$/.test(code)) return;

        const name  = norm(cells[1]?.textContent || '');
        const units = parseInt(norm(cells[2]?.textContent || '0')) || 0;
        if (!name || !units) return;

        courses.push({ code, name, units, type: currentType });
    });

    return { courses, faculty, group };
}

// ─── نقطه ورود اصلی (در هر frame) ────────────────────────────────────────
function runExtractionInFrame() {
    try {
        if (frameHasOfferedCourses()) {
            const result = extractOfferedCoursesFromFrame();
            if (result.courses.length === 0) return null;
            return { frameType: 'offered_courses', ...result };
        }
        if (frameHasCurriculumChart()) {
            const result = extractCurriculumChartFromFrame();
            if (result.courses.length === 0) return null;
            return { frameType: 'curriculum_chart', ...result };
        }
        return null;
    } catch (e) {
        return { error: e.message };
    }
}

// ─── تشخیص نوع کلی صفحه از title ─────────────────────────────────────────
function detectTopLevelPageType() {
    return getTopLevelPageType();
}
