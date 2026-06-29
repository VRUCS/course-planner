// admin.js — منطق پنل ادمین
// utils.js باید قبل از این بارگذاری شده باشد.

const allCourses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];

// ─── Tab switching ────────────────────────────────────────────────────────
const TAB_IDS = ['rules', 'curriculum', 'ai'];
function switchAdminTab(t) {
    document.querySelectorAll('.page-tab').forEach((el, i) => el.classList.toggle('active', TAB_IDS[i] === t));
    document.getElementById('panelRules').classList.toggle('active', t === 'rules');
    document.getElementById('panelCurriculum').classList.toggle('active', t === 'curriculum');
    document.getElementById('panelAi').classList.toggle('active', t === 'ai');
}

// ─── AI Settings ──────────────────────────────────────────────────────────
function initAiSettings() {
    // پر کردن مدل‌ها
    const sel = document.getElementById('aiModelSelect');
    if (!sel || typeof AI === 'undefined') return;
    AI.MODELS.forEach(m => sel.add(new Option(m.label, m.id)));

    // بارگذاری تنظیمات ذخیره‌شده
    const { key, model } = AI.getSettings();
    if (key) document.getElementById('aiKeyInput').value = key;
    if (model) sel.value = model;
}

function toggleKeyVisibility() {
    const inp = document.getElementById('aiKeyInput');
    const btn = document.getElementById('eyeBtn');
    if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
    else                         { inp.type = 'password'; btn.textContent = '👁️'; }
}

function saveAiSettings() {
    const key   = document.getElementById('aiKeyInput').value.trim();
    const model = document.getElementById('aiModelSelect').value;
    AI.saveSettings(key, model);
    Toast.success('تنظیمات AI ذخیره شد.', 2500);
}

function clearAiSettings() {
    AI.saveSettings('', AI.MODELS[0].id);
    document.getElementById('aiKeyInput').value = '';
    document.getElementById('aiModelSelect').value = AI.MODELS[0].id;
    Toast.info('کلید API حذف شد.', 2500);
}

async function testAiConnection() {
    const key = document.getElementById('aiKeyInput').value.trim();
    if (!key) { Toast.warning('ابتدا کلید API را وارد کنید.'); return; }
    AI.saveSettings(key, document.getElementById('aiModelSelect').value);

    const btn = document.getElementById('testBtn');
    const res = document.getElementById('aiTestResult');
    btn.disabled = true;
    btn.textContent = '⏳ در حال تست...';
    res.style.display = 'none';

    try {
        const reply = await AI.testConnection();
        res.style.display = 'block';
        res.style.borderColor = 'var(--green)';
        res.style.background  = 'var(--green-dim)';
        res.textContent = `✓ اتصال موفق! پاسخ: ${reply}`;
        Toast.success('اتصال به OpenRouter برقرار شد.', 3000);
    } catch (e) {
        res.style.display = 'block';
        res.style.borderColor = 'var(--red)';
        res.style.background  = 'var(--red-dim)';
        res.textContent = `✗ خطا: ${e.message}`;
        Toast.error(e.message, 5000);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔌 تست اتصال';
    }
}

// ─── Rules editor ─────────────────────────────────────────────────────────
let rfRowCounter = 0;
let cfCohorts = ['۱۴۰۰', '۱۴۰۱'];

function rfInitFaculties() {
    const sel = document.getElementById('rfFaculty');
    [...new Set(allCourses.map(c => c.faculty))].sort().forEach(f => sel.add(new Option(f, f)));
}

function rfOnFacultyChange() {
    const fac = document.getElementById('rfFaculty').value;
    const grp = document.getElementById('rfGroup');
    grp.innerHTML = '<option value="">انتخاب گروه...</option>';
    const groups = [...new Set(allCourses.filter(c => c.faculty === fac).map(c => c.group))].sort();
    groups.forEach(g => grp.add(new Option(g, g)));
}

function rfAddRow(type) {
    const id = ++rfRowCounter;
    const tbody = document.getElementById(type === 'hard' ? 'hardRules' : 'softRules');
    const tr = document.createElement('tr');
    tr.id = `row-${type}-${id}`;
    tr.innerHTML = `
        <td>${buildAC(`ac-${type}-a-${id}`)}</td>
        <td>${buildAC(`ac-${type}-b-${id}`)}</td>
        <td><input type="text" placeholder="دلیل..." id="reason-${type}-${id}" style="width:100%"></td>
        <td><button class="btn btn-danger btn-sm" onclick="document.getElementById('row-${type}-${id}').remove()">×</button></td>
    `;
    tbody.appendChild(tr);
    initAC(`ac-${type}-a-${id}`);
    initAC(`ac-${type}-b-${id}`);
}

