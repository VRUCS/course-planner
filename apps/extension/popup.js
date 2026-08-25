// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function toPersian(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showProgress(msg) {
    $('progressBar').style.display = 'flex';
    $('progressText').textContent = msg;
    $('resultBox').style.display = 'none';
    $('errorMsg').style.display = 'none';
}
function hideProgress() { $('progressBar').style.display = 'none'; }
function showResult(html) { $('resultBox').style.display = 'block'; $('resultStats').innerHTML = html; }
function showError(msg) { $('errorMsg').style.display = 'block'; $('errorMsg').textContent = '⚠️ ' + msg; }

// ───────────────────────────────────────────────────────────────────────────
// Core injection — اجرا در همه فریم‌ها با allFrames: true
// ───────────────────────────────────────────────────────────────────────────
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

async function injectExtractor(tab) {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['extractor.js']
    });
}

// تشخیص نوع صفحه از title
async function getPageType(tab) {
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        func: () => detectTopLevelPageType()
    });
    return results[0]?.result || null;
}

// استخراج از همه فریم‌ها
async function extractFromAllFrames(tab) {
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => runExtractionInFrame()
    });
    return results.map(r => r.result).filter(Boolean);
}

// ───────────────────────────────────────────────────────────────────────────
// Page detection + UI update
// ───────────────────────────────────────────────────────────────────────────
async function detectPage() {
    try {
        const tab = await getCurrentTab();
        await injectExtractor(tab);
        const pageType = await getPageType(tab);

        // مخفی کردن همه بخش‌ها
        $('actionsOffered').style.display = 'none';
        $('actionsChart').style.display = 'none';
        $('actionsUnknown').style.display = 'none';

        const card = $('statusCard');
        const typeEl = $('statusType');
        const hintEl = $('statusHint');

        if (pageType === 'offered_courses') {
            card.className = 'status-card detected';
            typeEl.className = 'status-type green';
            typeEl.textContent = '✓ دروس ارائه‌شده در ترم';
            hintEl.textContent = 'می‌توانید لیست دروس این ترم را استخراج کنید.';
            $('actionsOffered').style.display = 'block';

        } else if (pageType === 'curriculum_chart') {
            card.className = 'status-card detected';
            typeEl.className = 'status-type green';
            typeEl.textContent = '✓ تطبیق دروس / چارت رشته';
            hintEl.textContent = 'می‌توانید همه درس‌های برنامه را استخراج کنید.';
            $('actionsChart').style.display = 'block';

        } else {
            card.className = 'status-card unknown';
            typeEl.className = 'status-type gray';
            typeEl.textContent = 'صفحه گلستان شناسایی نشد';
            hintEl.textContent = '';
            $('actionsUnknown').style.display = 'block';
        }
    } catch (e) {
        $('statusCard').className = 'status-card error';
        $('statusType').textContent = '⚠️ خطا در دسترسی به صفحه';
        $('statusHint').textContent = 'این اکستنشن فقط روی صفحات وب کار می‌کند.';
        $('actionsUnknown').style.display = 'block';
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Download helpers
// ───────────────────────────────────────────────────────────────────────────
function downloadJs(content, filename) {
    const blob = new Blob([content], { type: 'application/javascript' });
    chrome.downloads.download({ url: URL.createObjectURL(blob), filename, saveAs: true });
}

function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    chrome.downloads.download({ url: URL.createObjectURL(blob), filename, saveAs: true });
}

async function copyText(text) {
    await navigator.clipboard.writeText(text);
}

// ───────────────────────────────────────────────────────────────────────────
// دروس ارائه‌شده — Extract & export
// ───────────────────────────────────────────────────────────────────────────
async function doExtractOffered() {
    showProgress('در حال استخراج دروس از همه گروه‌ها...');
    try {
        const tab = await getCurrentTab();
        await injectExtractor(tab);
        const frameResults = await extractFromAllFrames(tab);
        hideProgress();

        // جمع‌آوری از همه frame های مرتبط
        const offeredFrames = frameResults.filter(r => r.frameType === 'offered_courses');
        if (offeredFrames.length === 0) {
            showError('هیچ جدول درسی پیدا نشد. مطمئن شوید صفحه کامل بارگذاری شده.');
            return;
        }

        // merge همه درس‌ها
        const allCourses = [];
        const seen = new Set();
        const groups = [];

        offeredFrames.forEach(frame => {
            if (frame.faculty && frame.group) {
                groups.push(`${frame.faculty} / ${frame.group}`);
            }
            frame.courses.forEach(c => {
                if (!seen.has(c.id)) { seen.add(c.id); allCourses.push(c); }
            });
        });

        const jsContent = `// استخراج‌شده از گلستان — ${new Date().toLocaleDateString('fa-IR')}\n// ${groups.join(' | ')}\nconst UNIVERSITY_DATA = ${JSON.stringify(allCourses, null, 2)};`;

        downloadJs(jsContent, 'course-offerings.generated.js');

        showResult(`
            <div class="result-stat"><span>تعداد درس استخراج‌شده:</span> <span class="val">${toPersian(allCourses.length)}</span></div>
            <div class="result-stat"><span>گروه‌های آموزشی:</span> <span class="val">${toPersian(offeredFrames.length)}</span></div>
            <div style="margin-top:8px;font-size:.73rem;color:#34d399;">
                ✓ فایل course-offerings.generated.js دانلود شد.<br>
                پس از بازبینی، آن را در <code>apps/web/generated/</code> قرار دهید.
            </div>
        `);
    } catch (e) {
        hideProgress(); showError('خطا: ' + e.message);
    }
}

$('btnExtractOffered').addEventListener('click', doExtractOffered);

$('btnCopyOffered').addEventListener('click', async () => {
    showProgress('در حال استخراج...');
    try {
        const tab = await getCurrentTab();
        await injectExtractor(tab);
        const frameResults = await extractFromAllFrames(tab);
        hideProgress();
        const courses = frameResults.filter(r => r.frameType === 'offered_courses').flatMap(r => r.courses);
        await copyText(JSON.stringify(courses, null, 2));
        $('btnCopyOffered').textContent = '✓ کپی شد!';
        setTimeout(() => { $('btnCopyOffered').textContent = '📋 کپی JSON'; }, 2000);
    } catch(e) { hideProgress(); showError(e.message); }
});

// ───────────────────────────────────────────────────────────────────────────
// چارت رشته — Extract & export
// ───────────────────────────────────────────────────────────────────────────
async function doExtractChart() {
    showProgress('در حال استخراج چارت رشته...');
    try {
        const tab = await getCurrentTab();
        await injectExtractor(tab);
        const frameResults = await extractFromAllFrames(tab);
        hideProgress();

        const chartFrames = frameResults.filter(r => r.frameType === 'curriculum_chart');
        if (chartFrames.length === 0) {
            showError('جدول چارت درسی پیدا نشد. مطمئن شوید صفحه بارگذاری کامل شده.');
            return;
        }

        // بزرگترین frame را انتخاب کن (بیشترین درس)
        const mainFrame = chartFrames.reduce((a, b) => a.courses.length > b.courses.length ? a : b);
        const { courses, faculty, group } = mainFrame;

        // خروجی JSON برای import در ادمین
        const output = {
            type: 'curriculum_chart',
            extractedAt: new Date().toISOString(),
            faculty,
            group,
            courses
        };

        downloadJson(output, 'golestan_curriculum.json');

        showResult(`
            <div class="result-stat"><span>دانشکده:</span> <span class="val" style="font-size:.75rem">${escapeHtml(faculty || '—')}</span></div>
            <div class="result-stat"><span>گروه:</span> <span class="val" style="font-size:.75rem">${escapeHtml(group || '—')}</span></div>
            <div class="result-stat"><span>کل درس‌ها:</span> <span class="val">${toPersian(courses.length)}</span></div>
            <div class="result-stat"><span>عمومی:</span> <span class="val">${toPersian(courses.filter(c=>c.type==='general').length)}</span></div>
            <div class="result-stat"><span>پایه + اصلی:</span> <span class="val">${toPersian(courses.filter(c=>c.type==='core'||c.type==='main').length)}</span></div>
            <div class="result-stat"><span>اختیاری:</span> <span class="val">${toPersian(courses.filter(c=>c.type==='elective').length)}</span></div>
            <div style="margin-top:8px;font-size:.73rem;color:#34d399;">
                ✓ فایل golestan_curriculum.json دانلود شد.<br>
                در پنل ادمین → «چارت درسی» → «ورود از گلستان» وارد کنید.
            </div>
        `);
    } catch (e) {
        hideProgress(); showError('خطا: ' + e.message);
    }
}

$('btnExtractChart').addEventListener('click', doExtractChart);

$('btnCopyChart').addEventListener('click', async () => {
    showProgress('در حال استخراج...');
    try {
        const tab = await getCurrentTab();
        await injectExtractor(tab);
        const frameResults = await extractFromAllFrames(tab);
        hideProgress();
        const chartFrame = frameResults.filter(r => r.frameType === 'curriculum_chart')
                                       .reduce((a,b) => !a || b.courses.length > a.courses.length ? b : a, null);
        if (!chartFrame) { showError('جدول پیدا نشد.'); return; }
        await copyText(JSON.stringify(chartFrame.courses, null, 2));
        $('btnCopyChart').textContent = '✓ کپی شد!';
        setTimeout(() => { $('btnCopyChart').textContent = '📋 کپی JSON'; }, 2000);
    } catch(e) { hideProgress(); showError(e.message); }
});

// ───────────────────────────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────────────────────────
detectPage();
