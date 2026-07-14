// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
const courses = (typeof UNIVERSITY_DATA !== 'undefined') ? UNIVERSITY_DATA : [];
const planner = window.PlannerDomain;
const stateRepository = window.PlannerStorage.createRepository(window.localStorage);

const state = {
    selected: new Set(),           // IDs of selected courses
    activeSidebarTab: 'search',
    cohort: stateRepository.getPreference('cohort'),
    curriculum: { passed: new Set(), failed: new Set() },
    expandedGroups: new Set(),
    visibleGroups: 30,
    planView: window.innerWidth < 900 ? 'list' : 'weekly',
    pendingAction: null,
};

function getMaxUnits() {
    return CourseDomain.maxUnitsForGpa(stateRepository.getPreference('gpa'));
}

function onGpaChange(rawValue) {
    const value = parseFloat(rawValue);
    if (Number.isFinite(value) && value >= 0 && value <= 20) {
        stateRepository.setPreference('gpa', value);
    } else {
        stateRepository.setPreference('gpa', null);
    }
    updateUnitDisplay();
    restoreGpaInput();
}

function restoreGpaInput() {
    // Desktop input and mobile-sheet input stay in sync; never overwrite the
    // field the user is currently typing in.
    const value = stateRepository.getPreference('gpa');
    ['gpaInput', 'gpaInputSheet', 'profileGpa'].forEach(id => {
        const input = document.getElementById(id);
        if (input && document.activeElement !== input) input.value = value ?? '';
    });
}

function profileCurriculumFor(faculty, group) {
    if (typeof CURRICULUM_REGISTRY === 'undefined' || !faculty || !group) return null;
    return CURRICULUM_REGISTRY[`${faculty} >> ${group}`] || null;
}

function populateProfileGroups(selectedGroup = '') {
    const faculty = document.getElementById('profileFaculty').value;
    const groupSelect = document.getElementById('profileGroup');
    groupSelect.innerHTML = `<option value="">${faculty ? 'انتخاب رشته / گروه' : 'ابتدا دانشکده را انتخاب کنید'}</option>`;
    planner.getGroups(courses, faculty).forEach(group => groupSelect.add(new Option(group, group)));
    if ([...groupSelect.options].some(option => option.value === selectedGroup)) groupSelect.value = selectedGroup;
}

function updateProfileCurriculumOptions(selectedCohort = '') {
    const faculty = document.getElementById('profileFaculty').value;
    const group = document.getElementById('profileGroup').value;
    const curriculum = profileCurriculumFor(faculty, group);
    const cohortSelect = document.getElementById('profileCohort');
    const note = document.getElementById('profileCurriculumNote');
    const curriculumButton = document.getElementById('profileCurriculumBtn');
    cohortSelect.innerHTML = '<option value="">نامشخص</option>';
    (curriculum?.cohorts || []).forEach(cohort => cohortSelect.add(new Option(cohort, cohort)));
    if (selectedCohort && ![...cohortSelect.options].some(option => option.value === selectedCohort)) {
        cohortSelect.add(new Option(selectedCohort, selectedCohort));
    }
    cohortSelect.value = selectedCohort || '';
    cohortSelect.disabled = !curriculum;
    curriculumButton.hidden = !curriculum;
    note.textContent = !group ? '' : curriculum
        ? 'نقشه درسی این رشته موجود است؛ پس از ذخیره می‌توانید درس‌های چارت و وضعیت پیش‌نیازها را ببینید.'
        : 'فعلاً نقشه درسی این رشته در داده‌های پروژه موجود نیست؛ فیلتر درس‌های ارائه‌شده همچنان اعمال می‌شود.';
}

function openStudentProfile() {
    const facultySelect = document.getElementById('profileFaculty');
    if (facultySelect.options.length === 1) {
        planner.getFaculties(courses).forEach(faculty => facultySelect.add(new Option(faculty, faculty)));
    }
    const faculty = stateRepository.getPreference('faculty');
    const group = stateRepository.getPreference('group');
    facultySelect.value = [...facultySelect.options].some(option => option.value === faculty) ? faculty : '';
    populateProfileGroups(group);
    updateProfileCurriculumOptions(stateRepository.getPreference('cohort'));
    document.getElementById('profileGpa').value = stateRepository.getPreference('gpa');
    document.getElementById('deleteProfileBtn').hidden = ![faculty, group,
        stateRepository.getPreference('cohort'), stateRepository.getPreference('gpa')].some(Boolean);
    openDialog(document.getElementById('studentProfileModal'));
}

function closeStudentProfile() {
    closeDialog(document.getElementById('studentProfileModal'));
}

function onProfileFacultyChange() {
    populateProfileGroups();
    updateProfileCurriculumOptions();
}

function onProfileGroupChange() {
    updateProfileCurriculumOptions();
}

function applyStudentProfile(event) {
    event.preventDefault();
    const faculty = document.getElementById('profileFaculty').value;
    const group = document.getElementById('profileGroup').value;
    const cohort = document.getElementById('profileCohort').value;
    const gpaInput = document.getElementById('profileGpa');
    const gpa = gpaInput.value.trim();
    if (!faculty || !group) return;
    if (gpa && (!gpaInput.checkValidity() || Number(gpa) < 0 || Number(gpa) > 20)) {
        gpaInput.reportValidity();
        return;
    }
    stateRepository.setPreference('faculty', faculty);
    stateRepository.setPreference('group', group);
    stateRepository.setPreference('cohort', cohort);
    stateRepository.setPreference('gpa', gpa);
    stateRepository.setPreference('onboarding', 'done');
    state.cohort = cohort;

    document.getElementById('facultyFilter').value = faculty;
    rebuildGroupFilter();
    document.getElementById('groupFilter').value = group;
    dismissQuickStart();
    restoreGpaInput();
    updateUnitDisplay();
    state.visibleGroups = 30;
    renderCourseList();
    syncCurriculumTab();
    closeStudentProfile();
    if (isSingleWorkspace()) setMobView('search');
    else switchTab('search');
    Toast.success('پروفایل ذخیره شد و درس‌های مرتبط نمایش داده شدند.');
}

function deleteStudentProfile() {
    ['faculty', 'group', 'cohort', 'gpa'].forEach(name => stateRepository.setPreference(name, null));
    state.cohort = '';
    document.getElementById('facultyFilter').value = '';
    rebuildGroupFilter();
    document.getElementById('groupFilter').value = '';
    restoreGpaInput();
    updateUnitDisplay();
    renderCourseList();
    syncCurriculumTab();
    closeStudentProfile();
    Toast.info('پروفایل محلی از این مرورگر حذف شد.');
}

function openProfileCurriculum() {
    const form = document.getElementById('studentProfileForm');
    if (form.requestSubmit) form.requestSubmit();
    else applyStudentProfile({ preventDefault() {} });
    if (isSingleWorkspace()) setMobView('curriculum');
    else switchTab('curriculum');
}

// Faculty → color mapping (built at init)
const facultyColors = {};
const dialogFocusOrigins = new WeakMap();

function openDialog(dialog) {
    if (!dialog) return;
    dialogFocusOrigins.set(dialog, document.activeElement);
    dialog.classList.add('open');
    const target = dialog.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!target) return;
    target.focus();
    // children with `transition: all` stay visibility:hidden for a frame after
    // the backdrop opens, silently defeating the synchronous focus()
    if (document.activeElement !== target) {
        setTimeout(() => {
            if (!dialog.contains(document.activeElement)) target.focus();
        }, 60);
    }
}