// Autocomplete component
function buildAC(id) {
    return `<div class="ac-wrap" id="wrap-${id}" style="position:relative">
        <div class="ac-sel" id="sel-${id}" style="display:none;background:var(--blue-dim);border:1px solid var(--blue);border-radius:var(--r1);padding:4px 8px;font-size:.78rem;display:none;align-items:center;gap:6px">
            <span style="background:var(--blue);color:#fff;border-radius:4px;padding:1px 6px;font-size:.68rem" id="tag-code-${id}"></span>
            <span id="tag-name-${id}"></span>
            <span style="cursor:pointer;color:var(--red);margin-right:auto" onclick="acClear('${id}')">×</span>
        </div>
        <input type="text" class="ac-inp" id="inp-${id}" placeholder="جستجو (کد یا نام)..." autocomplete="off" style="display:block">
        <div id="drop-${id}" style="position:absolute;top:calc(100% + 2px);right:0;left:0;background:var(--s3);border:1px solid var(--b2);border-radius:var(--r2);max-height:180px;overflow-y:auto;z-index:100;display:none"></div>
        <input type="hidden" id="code-${id}">
        <input type="hidden" id="name-${id}">
    </div>`;
}

function initAC(id) {
    const inp = document.getElementById(`inp-${id}`);
    if (!inp) return;
    inp.addEventListener('input', () => acSearch(id));
    inp.addEventListener('focus', () => acSearch(id));
    document.addEventListener('click', e => {
        const wrap = document.getElementById(`wrap-${id}`);
        if (wrap && !wrap.contains(e.target)) document.getElementById(`drop-${id}`).style.display = 'none';
    }, { passive: true });
}

function acSearch(id) {
    const inp = document.getElementById(`inp-${id}`);
    const term = normalizeStr(inp.value).toLowerCase();
    const fac = document.getElementById('rfFaculty').value;
    const grp = document.getElementById('rfGroup').value;
    const drop = document.getElementById(`drop-${id}`);

    let filtered = allCourses;
    if (fac) filtered = filtered.filter(c => c.faculty === fac);
    if (grp) filtered = filtered.filter(c => c.group  === grp);
    if (term) filtered = filtered.filter(c => normalizeStr(c.name).toLowerCase().includes(term) || normalizeStr(c.id).includes(term));
    filtered = [...new Map(filtered.map(c => [c.id.split('_')[0], c])).values()].slice(0, 25);

    if (!filtered.length) { drop.style.display = 'none'; return; }
    drop.innerHTML = filtered.map(c => {
        const base = c.id.split('_')[0];
        return `<div onclick="acSelect('${id}','${base}','${c.name.replace(/'/g,"\\'")}')"
                     style="padding:8px 12px;cursor:pointer;font-size:.8rem;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--b0)"
                     onmouseover="this.style.background='var(--b0)'" onmouseout="this.style.background=''">
                    <span>${c.name}</span>
                    <span style="color:var(--t3);font-size:.72rem;flex-shrink:0">${base}</span>
                </div>`;
    }).join('');
    drop.style.display = 'block';
}

function acSelect(id, code, name) {
    document.getElementById(`code-${id}`).value = code;
    document.getElementById(`name-${id}`).value = name;
    document.getElementById(`tag-code-${id}`).textContent = code;
    document.getElementById(`tag-name-${id}`).textContent = name;
    const sel = document.getElementById(`sel-${id}`);
    sel.style.display = 'flex';
    const inp = document.getElementById(`inp-${id}`);
    inp.style.display = 'none';
    document.getElementById(`drop-${id}`).style.display = 'none';
}

function acClear(id) {
    ['code','name'].forEach(k => document.getElementById(`${k}-${id}`).value = '');
    document.getElementById(`sel-${id}`).style.display = 'none';
    const inp = document.getElementById(`inp-${id}`);
    inp.style.display = 'block'; inp.value = '';
}

