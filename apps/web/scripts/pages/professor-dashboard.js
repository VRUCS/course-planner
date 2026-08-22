// Professor dashboard page controller.
// Shared UI and planner domain scripts are loaded before this controller.

const allCourses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];
const rules = (typeof CONFLICT_RULES !== 'undefined') ? CONFLICT_RULES : {};
const planner = window.PlannerDomain;

// ─── Init ─────────────────────────────────────────────────────────────────
function init() {
    const sel = document.getElementById('facultySelect');
    planner.getFaculties(allCourses).forEach(faculty => sel.add(new Option(faculty, faculty)));
    buildEmptyTimetable();
}

// ─── Filter handlers ──────────────────────────────────────────────────────
function onFacultyChange() {
    const fac = document.getElementById('facultySelect').value;
    const grp = document.getElementById('groupSelect');
    grp.innerHTML = '<option value="">انتخاب گروه...</option>';
    if (fac) {
        planner.getGroups(allCourses, fac).forEach(group => grp.add(new Option(group, group)));
    }
    render();
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
                <div class="empty-state-icon">${AppIcons.svg('ListChecks')}</div>
                <div class="empty-state-title">ابتدا یک گروه انتخاب کنید</div>
            </div>`;
        return;
    }

    document.getElementById('ttTitle').textContent = `برنامه هفتگی — ${fac} / ${grp}`;
    const groupCourses = allCourses.filter(c => c.faculty === fac && c.group === grp);
    const ruleset = rules[`${fac} >> ${grp}`] || { mustNotConflict: [], shouldNotConflict: [] };

    const allConflicts = planner.evaluateConflictRules(groupCourses, ruleset, filterType);

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
        el.className = i === 0 ? 'timetable-header timetable-corner' : 'timetable-header';
        el.textContent = d;
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
            div.className = `class-block${blockCourses.length > 1 ? ' dense' : ''}${isHard ? ' conflict' : ''}`;
            // Hard conflicts keep the .conflict styling; soft ones tint yellow.
            if (!isHard) div.style.setProperty('--fc', isSoft ? 'var(--yellow)' : 'var(--blue)');
            div.title = `${c.name}\n${c.prof}\n${c.id}`;
            if (isHard) div.insertAdjacentHTML('beforeend', `<span class="class-block-alert" aria-label="تداخل سخت">${AppIcons.svg('CircleAlert')}</span>`);
            const name = document.createElement('div');
            name.className = 'class-block-name';
            name.textContent = c.name;
            const id = document.createElement('div');
            id.className = 'class-block-prof';
            id.textContent = c.id;
            div.append(name, id);
            el.appendChild(div);
        });
    });
}

// ─── Conflict list ────────────────────────────────────────────────────────
function buildConflictList(conflicts) {
    const list = document.getElementById('conflictList');
    if (!conflicts.length) {
        list.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">${AppIcons.svg('CircleCheck')}</div>
            <div class="empty-state-title">هیچ تداخلی یافت نشد</div>
            <div class="empty-state-desc">برنامه این گروه با قوانین تعریف‌شده سازگار است.</div>
        </div>`;
        return;
    }

    list.replaceChildren();
    conflicts.forEach(({ type, rule, overlaps }) => {
        const timePills = [...new Set(overlaps.flatMap(o => o.times))]
            .map(t => `<span class="time-chip">${SafeDOM.escape(t)}</span>`).join('');
        const sections = overlaps.map(o => `${o.secA} ↔ ${o.secB}`)
            .map(s => `<div style="font-size:var(--fs-2xs);color:var(--t2);margin-top:2px">${SafeDOM.escape(s)}</div>`).join('');
        const card = document.createElement('div');
        card.className = `conflict-card ${type}`;
        card.innerHTML = `
                <div class="conflict-header">
                    <span class="conflict-severity ${type}">${AppIcons.svg(type === 'hard' ? 'CircleX' : 'CircleAlert')} ${type === 'hard' ? 'سخت' : 'نرم'}</span>
                    <button class="ai-explain-btn" type="button" title="توضیح AI">${AppIcons.svg('Info')} توضیح</button>
                </div>
                <div class="conflict-pair">${SafeDOM.escape(rule.nameA)} ↔ ${SafeDOM.escape(rule.nameB)}</div>
                <div class="conflict-sections">${sections}</div>
                <div class="conflict-reason">${SafeDOM.escape(rule.reason)}</div>
                <div class="conflict-times">${timePills}</div>
            `;
        card.querySelector('.ai-explain-btn').addEventListener('click', () => explainConflict(rule, type));
        list.appendChild(card);
    });
}

// ─── Conflict Explainer ───────────────────────────────────────────────────
async function explainConflict(rule, type) {
    if (typeof AI === 'undefined' || !AI.isInteractiveEnabled()) {
        Toast.info('فیچر توضیح AI هنوز فعال نشده.');
        return;
    }
    Toast.info('در حال تهیه توضیح...', 2000);
    try {
        const explanation = await AI.complete([{
            role: 'user',
            content: `دو درس «${rule.nameA}» و «${rule.nameB}» در برنامه هفتگی گروه آموزشی تداخل دارند.
نوع تداخل: ${type === 'hard' ? 'سخت (اجباری)' : 'نرم (توصیه‌شده)'}
دلیل قانون: ${rule.reason}

به فارسی ساده (حداکثر ۸۰ کلمه) توضیح بده چرا این تداخل مشکل‌ساز است و چه راه‌حلی پیشنهاد می‌دهی.`
        }]);
        Toast.info(explanation, 8000);
    } catch (e) {
        Toast.error('خطا: ' + e.message);
    }
}

function setSummary(total, hard, soft, ok) {
    document.getElementById('sumTotal').textContent = toPersianNum(total);
    document.getElementById('sumHard').textContent  = toPersianNum(hard);
    document.getElementById('sumSoft').textContent  = toPersianNum(soft);
    document.getElementById('sumOk').textContent    = toPersianNum(ok);
}

init();