function closeDialog(dialog) {
    if (!dialog) return;
    dialog.classList.remove('open');
    dialogFocusOrigins.get(dialog)?.focus?.();
    dialogFocusOrigins.delete(dialog);
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
function init() {
    buildFacultyColors();
    loadState();
    setupFilters();
    restoreFacultyGroup();
    buildTimetableGrid();
    renderCourseList();
    updateTimetable();
    updateUnitDisplay();

    // Restore saved faculty/group
    restoreGpaInput();
    syncThemeButton(Theme.current());

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(() => {
        state.visibleGroups = 30; renderCourseList();
    }, 200));
    document.getElementById('facultyFilter').addEventListener('change', () => {
        rebuildGroupFilter(); renderCourseList(); syncCurriculumTab(); saveFacultyGroup();
    });
    document.getElementById('groupFilter').addEventListener('change', () => {
        renderCourseList(); syncCurriculumTab(); saveFacultyGroup();
        if (document.getElementById('facultyFilter').value &&
            document.getElementById('groupFilter').value) dismissQuickStart();
    });
    ['genderFilter', 'dayFilter', 'unitsFilter', 'sortFilter', 'availabilityFilter', 'conflictFilter']
        .forEach(id => document.getElementById(id)?.addEventListener('change', () => {
            state.visibleGroups = 30; renderCourseList();
        }));
    document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault(); document.getElementById('searchInput').focus(); return;
        }
        const openModal = document.querySelector('.modal-backdrop.open');
        if (openModal && event.key === 'Tab') trapDialogFocus(openModal, event);
        if (event.key !== 'Escape') return;
        const dialog = openModal;
        if (dialog) closeDialog(dialog);
    });
    setPlanView(state.planView);
    if (stateRepository.getPreference('onboarding') === 'done') dismissQuickStart();
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
    stateRepository.saveSelection(state.selected);
}

function loadState() {
    state.selected = stateRepository.loadSelection(new Set(courses.map(course => course.id)));
    state.curriculum = stateRepository.loadCurriculumProgress();
}