function rfCollect(type) {
    const rows = [];
    document.getElementById(type === 'hard' ? 'hardRules' : 'softRules').querySelectorAll('tr').forEach(tr => {
        const a = tr.querySelector(`[id^="code-"][id*="-a-"]`)?.value;
        const na = tr.querySelector(`[id^="name-"][id*="-a-"]`)?.value;
        const b = tr.querySelector(`[id^="code-"][id*="-b-"]`)?.value;
        const nb = tr.querySelector(`[id^="name-"][id*="-b-"]`)?.value;
        const reason = tr.querySelector(`[id^="reason-"]`)?.value || '';
        if (a && b) rows.push({ a, nameA: na, b, nameB: nb, reason });
    });
    return rows;
}

function rfLoadExisting() {
    const fac = document.getElementById('rfFaculty').value;
    const grp = document.getElementById('rfGroup').value;
    if (!fac || !grp) { Toast.warning('ابتدا دانشکده و گروه را انتخاب کنید'); return; }
    const key = `${fac} >> ${grp}`;
    if (typeof CONFLICT_RULES === 'undefined' || !CONFLICT_RULES[key]) {
        Toast.info('قوانینی برای این گروه یافت نشد'); return;
    }
    const r = CONFLICT_RULES[key];
    document.getElementById('hardRules').innerHTML = '';
    document.getElementById('softRules').innerHTML = '';
    (r.mustNotConflict || []).forEach(rule => {
        rfAddRow('hard');
        const id = rfRowCounter;
        acSelect(`ac-hard-a-${id}`, rule.a, rule.nameA);
        acSelect(`ac-hard-b-${id}`, rule.b, rule.nameB);
        const el = document.getElementById(`reason-hard-${id}`);
        if (el) el.value = rule.reason || '';
    });
    (r.shouldNotConflict || []).forEach(rule => {
        rfAddRow('soft');
        const id = rfRowCounter;
        acSelect(`ac-soft-a-${id}`, rule.a, rule.nameA);
        acSelect(`ac-soft-b-${id}`, rule.b, rule.nameB);
        const el = document.getElementById(`reason-soft-${id}`);
        if (el) el.value = rule.reason || '';
    });
    Toast.success('قوانین بارگذاری شد');
}

function rfExport() {
    const fac = document.getElementById('rfFaculty').value;
    const grp = document.getElementById('rfGroup').value;
    if (!fac || !grp) { Toast.warning('دانشکده و گروه را انتخاب کنید'); return; }
    const hardData = rfCollect('hard');
    const softData = rfCollect('soft');
    const key = `${fac} >> ${grp}`;
    const mustStr   = hardData.map(r => `        { a: "${r.a}", nameA: "${r.nameA}",\n          b: "${r.b}", nameB: "${r.nameB}",\n          reason: "${r.reason}" }`).join(',\n');
    const shouldStr = softData.map(r => `        { a: "${r.a}", nameA: "${r.nameA}",\n          b: "${r.b}", nameB: "${r.nameB}",\n          reason: "${r.reason}" }`).join(',\n');
    const code = `// اضافه کنید به CONFLICT_RULES در conflict_rules.js\n"${key}": {\n    mustNotConflict: [\n${mustStr}\n    ],\n    shouldNotConflict: [\n${shouldStr}\n    ]\n},`;
    openOutput('کد قوانین تداخل — conflict_rules.js', code);
}

function rfClear() {
    document.getElementById('hardRules').innerHTML = '';
    document.getElementById('softRules').innerHTML = '';
}

// ─── Curriculum editor ────────────────────────────────────────────────────
let cfRowCounter = 0;

function cfUpdateHeaders() {
    cfCohorts = (document.getElementById('cfCohorts').value || '').split(',').map(s => s.trim()).filter(Boolean);
    document.getElementById('cfCodeHeader1').textContent = cfCohorts[0] ? `کد ورودی ${cfCohorts[0]}` : 'کد ورودی ۱';
    document.getElementById('cfCodeHeader2').textContent = cfCohorts[1] ? `کد ورودی ${cfCohorts[1]}` : 'کد ورودی ۲';
}

function cfAddRow(data = {}) {
    const id = ++cfRowCounter;
    const tr = document.createElement('tr');
    tr.id = `cf-row-${id}`;
    tr.innerHTML = `
        <td><input type="number" value="${data.semester || ''}" min="1" max="8" style="width:55px" placeholder="ترم"></td>
        <td><input type="text" value="${data.id || `c_${id}`}" style="width:110px" id="cfid-${id}"></td>
        <td><input type="text" value="${data.name || ''}" placeholder="نام درس" style="min-width:130px"></td>
        <td><input type="number" value="${data.units || 3}" min="1" max="6" style="width:50px"></td>
        <td><select style="width:90px">
            <option value="core"     ${data.type==='core'?'selected':''}>اصلی</option>
            <option value="general"  ${data.type==='general'?'selected':''}>عمومی</option>
            <option value="elective" ${data.type==='elective'?'selected':''}>اختیاری</option>
            <option value="lab"      ${data.type==='lab'?'selected':''}>آزمایشگاه</option>
        </select></td>
        <td><input type="text" value="${(data.prereqs || []).join(', ')}" placeholder="id1, id2" style="min-width:110px"></td>
        <td><input type="text" value="${data.codes?.[cfCohorts[0]] || data.codes?.['*'] || ''}" style="width:100px"></td>
        <td><input type="text" value="${data.codes?.[cfCohorts[1]] || ''}" style="width:100px"></td>
        <td><button class="btn btn-danger btn-sm" onclick="document.getElementById('cf-row-${id}').remove()">×</button></td>
    `;
    document.getElementById('cfRows').appendChild(tr);
}

function cfCollect() {
    const courses = [];
    document.getElementById('cfRows').querySelectorAll('tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input');
        const sel = tr.querySelector('select');
        if (!inputs[2].value.trim()) return;
        const prereqs = inputs[5].value.split(',').map(s => s.trim()).filter(Boolean);
        const code1 = inputs[6].value.trim();
        const code2 = inputs[7].value.trim();
        const codes = {};
        if (code1 === code2 && code1) { codes['*'] = code1; }
        else {
            if (code1 && cfCohorts[0]) codes[cfCohorts[0]] = code1;
            if (code2 && cfCohorts[1]) codes[cfCohorts[1]] = code2;
        }
        courses.push({
            id: inputs[1].value.trim() || `c_${courses.length + 1}`,
            semester: parseInt(inputs[0].value) || 1,
            name: inputs[2].value.trim(),
            units: parseInt(inputs[3].value) || 3,
            type: sel.value,
            prereqs, codes
        });
    });
    return courses;
}

function cfExport() {
    const fieldName  = document.getElementById('cfFieldName').value.trim() || 'نام رشته';
    const faculty    = document.getElementById('cfFaculty').value.trim();
    const group      = document.getElementById('cfGroup').value.trim();
    const totalUnits = parseInt(document.getElementById('cfTotalUnits').value) || 140;
    cfUpdateHeaders();
    if (!faculty || !group) { Toast.warning('دانشکده و گروه را وارد کنید'); return; }
    const key = `${faculty} >> ${group}`;
    const coursesArr = cfCollect();
    const coursesStr = coursesArr.map(c =>
        `        { id: "${c.id}", name: "${c.name}", units: ${c.units}, semester: ${c.semester}, prereqs: ${JSON.stringify(c.prereqs)}, type: "${c.type}",\n          codes: ${JSON.stringify(c.codes)} }`
    ).join(',\n');
    const code = `// اضافه کنید به CURRICULUM_REGISTRY در curriculum_cs.js\n"${key}": {\n    fieldName: "${fieldName}",\n    totalUnits: ${totalUnits},\n    cohorts: ${JSON.stringify(cfCohorts)},\n    courses: [\n${coursesStr}\n    ]\n},`;
    openOutput('کد چارت درسی — curriculum_cs.js', code);
}

function cfClear() { document.getElementById('cfRows').innerHTML = ''; cfRowCounter = 0; }

// ─── Output modal ─────────────────────────────────────────────────────────
function openOutput(title, code) {
    document.getElementById('outputTitle').textContent = title;
    document.getElementById('outputCode').value = code;
    document.getElementById('copyMsg').style.display = 'none';
    document.getElementById('outputModal').classList.add('open');
}
function closeOutput() { document.getElementById('outputModal').classList.remove('open'); }

async function copyOutput() {
    try {
        await navigator.clipboard.writeText(document.getElementById('outputCode').value);
        document.getElementById('copyMsg').style.display = 'inline';
        Toast.success('کپی شد!', 2000);
    } catch (e) { Toast.error('کپی ناموفق'); }
}

// ─── Init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    rfInitFaculties();
    cfUpdateHeaders();
    document.getElementById('cfCohorts').addEventListener('input', cfUpdateHeaders);
    initAiSettings();
});