function saveCurriculumState() {
    stateRepository.saveCurriculumProgress(state.curriculum);
}

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR TABS
// ═══════════════════════════════════════════════════════════════════════════
function switchTab(tab) {
    state.activeSidebarTab = tab;
    ['search', 'curriculum'].forEach(t => {
        const selected = t === tab;
        const suffix = t[0].toUpperCase() + t.slice(1);
        const button = document.getElementById(`tabBtn${suffix}`);
        const panel = document.getElementById(`tab${suffix}`);
        button.classList.toggle('active', selected);
        button.setAttribute('aria-selected', String(selected));
        panel.classList.toggle('active', selected);
        panel.hidden = !selected;
        if (selected) selectTab(button);
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
    planner.getFaculties(courses).forEach(faculty => sel.add(new Option(faculty, faculty)));
}

function saveFacultyGroup() {
    stateRepository.setPreference('faculty', document.getElementById('facultyFilter').value);
    stateRepository.setPreference('group', document.getElementById('groupFilter').value);
}

function restoreFacultyGroup() {
    const savedFac = stateRepository.getPreference('faculty');
    const savedGrp = stateRepository.getPreference('group');
    if (!savedFac) return;

    const facSel = document.getElementById('facultyFilter');
    if ([...facSel.options].some(o => o.value === savedFac)) {
        facSel.value = savedFac;
        rebuildGroupFilter();
        if (savedGrp) {
            const grpSel = document.getElementById('groupFilter');
            if ([...grpSel.options].some(o => o.value === savedGrp)) grpSel.value = savedGrp;
        }
    }
}

function rebuildGroupFilter() {
    const fac = document.getElementById('facultyFilter').value;
    const sel = document.getElementById('groupFilter');
    sel.innerHTML = '<option value="">همه گروه‌ها</option>';
    planner.getGroups(courses, fac).forEach(group => sel.add(new Option(group, group)));
}

function formatSessionChip(session) {
    const startHour = Math.floor(session.startMinutes / 60);
    const endHour = Math.ceil(session.endMinutes / 60);
    return `${DAY_NAMES[session.day]} ${toPersianNum(startHour)}–${toPersianNum(endHour)}`;
}

function getSelectedSessionList(excludeId) {
    return [...state.selected]
        .filter(id => id !== excludeId)
        .map(id => courses.find(x => x.id === id))
        .filter(Boolean)
        .map(c => CourseDomain.parseSchedule(c.time_html))
        .filter(sessions => sessions.length);
}

function hasTimeClashWithSelection(course) {
    const sessions = CourseDomain.parseSchedule(course.time_html);
    if (!sessions.length) return false;
    return getSelectedSessionList(course.id)
        .some(other => CourseDomain.sessionsOverlap(sessions, other));
}

function getFilterState() {
    return {
        term: document.getElementById('searchInput').value,
        faculty: document.getElementById('facultyFilter').value,
        group: document.getElementById('groupFilter').value,
        gender: document.getElementById('genderFilter').value,
        day: document.getElementById('dayFilter').value,
        units: document.getElementById('unitsFilter').value,
        availableOnly: document.getElementById('availabilityFilter').checked,
        conflictFreeOnly: document.getElementById('conflictFilter').checked,
        selectedCourses: [...state.selected].map(id => courses.find(course => course.id === id)).filter(Boolean),
    };
}

function renderCourseList() {
    const filters = getFilterState();
    const filtered = planner.filterCourses(courses, filters);
    const groups = planner.sortCourseGroups(
        planner.groupCourses(filtered), document.getElementById('sortFilter').value);

    document.getElementById('courseCount').textContent =
        `${toPersianNum(groups.length)} درس · ${toPersianNum(filtered.length)} ارائه`;
    document.getElementById('selectedStat').textContent =
        state.selected.size ? `${toPersianNum(state.selected.size)} انتخاب‌شده` : '';

    const list = document.getElementById('courseList');
    list.innerHTML = '';

    renderActiveFilters(filters);
    if (!groups.length) {
        list.innerHTML = `<div class="empty-state" style="padding:40px 0">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">درسی با این مشخصات پیدا نشد</div>
            <div class="empty-state-desc">فیلترها را کمتر کن یا نام و کد درس را دوباره بررسی کن.</div>
            <button class="btn btn-ghost" onclick="clearAllFilters()">پاک‌کردن فیلترها</button>
        </div>`;
        return;
    }

    const frag = document.createDocumentFragment();
    groups.slice(0, state.visibleGroups).forEach(group => {
        const expanded = state.expandedGroups.has(group.baseId);
        const selected = group.sections.filter(section => state.selected.has(section.id));
        const safeBase = encodeURIComponent(group.baseId);
        const conflictFree = group.sections.filter(section =>
            !planner.deriveAdditionRisks(section, state.selected, courses, getMaxUnits()).classConflicts.length).length;
        const article = document.createElement('article');
        article.className = `course-group${selected.length ? ' selected' : ''}`;
        if (group.sections.length === 1) {
            const section = group.sections[0];
            const isSelected = state.selected.has(section.id);
            const sessions = CourseDomain.parseSchedule(section.time_html);
            const sessionLabel = sessions.length
                ? sessions.map(formatSessionChip).join('، ')
                : 'زمان اعلام نشده';
            article.innerHTML = `<div class="single-course-summary">
              <div class="single-course-heading">
                <h3 class="course-group-title">${SafeDOM.escape(section.name || 'درس بدون نام')}</h3>
                <span class="course-group-meta"><bdi dir="ltr">${SafeDOM.escape(group.baseId)}</bdi> · ${toPersianNum(section.units || 0)} واحد</span>
              </div>
              <dl class="single-course-facts">
                <div><dt>استاد</dt><dd>${SafeDOM.escape(section.prof || 'استاد اعلام نشده')}</dd></div>
                <div><dt>زمان کلاس</dt><dd>${SafeDOM.escape(sessionLabel)}</dd></div>
              </dl>
              <div class="section-action">
                <button type="button" class="btn ${isSelected ? 'btn-ghost' : 'btn-primary'} btn-sm" ${isSelected ? 'disabled' : ''}>${isSelected ? 'انتخاب‌شده' : 'افزودن به برنامه'}</button>
                ${isSelected ? '<button type="button" class="remove-section" aria-label="حذف این درس">×</button>' : ''}
              </div>
            </div>`;
            article.querySelector('.section-action .btn').addEventListener('click', () => requestAdd(section.id));
            article.querySelector('.remove-section')?.addEventListener('click', () => removeCourse(section.id));
            frag.appendChild(article);
            return;
        }
        article.innerHTML = `<button type="button" class="course-group-toggle" aria-expanded="${expanded}" aria-controls="sections-${safeBase}">
          <span class="course-group-title">${SafeDOM.escape(group.course.name || 'درس بدون نام')}</span>
          <span class="course-group-meta"><bdi dir="ltr">${SafeDOM.escape(group.baseId)}</bdi> · ${toPersianNum(group.course.units || 0)} واحد<br>${toPersianNum(group.sections.length)} گروه ارائه شده · ${toPersianNum(conflictFree)} گروه بدون تداخل</span>
          <span class="course-group-chevron" aria-hidden="true">${expanded ? '⌃' : '⌄'}</span></button>
          <div class="section-list" id="sections-${safeBase}" ${expanded ? '' : 'hidden'}></div>`;
        article.querySelector('button').addEventListener('click', () => {
            if (expanded) state.expandedGroups.delete(group.baseId); else state.expandedGroups.add(group.baseId);
            renderCourseList();
        });
        const sectionList = article.querySelector('.section-list');
        if (expanded) group.sections.forEach(section => sectionList.appendChild(buildSectionRow(section)));
        frag.appendChild(article);
    });

    if (groups.length > state.visibleGroups) {
        const more = document.createElement('button');
        more.className = 'btn btn-ghost load-more'; more.textContent = 'نمایش موارد بیشتر';
        more.onclick = () => { state.visibleGroups += 30; renderCourseList(); };
        frag.appendChild(more);
    }
    list.appendChild(frag);
}

function buildSectionRow(course) {
    const row = document.createElement('div');
    const selected = state.selected.has(course.id);
    const sessions = CourseDomain.parseSchedule(course.time_html);
    const exam = CourseDomain.parseExam(course.exam_text);
    const remaining = Number(course.capacity) > 0
        ? `${toPersianNum(Math.max(0, Number(course.capacity) - Number(course.enrolled || 0)))} نفر خالی`
        : 'ظرفیت اعلام نشده';
    row.className = `section-row${selected ? ' is-selected' : ''}`;
    row.innerHTML = `<div class="section-cell"><strong>${SafeDOM.escape(course.prof || 'استاد اعلام نشده')}</strong><span>گروه <bdi dir="ltr">${SafeDOM.escape(planner.getSectionId(course))}</bdi></span></div>
      <div class="section-cell"><strong>${sessions.length ? sessions.map(formatSessionChip).join('، ') : 'زمان اعلام نشده'}</strong><span>${SafeDOM.escape(course.gender || 'جنسیت اعلام نشده')}</span></div>
      <div class="section-cell"><strong>${exam ? toPersianNum(exam.date) : 'تاریخ اعلام نشده'}</strong><span>امتحان</span></div>
      <div class="section-cell"><strong>${remaining}</strong><span>${Number(course.capacity) > 0 ? `${toPersianNum(course.enrolled || 0)} از ${toPersianNum(course.capacity)}` : ''}</span></div>
      <div class="section-action"><button type="button" class="btn ${selected ? 'btn-ghost' : 'btn-primary'} btn-sm" ${selected ? 'disabled' : ''}>${selected ? 'انتخاب‌شده' : 'افزودن'}</button>${selected ? '<button type="button" class="remove-section" aria-label="حذف این گروه">×</button>' : ''}</div>`;
    row.querySelector('.section-action .btn').addEventListener('click', () => requestAdd(course.id));
    row.querySelector('.remove-section')?.addEventListener('click', () => removeCourse(course.id));
    return row;
}

let lastAddedId = null;
function requestAdd(id) {
    const course = planner.findCourse(courses, id);
    if (!course || state.selected.has(id)) return;
    const sameBase = [...state.selected].map(selectedId => planner.findCourse(courses, selectedId))
        .find(selectedCourse => selectedCourse && planner.getBaseCourseId(selectedCourse) === planner.getBaseCourseId(course));
    const change = planner.planSelectionChange(course, state.selected, courses, getMaxUnits(), sameBase?.id || null);
    const { risks } = change;
    if (sameBase || risks.classConflicts.length || risks.examConflicts.length || risks.unitOverflow) {
        state.pendingAction = { course, change, replaceId: change.replaceId, risks };
        showRiskDialog(); return;
    }
    commitAdd(course, change);
}

function commitAdd(course, change = planner.planSelectionChange(course, state.selected, courses, getMaxUnits())) {
    const before = new Set(change.before);
    state.selected = new Set(change.after); lastAddedId = course.id;
    saveState();
    renderCourseList();
    updateTimetable();
    updateUnitDisplay();
    if (state.activeSidebarTab === 'curriculum') renderCurriculumTab();
    scheduleLoadAnalysis();
    const toast = Toast.info(`${course.name} اضافه شد`, 5000);
    const undo = document.createElement('button');
    undo.type = 'button'; undo.className = 'toast-close'; undo.textContent = 'واگردانی';
    undo.setAttribute('aria-label', `واگردانی افزودن ${course.name}`);
    undo.addEventListener('click', () => {
        state.selected = new Set(before); saveState(); renderCourseList(); updateTimetable(); updateUnitDisplay();
        toast.remove();
    });
    toast.insertBefore(undo, toast.lastElementChild);
}

function removeCourse(id) {
    state.selected.delete(id); saveState(); renderCourseList(); updateTimetable(); updateUnitDisplay();
    if (state.activeSidebarTab === 'curriculum') renderCurriculumTab();
}

function toggleCourse(id) {
    if (state.selected.has(id)) removeCourse(id); else requestAdd(id);
}

function findExamClash(course) {
    return planner.findExamClash(course, state.selected, courses);
}

function showRiskDialog() {
    const { course, replaceId, risks } = state.pendingAction;
    const items = [];
    if (replaceId) {
        const old = planner.findCourse(courses, replaceId);
        items.push(`گروه ${planner.getSectionId(old)} با گروه ${planner.getSectionId(course)} جایگزین شود؟`);
    }
    risks.classConflicts.forEach(other => items.push(`تداخل کلاس با «${other.name}»`));
    risks.examConflicts.forEach(other => items.push(`تداخل امتحان با «${other.name}»`));
    if (risks.unitOverflow) items.push(`مجموع ${toPersianNum(risks.unitOverflow.projectedUnits)} واحد از سقف ${toPersianNum(risks.unitOverflow.maxUnits)} واحد بیشتر است.`);
    document.getElementById('riskContent').innerHTML = `<p>برای افزودن «${SafeDOM.escape(course.name)}» این موارد را بررسی کن:</p><ul>${items.map(item => `<li>${SafeDOM.escape(item)}</li>`).join('')}</ul>`;
    document.getElementById('riskConfirmBtn').textContent = replaceId ? 'جایگزینی' : 'با وجود تداخل اضافه کن';
    openDialog(document.getElementById('riskModal'));
}

function cancelPendingAction() {
    closeDialog(document.getElementById('riskModal')); state.pendingAction = null;
}

function confirmPendingAction() {
    if (!state.pendingAction) return;
    const { course, change } = state.pendingAction;
    closeDialog(document.getElementById('riskModal')); state.pendingAction = null;
    commitAdd(course, change);
}

function reviewPendingRisk() {
    closeDialog(document.getElementById('riskModal'));
    state.pendingAction = null;
    setMobView('schedule');
    setPlanView('list');
}

function trapDialogFocus(dialog, event) {
    const focusable = [...dialog.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function toggleFilters() {
    const panel = document.getElementById('advancedFilters');
    panel.hidden = !panel.hidden;
    document.getElementById('filterToggle').setAttribute('aria-expanded', String(!panel.hidden));
}

function renderActiveFilters(filters) {
    const target = document.getElementById('activeFilters');
    const chips = [];
    const add = (label, reset) => chips.push({ label, reset });
    if (filters.term) add(`جستجو: ${filters.term}`, () => { document.getElementById('searchInput').value = ''; });
    if (filters.gender) add(`جنسیت: ${filters.gender}`, () => { document.getElementById('genderFilter').value = ''; });
    if (filters.day !== '') add(`روز: ${DAY_NAMES[Number(filters.day)]}`, () => { document.getElementById('dayFilter').value = ''; });
    if (filters.units) add(`${filters.units} واحدی`, () => { document.getElementById('unitsFilter').value = ''; });
    if (filters.availableOnly) add('ظرفیت دارد', () => { document.getElementById('availabilityFilter').checked = false; });
    if (filters.conflictFreeOnly) add('بدون تداخل', () => { document.getElementById('conflictFilter').checked = false; });
    if (document.getElementById('sortFilter').value !== 'relevance') add('مرتب‌سازی سفارشی', () => {
        document.getElementById('sortFilter').value = 'relevance';
    });
    target.innerHTML = '';
    chips.forEach(chip => {
        const button = document.createElement('button'); button.className = 'filter-chip';
        button.textContent = `${chip.label} ×`; button.addEventListener('click', () => { chip.reset(); renderCourseList(); });
        target.appendChild(button);
    });
    if (chips.length) {
        const clear = document.createElement('button'); clear.className = 'filter-chip'; clear.textContent = 'پاک‌کردن همه';
        clear.addEventListener('click', clearAllFilters); target.appendChild(clear);
    }
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('facultyFilter').value = '';
    rebuildGroupFilter();
    document.getElementById('groupFilter').value = '';
    ['genderFilter', 'dayFilter', 'unitsFilter'].forEach(id => { document.getElementById(id).value = ''; });
    ['availabilityFilter', 'conflictFilter'].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById('sortFilter').value = 'relevance';
    saveFacultyGroup();
    renderCourseList();
}

function dismissQuickStart() {
    const panel = document.getElementById('quickStart');
    if (panel) panel.hidden = true;
    stateRepository.setPreference('onboarding', 'done');
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIT DISPLAY
// ═══════════════════════════════════════════════════════════════════════════
function getSelectedUnits() {
    return CourseDomain.totalUnits(state.selected, courses);
}

function updateUnitDisplay() {
    const total = getSelectedUnits();
    const maxUnits = getMaxUnits();
    const pct   = Math.min(100, Math.round(total / maxUnits * 100));
    const countText = `${total > maxUnits ? '⚠ ' : ''}${toPersianNum(total)}`;
    const fillColor = total > maxUnits ? 'var(--err-text)'
        : total > maxUnits * 0.8 ? 'var(--warn-text)' : 'var(--accent)';

    // ── desktop unit bar + mobile sheet copy ──
    const info = document.getElementById('selectedInfo');
    ['', 'Sheet'].forEach(suffix => {
        const fill    = document.getElementById(`unitBarFill${suffix}`);
        const countEl = document.getElementById(`unitCount${suffix}`);
        const display = document.getElementById(`unitDisplay${suffix}`);
        const maxEl   = document.getElementById(`unitMax${suffix}`);
        if (countEl) countEl.textContent = countText;
        if (maxEl) maxEl.textContent = `${toPersianNum(maxUnits)} واحد`;
        if (fill) {
            fill.style.width = `${pct}%`;
            fill.style.background = fillColor;
        }
        if (display) {
            display.classList.toggle('warning', total > maxUnits * 0.8 && total <= maxUnits);
            display.classList.toggle('danger',  total > maxUnits);
        }
    });
    if (info) {
        info.style.display = state.selected.size > 0 ? 'block' : 'none';
        if (state.selected.size > 0) {
            info.textContent = `${toPersianNum(state.selected.size)} درس — ${toPersianNum(total)} واحد${total > maxUnits ? ' ⚠️' : ''}`;
            info.style.color = total > maxUnits ? 'var(--err-text)' : 'var(--t3)';
        }
    }

    // ── mobile pill + badge + schedule header ──
    const pill    = document.getElementById('mobUnitPill');
    const mNum    = document.getElementById('mobUnitNum');
    const mMax    = document.getElementById('mobUnitMax');
    const badge   = document.getElementById('mobBadge');
    const mobInfo = document.getElementById('mobSelectedInfo');
    if (mNum)  mNum.textContent = countText;
    if (mMax)  mMax.textContent = `/ ${toPersianNum(maxUnits)} واحد`;
    if (pill)  pill.classList.toggle('over', total > maxUnits);
    if (badge) {
        const n = state.selected.size;
        badge.textContent = toPersianNum(n);
        badge.style.display = n > 0 ? 'block' : 'none';
    }
    if (mobInfo) {
        mobInfo.textContent = state.selected.size > 0
            ? `${toPersianNum(state.selected.size)} درس · ${toPersianNum(total)} واحد`
            : '';
    }
    renderPlanWorkspace();
}

function renderPlanWorkspace() {
    const health = planner.derivePlanHealth(state.selected, courses, getMaxUnits());
    const pill = document.getElementById('healthPill');
    const queue = document.getElementById('attentionQueue');
    if (health.ready) {
        pill.className = 'health-pill ready';
        pill.textContent = state.selected.size ? 'آماده' : 'هنوز درسی انتخاب نشده';
    } else {
        pill.className = `health-pill ${health.issues.some(issue => issue.type === 'units') ? 'danger' : 'warning'}`;
        pill.textContent = health.issues.some(issue => issue.type === 'units')
            ? 'بیش از سقف واحد' : `${toPersianNum(health.issues.length)} مورد نیازمند بررسی`;
    }
    queue.innerHTML = health.issues.map((issue, index) => {
        if (issue.type === 'units') return `<button type="button" class="attention-item" data-issue-index="${index}">بیش از سقف واحد: ${toPersianNum(issue.units)} از ${toPersianNum(issue.maxUnits)} واحد — مشاهده درس‌ها</button>`;
        const label = issue.type === 'class' ? 'تداخل کلاس' : 'تداخل امتحان';
        return `<button type="button" class="attention-item" data-issue-index="${index}">${label}: ${issue.courses.map(course => `«${SafeDOM.escape(course.name)}»`).join(' و ')} — بررسی و اصلاح</button>`;
    }).join('');
    queue.querySelectorAll('[data-issue-index]').forEach(button => {
        button.addEventListener('click', () => focusPlanIssue(health.issues[Number(button.dataset.issueIndex)]));
    });
    const selected = [...state.selected].map(id => planner.findCourse(courses, id)).filter(Boolean);
    document.getElementById('listView').innerHTML = `<h2 class="sr-only" id="planListFocus" tabindex="-1">فهرست درس‌های انتخاب‌شده</h2>${selected.length ? selected.map(course => {
        const sessions = CourseDomain.parseSchedule(course.time_html);
        return `<article class="plan-list-item" data-course-id="${SafeDOM.escape(course.id)}" tabindex="-1"><h3>${SafeDOM.escape(course.name)} · گروه <bdi dir="ltr">${SafeDOM.escape(planner.getSectionId(course))}</bdi></h3><button class="remove-section" onclick="removeCourse('${SafeDOM.escape(course.id)}')" aria-label="حذف ${SafeDOM.escape(course.name)}">×</button><p>${SafeDOM.escape(course.prof || 'استاد اعلام نشده')} · ${sessions.length ? sessions.map(formatSessionChip).join('، ') : 'زمان اعلام نشده'}</p></article>`;
    }).join('') : '<div class="empty-state"><div class="empty-state-title">برنامه‌ات خالی است</div></div>'}`;
    document.getElementById('examsView').innerHTML = `<h2 class="sr-only" id="examListFocus" tabindex="-1">فهرست امتحان‌های انتخاب‌شده</h2>${selected.length ? selected
        .map(course => ({ course, exam: CourseDomain.parseExam(course.exam_text) }))
        .sort((a, b) => (a.exam?.date || '9999').localeCompare(b.exam?.date || '9999'))
        .map(({ course, exam }) => `<article class="plan-list-item" data-course-id="${SafeDOM.escape(course.id)}" tabindex="-1"><h3>${SafeDOM.escape(course.name)}</h3><p>${exam ? `${toPersianNum(exam.date)} · ${formatExamTime(exam)}` : 'تاریخ اعلام نشده'}</p></article>`).join('')
        : '<div class="empty-state"><div class="empty-state-title">امتحانی برای نمایش نیست</div></div>'}`;
    const scheduleButton = document.getElementById('mnSchedule');
    scheduleButton?.classList.toggle('has-issues', !health.ready);
    scheduleButton?.setAttribute('aria-label', `برنامه، ${health.ready ? 'آماده' : `${health.issues.length} مورد نیازمند بررسی`}`);
}

function focusPlanIssue(issue) {
    setMobView('schedule');
    const view = issue.type === 'exam' ? 'exams' : 'list';
    setPlanView(view);
    if (issue.type === 'units') {
        document.getElementById('planListFocus')?.focus();
        return;
    }
    const id = issue.courses[0]?.id;
    const container = view === 'exams' ? 'examsView' : 'listView';
    const target = id && document.querySelector(`#${container} [data-course-id="${CSS.escape(id)}"]`);
    target?.focus();
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function setPlanView(view) {
    state.planView = view;
    const activeTab = document.querySelector(`[data-plan-view="${view}"]`);
    selectTab(activeTab);
    document.getElementById('weeklyView').hidden = view !== 'weekly';
    document.getElementById('listView').hidden = view !== 'list';
    document.getElementById('examsView').hidden = view !== 'exams';
}

function openReviewModal() {
    const health = planner.derivePlanHealth(state.selected, courses, getMaxUnits());
    const selected = [...state.selected].map(id => planner.findCourse(courses, id)).filter(Boolean);
    document.getElementById('reviewContent').innerHTML = `<div class="review-summary ${health.ready ? 'ready' : 'warning'}">${health.ready ? 'برنامه آماده است' : `${toPersianNum(health.issues.length)} مورد هنوز نیازمند بررسی است`} · ${toPersianNum(health.count)} درس · ${toPersianNum(health.units)} از ${toPersianNum(health.maxUnits)} واحد</div>
      ${health.issues.length ? `<section class="review-issues" aria-labelledby="reviewIssuesTitle"><h3 id="reviewIssuesTitle">موارد نیازمند اصلاح</h3>${health.issues.map((issue, index) => `<button type="button" class="attention-item" data-review-issue="${index}">${issue.type === 'units' ? `بیش از سقف واحد: ${toPersianNum(issue.units)} از ${toPersianNum(issue.maxUnits)}` : `${issue.type === 'class' ? 'تداخل کلاس' : 'تداخل امتحان'}: ${issue.courses.map(course => `«${SafeDOM.escape(course.name)}»`).join(' و ')}`} — رفتن به اصلاح</button>`).join('')}</section>` : ''}
      <div class="review-table-wrap"><table class="review-table"><thead><tr><th>درس</th><th>گروه / کد</th><th>استاد</th><th>زمان</th><th>امتحان</th></tr></thead><tbody>${selected.map(course => {
        const sessions = CourseDomain.parseSchedule(course.time_html);
        const exam = CourseDomain.parseExam(course.exam_text);
        return `<tr><td>${SafeDOM.escape(course.name)}</td><td><bdi dir="ltr">${SafeDOM.escape(course.id)}</bdi></td><td>${SafeDOM.escape(course.prof || 'اعلام نشده')}</td><td>${sessions.length ? sessions.map(formatSessionChip).join('، ') : 'اعلام نشده'}</td><td>${exam ? toPersianNum(exam.date) : 'اعلام نشده'}</td></tr>`;
      }).join('')}</tbody></table></div><p class="review-note">ثبت نهایی در سامانه گلستان انجام می‌شود.</p>`;
    document.querySelectorAll('[data-review-issue]').forEach(button => {
        button.addEventListener('click', () => {
            closeDialog(document.getElementById('reviewModal'));
            focusPlanIssue(health.issues[Number(button.dataset.reviewIssue)]);
        });
    });
    openDialog(document.getElementById('reviewModal'));
}

async function copySectionCodes() {
    const text = [...state.selected].join('\n');
    try { await navigator.clipboard.writeText(text); Toast.success('کد گروه‌ها کپی شد'); }
    catch { Toast.error('کپی خودکار ممکن نبود؛ دوباره تلاش کن.'); }
}

function exportPlan() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, selectedIds: [...state.selected] }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = 'entekhab-vahed-plan.json'; link.click(); URL.revokeObjectURL(link.href);
}

function openCalendarExport() {
    if (!state.selected.size) {
        Toast.info('ابتدا حداقل یک درس به برنامه اضافه کنید.');
        return;
    }
    const modal = document.getElementById('calendarModal');
    document.getElementById('calendarStart').value =
        stateRepository.getPreference('calendarStart') || '';
    document.getElementById('calendarEnd').value =
        stateRepository.getPreference('calendarEnd') || '';
    modal.classList.add('open');
    document.getElementById('calendarStart').focus();
}

function exportCalendar() {
    const startDate = document.getElementById('calendarStart').value;
    const endDate = document.getElementById('calendarEnd').value;
    const selectedCourses = [...state.selected]
        .map(id => planner.findCourse(courses, id))
        .filter(Boolean);
    let calendar;
    try {
        calendar = CalendarExport.buildCalendarIcs({
            courses: selectedCourses,
            startDate,
            endDate,
            timeZone: 'Asia/Tehran',
            calendarName: 'برنامه دانشگاه',
            reminderMinutes: document.getElementById('calendarReminder').checked ? 15 : 0,
        });
    } catch {
        Toast.info('تاریخ شروع و پایان ترم را درست وارد کنید.');
        return;
    }
    if (!calendar.eventCount) {
        Toast.info('برای درس‌های انتخاب‌شده زمان کلاس معتبری ثبت نشده است.');
        return;
    }
    stateRepository.setPreference('calendarStart', startDate);
    stateRepository.setPreference('calendarEnd', endDate);
    const blob = new Blob([calendar.content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'barname-daneshgah.ics';
    link.click();
    URL.revokeObjectURL(link.href);
    window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank', 'noopener');
    closeDialog(document.getElementById('calendarModal'));
    Toast.info(`${toPersianNum(calendar.eventCount)} جلسه برای ورود به تقویم آماده شد.`);
}

let printPreviousView = null;

function printSchedule() {
    printPreviousView = state.planView;
    const total = getSelectedUnits();
    document.getElementById('printSummary').textContent = state.selected.size
        ? `${toPersianNum(state.selected.size)} درس · ${toPersianNum(total)} واحد`
        : 'بدون درس انتخاب‌شده';
    document.getElementById('printDate').textContent =
        `تاریخ تهیه: ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date())}`;
    renderPrintTimetable();
    setPlanView('weekly');
    requestAnimationFrame(() => window.print());
}

function renderPrintTimetable() {
    const target = document.getElementById('printTimetable');
    const selectedCourses = [...state.selected]
        .map(id => planner.findCourse(courses, id))
        .filter(Boolean);
    const entries = selectedCourses.flatMap(course =>
        CourseDomain.parseSchedule(course.time_html).map(session => ({ course, session })));
    const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
    target.innerHTML = '<div class="print-day-header print-time-corner">ساعت</div>';
    days.forEach((day, index) => {
        target.insertAdjacentHTML('beforeend',
            `<div class="print-day-header" style="grid-column:${index + 2}">${day}</div>`);
    });
    if (!entries.length) {
        target.style.gridTemplateRows = '9mm repeat(8, 8mm)';
        target.insertAdjacentHTML('beforeend', '<div class="print-empty">هنوز کلاسی به برنامه اضافه نشده است.</div>');
        return;
    }

    const earliest = Math.min(...entries.map(entry => entry.session.startMinutes));
    const latest = Math.max(...entries.map(entry => entry.session.endMinutes));
    const start = Math.max(0, Math.floor((earliest - 30) / 30) * 30);
    const end = Math.min(24 * 60, Math.ceil((latest + 30) / 30) * 30);
    const slotCount = Math.max(1, (end - start) / 30);
    target.style.gridTemplateRows = `9mm repeat(${slotCount}, minmax(5.4mm, 1fr))`;

    for (let slot = 0; slot < slotCount; slot += 1) {
        const minutes = start + slot * 30;
        const row = slot + 2;
        target.insertAdjacentHTML('beforeend',
            `<div class="print-time-label" style="grid-row:${row}">${formatMinutes(minutes)}</div>`);
        days.forEach((_, day) => {
            target.insertAdjacentHTML('beforeend',
                `<div class="print-grid-cell" style="grid-column:${day + 2};grid-row:${row}"></div>`);
        });
    }

    entries.forEach(({ course, session }) => {
        const rowStart = 2 + Math.floor((session.startMinutes - start) / 30);
        const rowSpan = Math.max(1, Math.ceil((session.endMinutes - session.startMinutes) / 30));
        const clashes = entries.some(other =>
            other.course.id !== course.id &&
            CourseDomain.sessionsOverlap([session], [other.session]));
        const block = document.createElement('article');
        block.className = `print-class${clashes ? ' print-class-conflict' : ''}`;
        block.style.gridColumn = String(session.day + 2);
        block.style.gridRow = `${rowStart} / span ${rowSpan}`;
        block.style.setProperty('--course-color', getFacultyColor(course.faculty));
        block.innerHTML = `
            <div class="print-class-name">${SafeDOM.escape(course.name)}</div>
            <div class="print-class-prof">${SafeDOM.escape(course.prof || 'استاد اعلام نشده')}</div>
            <div class="print-class-time">${formatMinutes(session.startMinutes)}–${formatMinutes(session.endMinutes)}</div>
            ${session.location ? `<div class="print-class-location">${SafeDOM.escape(session.location)}</div>` : ''}
        `;
        target.appendChild(block);
    });
}

window.addEventListener('afterprint', () => {
    if (!printPreviousView) return;
    const previous = printPreviousView;
    printPreviousView = null;
    setPlanView(previous);
});

// ═══════════════════════════════════════════════════════════════════════════
// TIMETABLE
// ═══════════════════════════════════════════════════════════════════════════
function buildTimetableGrid() {
    const tbl = document.getElementById('timetable');
    tbl.innerHTML = '';
    const days = ['ساعت', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
    days.forEach(d => {
        const el = document.createElement('div');
        el.className = d === 'ساعت' ? 'timetable-header timetable-corner' : 'timetable-header';
        el.textContent = d;
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
    const tbl = document.getElementById('timetable');

    // Empty state with a call to action instead of a wall of dashed boxes
    if (state.selected.size === 0) {
        tbl.innerHTML = `
            <div class="timetable-empty empty-state">
                <div class="empty-state-icon" aria-hidden="true">📅</div>
                <div class="empty-state-title">برنامه‌ات خالی است</div>
                <div class="empty-state-desc">از جستجوی درس، درس‌های موردنظرت را اضافه کن تا اینجا نمایش داده شوند.</div>
                <button type="button" class="btn btn-primary show-mobile" onclick="setMobView('search')">رفتن به جستجو</button>
            </div>`;
        document.getElementById('scheduleWarning').hidden = true;
        updateFacultyLegend({});
        return;
    }
    // Rebuild the grid if the empty state replaced it
    if (!tbl.querySelector('.slot')) buildTimetableGrid();

    document.querySelectorAll('.slot').forEach(el => el.innerHTML = '');
    const slotMap = planner.buildTimetable(courses, state.selected);

    const unplaced = [];
    Object.entries(slotMap).forEach(([key, blocks]) => {
        const el = document.getElementById(`slot-${key}`);
        if (!el) { unplaced.push(...blocks); return; }
        const uniqueIds = new Set(blocks.map(b => b.id));
        const hasConflict = uniqueIds.size > 1;

        blocks.forEach(b => {
            const div = document.createElement('div');
            const justAdded = hasConflict && b.id === lastAddedId;
            div.className = `class-block${hasConflict ? ' conflict' : ''}${justAdded ? ' just-added' : ''}`;
            if (!hasConflict) div.style.setProperty('--fc', getFacultyColor(b.faculty));
            div.title = `${b.name}\n${b.prof}${b.location ? '\n📍 ' + b.location : ''}`;

            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'remove-btn'; rm.textContent = '×';
            rm.setAttribute('aria-label', `حذف ${b.name}`);
            rm.onclick = e => { e.stopPropagation(); toggleCourse(b.id); };
            div.appendChild(rm);

            const content = document.createElement('div');
            content.innerHTML = `
                <div class="class-block-name">${SafeDOM.escape(b.name)} · گروه <bdi dir="ltr">${SafeDOM.escape(b.section)}</bdi>${b.isTA ? ' <small>(ت)</small>' : ''}</div>
                <div class="class-block-time"><bdi dir="ltr">${formatMinutes(b.startMinutes)}–${formatMinutes(b.endMinutes)}</bdi></div>
                <div class="class-block-prof">${SafeDOM.escape(b.prof)}</div>
                ${b.location ? `<div class="class-block-loc">${SafeDOM.escape(b.location)}</div>` : ''}
            `;
            div.appendChild(content);
            el.appendChild(div);
        });
    });
    const warning = document.getElementById('scheduleWarning');
    warning.hidden = unplaced.length === 0;
    if (unplaced.length) warning.textContent = `${toPersianNum(unplaced.length)} جلسه خارج از بازهٔ جدول است؛ مشاهده فهرست کامل`;

    lastAddedId = null;   // the one-shot conflict animation runs only once
    updateFacultyLegend(slotMap);
}

function formatMinutes(minutes) {
    if (!Number.isFinite(minutes)) return '—';
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
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
            ${SafeDOM.escape(f)}
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

function getCourseStatus(id, data) {
    return planner.getCurriculumStatus(id, data, {
        selectedIds: state.selected,
        passedIds: state.curriculum.passed,
        failedIds: state.curriculum.failed,
        cohort: state.cohort,
    });
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
    stateRepository.setPreference('cohort', state.cohort);
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
            <div class="empty-state-desc">نقشه درسی «${SafeDOM.escape(grp)}» موجود نیست. آن را با ابزار محلی ویرایش داده اضافه کنید.</div>
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
            stateRepository.setPreference('cohort', state.cohort);
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
    // Status is conveyed by glyph + text, never color alone
    const statusGlyph = { passed: '✓', failed: '✗', taking: '↻', available: '+', locked: '🔒' };

    let html = `<p class="cur-legend">یک‌بار کلیک: پاس ✓ · دوباره: افتاده ✗ · بار سوم: حذف علامت</p>`;
    const curriculumActions = [];
    const recommendationActions = [];
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

            // درس‌های قفل: کلیک → مسیریاب AI | بقیه: toggle وضعیت
            const actionIndex = curriculumActions.push(() => {
                if (st === 'locked') showPathPlan(c.id);
                else toggleCurriculumCourse(c.id);
            }) - 1;

            html += `
                <div class="cur-card ${st}" data-curriculum-action="${actionIndex}" role="button" tabindex="0"
                     title="${SafeDOM.escape(statusTooltip[st] || '')}"
                     aria-label="${SafeDOM.escape(`«${c.name}»، ${statusTooltip[st] || ''}`)}">
                    <div class="cur-card-name">${SafeDOM.escape(c.name)}</div>
                    <div class="cur-card-footer">
                        <span class="cur-card-units">${toPersianNum(c.units)} واحد</span>
                        <div style="display:flex;align-items:center;gap:4px;">
                            ${offeredDot}
                            ${st === 'locked' ? '<span style="font-size:var(--fs-2xs)" title="کلیک برای مسیریاب" aria-hidden="true">🗺️</span>' : ''}
                            <span class="cur-status-glyph" aria-hidden="true">${statusGlyph[st] || ''}</span>
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
            const actionIndex = recommendationActions.push(() => jumpToSearch(c.id)) - 1;
            html += `<div class="rec-item" data-recommendation-action="${actionIndex}" role="button" tabindex="0">
                <span>${SafeDOM.escape(c.name)}</span>
                <span class="badge badge-unit">${toPersianNum(c.units)}و</span>
            </div>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;
    container.querySelectorAll('[data-curriculum-action]').forEach(element => {
        const action = curriculumActions[Number(element.dataset.curriculumAction)];
        if (action) bindActivation(element, action);
    });
    container.querySelectorAll('[data-recommendation-action]').forEach(element => {
        const action = recommendationActions[Number(element.dataset.recommendationAction)];
        if (action) bindActivation(element, action);
    });
}

function bindActivation(element, action) {
    element.addEventListener('click', action);
    element.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    });
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
    syncThemeButton(Theme.toggle());
}

function syncThemeButton(theme) {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    const icon = document.getElementById('themeBtnIcon');
    if (icon) icon.textContent = theme === 'light' ? '🌙' : '🌗';
    btn.setAttribute('aria-label', theme === 'light' ? 'تغییر به تم تیره' : 'تغییر به تم روشن');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMS
// ═══════════════════════════════════════════════════════════════════════════
function openExamModal() {
    const body = document.getElementById('examBody');
    body.innerHTML = '';

    const list = [...state.selected]
        .map(id => courses.find(c => c.id === id)).filter(Boolean)
        .map(course => ({ course, exam: CourseDomain.parseExam(course.exam_text) }))
        .sort((a, b) => {
            if (!a.exam) return 1; if (!b.exam) return -1;
            return a.exam.date.localeCompare(b.exam.date)
                || (a.exam.startMinutes ?? 0) - (b.exam.startMinutes ?? 0);
        });

    if (!list.length) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:24px">هیچ درسی انتخاب نشده</td></tr>`;
    } else {
        list.forEach(entry => {
            const { course, exam } = entry;
            const overlaps = exam && list.some(other =>
                other !== entry && CourseDomain.examsOverlap(exam, other.exam));
            const sameDay = exam && !overlaps
                && list.some(other => other !== entry && other.exam?.date === exam.date);
            const tr = document.createElement('tr');
            if (overlaps) { tr.className = 'row-danger'; tr.title = 'تداخل زمانی امتحان'; }
            else if (sameDay) { tr.className = 'row-warning'; tr.title = 'دو امتحان در یک روز'; }

            // Status glyph column: flagged rows are not color-only
            const statusTd = document.createElement('td');
            if (overlaps || sameDay) {
                const glyph = document.createElement('span');
                glyph.className = 'row-status-glyph';
                glyph.setAttribute('role', 'img');
                glyph.setAttribute('aria-label', overlaps ? 'تداخل زمانی امتحان' : 'دو امتحان در یک روز');
                glyph.textContent = overlaps ? '⛔' : '⚠';
                statusTd.appendChild(glyph);
            }
            tr.appendChild(statusTd);

            [course.name, exam ? toPersianNum(exam.date) : '—', formatExamTime(exam)].forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }
    openDialog(document.getElementById('examModal'));
}

function closeExamModal() { closeDialog(document.getElementById('examModal')); }

function formatExamTime(exam) {
    if (!exam || !Number.isFinite(exam.startMinutes) || !Number.isFinite(exam.endMinutes)) return '—';
    const fmt = mins => toPersianNum(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
    return `${fmt(exam.startMinutes)} - ${fmt(exam.endMinutes)}`;
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
                Toast.info(`${toPersianNum(data.courses?.length || 0)} درس استخراج‌شده. فایل generated/course-offerings.generated.js را بازتولید کنید.`, 6000);
            } else {
                Toast.error('فرمت فایل شناخته نشد.');
            }
        } catch (err) { Toast.error('خطا در خواندن فایل: ' + err.message); }
        input.value = '';
    };
    reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// AI FEATURES INIT
// ═══════════════════════════════════════════════════════════════════════════
function initAIFeatures() {
    // FAB dot: نشان می‌دهد AI فعال است
    const dot = document.getElementById('aiFabDot');
    if (dot && typeof AI !== 'undefined' && AI.isConfigured()) dot.style.display = 'block';

    // Quick prompts
    const qEl = document.getElementById('aiQuickPrompts');
    if (qEl && typeof Advisor !== 'undefined') {
        Advisor.QUICK_PROMPTS.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'ai-quick-btn';
            btn.textContent = p;
            btn.onclick = () => aiQuickPrompt(p);
            qEl.appendChild(btn);
        });
    }
}

function configureAIContext() {
    if (typeof AI === 'undefined') return;
    // Dependency inversion: the API client receives context from the planner
    // instead of reaching into DOM elements and global application state.
    AI.setContextProvider(() => planner.buildStudentContext({
        faculty: document.getElementById('facultyFilter')?.value,
        group: document.getElementById('groupFilter')?.value,
        cohort: state.cohort,
        curriculum: getCurrentCurriculum(),
        passedIds: state.curriculum.passed,
        failedIds: state.curriculum.failed,
        selectedIds: state.selected,
        courses,
    }));
}

// ─── Load Modal helpers ──────────────────────────────────────────────────
function closeLoadModal() { closeDialog(document.getElementById('loadModal')); }
function closePathModal()  { closeDialog(document.getElementById('pathModal')); }

// ─── Mobile units/GPA sheet ──────────────────────────────────────────────
function openUnitSheet() {
    restoreGpaInput();
    openDialog(document.getElementById('unitSheet'));
}
function closeUnitSheet() { closeDialog(document.getElementById('unitSheet')); }

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE NAV
// ═══════════════════════════════════════════════════════════════════════════
const isSingleWorkspace = () => window.innerWidth <= 1100;

function setMobView(view) {
    if (!isSingleWorkspace()) return;
    document.body.setAttribute('data-mob', view);

    // sync desktop sidebar tabs
    if (view === 'search')     switchTab('search');
    if (view === 'curriculum') switchTab('curriculum');

    // update bottom‑nav active state
    ['Search', 'Schedule', 'Curriculum'].forEach(v => {
        const button = document.getElementById('mn' + v);
        const selected = v.toLowerCase() === view;
        button?.classList.toggle('active', selected);
        if (selected) selectTab(button);
        const wrap = button?.querySelector('.mob-nav-icon-wrap');
        if (wrap) wrap.style.background = selected ? 'var(--blue-dim)' : '';
    });
}

// initialise mobile state
function initMobile() {
    if (isSingleWorkspace()) {
        document.body.setAttribute('data-mob', 'search');
        // patch switchTab so it also updates mob view from desktop tabs
        const origSwitch = switchTab;
        window.switchTab = (tab) => {
            origSwitch(tab);
            if (isSingleWorkspace()) {
                if (tab === 'search')     setMobView('search');
                if (tab === 'curriculum') setMobView('curriculum');
            }
        };
    }
    // keep data‑mob in sync on resize
    window.addEventListener('resize', () => {
        if (!isSingleWorkspace()) document.body.removeAttribute('data-mob');
        else if (!document.body.getAttribute('data-mob')) setMobView('search');
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD ANALYZER
// ═══════════════════════════════════════════════════════════════════════════
const _analyzeLoadDebounced = debounce(runLoadAnalysis, 3000);

function scheduleLoadAnalysis() {
    if (typeof AI === 'undefined' || !AI.isInteractiveEnabled()) return;
    if (state.selected.size < 2) { clearLoadBadge(); return; }
    _analyzeLoadDebounced();
}

function clearLoadBadge() {
    const badge = document.getElementById('loadBadge');
    if (badge) badge.style.display = 'none';
}

async function runLoadAnalysis() {
    if (typeof AI === 'undefined' || !AI.isInteractiveEnabled()) return;
    if (state.selected.size < 2) { clearLoadBadge(); return; }

    const selCourses = [...state.selected].map(id => {
        const c = courses.find(x => x.id === id);
        return c ? { name: c.name, units: c.units, exam: c.exam_text ? 'دارد' : 'ندارد' } : null;
    }).filter(Boolean);

    const units = getSelectedUnits();

    try {
        const result = await AI.complete([{
            role: 'user',
            content: `این برنامه درسی دانشجو را ارزیابی کن و JSON برگردان:
درس‌ها: ${JSON.stringify(selCourses)}
کل واحد: ${units}

خروجی دقیقاً به این شکل:
{"status":"ok","fa":"متن کوتاه فارسی حداکثر ۳۰ کلمه"}
status باید یکی از: ok، warning، danger باشد.
ok: برنامه مناسب
warning: یک نکته مهم دارد
danger: مشکل جدی دارد (امتحانات متوالی، واحد زیاد، درس‌های سنگین)`,
        }], { jsonMode: true });

        showLoadBadge(result);
    } catch (e) { /* بی‌صدا شکست بخورد */ }
}

function showLoadBadge(result) {
    let badge = document.getElementById('loadBadge');
    if (!badge) return;

    const status = result?.status || 'ok';
    const text   = result?.fa     || '';
    const icons  = { ok: '🟢', warning: '🟡', danger: '🔴' };

    badge.className = `load-badge ${status}`;
    badge.textContent = `${icons[status]} ${text}`;
    badge.style.display = 'inline-flex';
    badge.title = 'کلیک برای جزئیات';
    badge.setAttribute('role', 'button');
    badge.tabIndex = 0;
    badge.onclick = () => {
        document.getElementById('loadModalTitle').textContent =
            status === 'danger' ? '🔴 هشدار بار درسی' :
            status === 'warning' ? '🟡 نکته مهم' : '🟢 برنامه متعادل';
        document.getElementById('loadModalText').textContent = text;
        openDialog(document.getElementById('loadModal'));
    };
    badge.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            badge.click();
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREREQUISITE PATH PLANNER
// ═══════════════════════════════════════════════════════════════════════════
async function showPathPlan(courseId) {
    if (typeof AI === 'undefined' || !AI.isInteractiveEnabled()) {
        Toast.info('برای مشاهده پیش‌نیازها، نقشه درسی را ببینید.');
        return;
    }

    const data = getCurrentCurriculum();
    if (!data) return;
    const target = data.courses.find(c => c.id === courseId);
    if (!target) return;

    // باز کردن modal با loading
    const modal = document.getElementById('pathModal');
    document.getElementById('pathModalTitle').textContent = `🗺️ مسیر رسیدن به «${target.name}»`;
    document.getElementById('pathModalContent').innerHTML =
        '<div class="empty-state" style="padding:30px 0"><div class="empty-state-desc">در حال محاسبه مسیر...</div></div>';
    openDialog(modal);

    // ساخت گراف پیش‌نیاز
    function buildPrereqChain(id, visited = new Set()) {
        if (visited.has(id)) return [];
        visited.add(id);
        const course = data.courses.find(c => c.id === id);
        if (!course) return [];
        const chain = [];
        for (const preId of (course.prereqs || [])) {
            chain.push(...buildPrereqChain(preId, visited));
        }
        chain.push(course);
        return chain;
    }

    const chain = buildPrereqChain(courseId);
    const passedNames = [...state.curriculum.passed]
        .map(id => data.courses.find(c => c.id === id)?.name).filter(Boolean);

    try {
        const response = await AI.complete([{
            role: 'user',
            content: `دانشجو می‌خواهد درس «${target.name}» را بگذراند.
درس‌های پاس‌شده: ${passedNames.join('، ') || 'هیچ'}
زنجیره پیش‌نیاز تا این درس: ${chain.map(c => `${c.name} (ترم ${c.semester})`).join(' → ')}

یک برنامه ترم‌بندی کوتاه و واقعی به فارسی بنویس که نشان دهد از وضعیت فعلی تا رسیدن به «${target.name}» چند ترم طول می‌کشد و چه درس‌هایی باید بگذرد.
حداکثر ۱۰۰ کلمه، ساده و مستقیم.`,
        }]);

        document.getElementById('pathModalContent').innerHTML =
            `<p class="path-modal-body">${SafeDOM.formatPlainMarkdown(response)}</p>`;
    } catch (e) {
        document.getElementById('pathModalContent').innerHTML =
            `<p style="color:var(--err-text)">خطا: ${SafeDOM.escape(e.message)}</p>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════
init();
enhanceTablists();
configureAIContext();
initMobile();
initAIFeatures();
