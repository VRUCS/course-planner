/* global require, window */
const { test, expect } = require('@playwright/test');

async function openPlanner(page) {
    await page.addInitScript(() => window.localStorage.setItem('uni_planner_help_guide_v1', 'done'));
    await page.goto('/index.html');
    await expect(page.locator('#courseCount')).not.toHaveText('...');
}

async function addFirstSingleSectionCourse(page) {
    const card = page.locator('.single-course-summary').first();
    await expect(card).toBeVisible();
    const name = (await card.locator('.course-group-title').textContent()).trim();
    await card.getByRole('button', { name: 'افزودن به برنامه' }).click();
    await expect(page.locator('#unitCountPlan')).not.toHaveText('۰');
    return name;
}

test('renders the RTL planner and its initial empty schedule', async ({ page }) => {
    await openPlanner(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'برنامه این ترم' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: /جستجو در نام درس/ })).toBeVisible();
    await expect(page.locator('#courseList .course-group').first()).toBeVisible();
    await expect(page.locator('#timetable').getByText('برنامه‌ات هنوز خالی است')).toBeVisible();
});

test('empty schedule makes the next planning step explicit', async ({ page }) => {
    await openPlanner(page);

    const emptyState = page.locator('.empty-state-card');
    await expect(emptyState).toBeVisible();
    await emptyState.getByRole('button', { name: 'رفتن به جستجوی درس' }).click();
    await expect(page.locator('#searchInput')).toBeFocused();
});

test('search narrows courses and advanced filters collapse cleanly', async ({ page }) => {
    await openPlanner(page);

    const firstTitle = (await page.locator('.course-group-title').first().textContent()).trim();
    const query = firstTitle.slice(0, Math.min(5, firstTitle.length));
    const search = page.getByRole('searchbox', { name: /جستجو در نام درس/ });
    await search.fill(query);
    await expect(page.locator('.course-group-title').first()).toContainText(query);

    const toggle = page.getByRole('button', { name: 'فیلترها' });
    const filters = page.locator('#advancedFilters');
    await expect(filters).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(filters).toBeVisible();
    await toggle.click();
    await expect(filters).toBeHidden();
});

test('selecting a single-section course updates the timetable', async ({ page }) => {
    await openPlanner(page);
    const card = page.locator('.single-course-summary').first();
    await expect(card.locator('.single-course-facts')).toContainText('امتحان');
    await expect(card.locator('.single-course-facts')).toContainText('ظرفیت');
    const courseName = await addFirstSingleSectionCourse(page);

    await expect(page.locator('#selectedStat')).toContainText('انتخاب‌شده');
    await expect(page.locator('#timetable .class-block', { hasText: courseName }).first()).toBeVisible();
    await expect(page.locator('#timetable').getByText('برنامه‌ات خالی است')).toBeHidden();
});

test('selected courses persist after a reload', async ({ page }) => {
    await openPlanner(page);
    const courseName = await addFirstSingleSectionCourse(page);

    await page.reload();
    await expect(page.locator('#courseCount')).not.toHaveText('...');
    await expect(page.locator('#timetable .class-block', { hasText: courseName }).first()).toBeVisible();
    await expect(page.locator('#unitCountPlan')).not.toHaveText('۰');
});

test('academic profile and search filters remain independent', async ({ page }) => {
    await openPlanner(page);

    await page.getByRole('button', { name: /پروفایل/ }).click();
    const dialog = page.getByRole('dialog', { name: 'پروفایل تحصیلی' });
    await dialog.locator('#profileFaculty').selectOption({ label: 'علوم ریاضی و کامپیوتر' });
    await dialog.locator('#profileGroup').selectOption({ label: 'علوم کامپیوتر' });
    await dialog.locator('#profileCohort').selectOption({ label: '۱۴۰۰' });
    await dialog.locator('#profileGpa').fill('17.25');
    await dialog.getByRole('button', { name: 'ذخیره و نمایش درس‌های مرتبط' }).click();

    await expect(page.locator('#facultyFilter')).toHaveValue('');
    await expect(page.locator('#groupFilter')).toHaveValue('');
    await expect(page.locator('#unitMaxPlan')).toHaveText('۲۴ واحد');
    await expect(page.locator('#courseList .course-group').first()).toBeVisible();

    await page.locator('#facultyFilter').selectOption({ label: 'فنی و مهندسی' });
    await expect(page.locator('#facultyFilter')).toHaveValue('فنی و مهندسی');
    await page.getByRole('button', { name: /پروفایل/ }).click();
    await expect(page.getByRole('dialog', { name: 'پروفایل تحصیلی' }).locator('#profileFaculty'))
        .toHaveValue('علوم ریاضی و کامپیوتر');

    await page.reload();
    await expect(page.locator('#courseCount')).not.toHaveText('...');
    await expect(page.locator('#facultyFilter')).toHaveValue('فنی و مهندسی');
    await page.getByRole('button', { name: /پروفایل/ }).click();
    const profileDialog = page.getByRole('dialog', { name: 'پروفایل تحصیلی' });
    await expect(profileDialog.locator('#profileFaculty')).toHaveValue('علوم ریاضی و کامپیوتر');
    await expect(profileDialog.locator('#profileGroup')).toHaveValue('علوم کامپیوتر');
    await expect(profileDialog.locator('#profileGpa')).toHaveValue('17.25');
});

test('curriculum follows the academic profile after search filters change', async ({ page }) => {
    await openPlanner(page);

    await page.getByRole('button', { name: /پروفایل/ }).click();
    const profile = page.getByRole('dialog', { name: 'پروفایل تحصیلی' });
    await profile.locator('#profileFaculty').selectOption({ label: 'علوم ریاضی و کامپیوتر' });
    await profile.locator('#profileGroup').selectOption({ label: 'علوم کامپیوتر' });
    await profile.getByRole('button', { name: 'ذخیره و نمایش درس‌های مرتبط' }).click();

    await page.locator('#facultyFilter').selectOption({ label: 'فنی و مهندسی' });
    const searchGroup = page.locator('#groupFilter');
    if (await searchGroup.locator('option').count() > 1) {
        await searchGroup.selectOption({ index: 1 });
    }

    await page.getByRole('tab', { name: 'نقشه درسی' }).click();
    await expect(page.locator('#curriculumControls')).toBeVisible();
    await expect(page.locator('#curriculumScroll .sem-block').first()).toBeVisible();
    await expect(page.locator('#curriculumScroll')).toContainText('ریاضی عمومی ۱');
    await expect(page.locator('#curriculumScroll')).not.toContainText('برای نمایش نقشه درسی');
});

test('opens and closes the About dialog from the top bar', async ({ page }) => {
    await openPlanner(page);

    await page.getByRole('button', { name: /درباره/ }).click();
    const dialog = page.getByRole('dialog', { name: /درباره/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/GPL|متن‌باز|اوپن.?سورس/i);
    await dialog.getByRole('button', { name: 'بستن' }).click();
    await expect(dialog).toBeHidden();
});

test('first visit guide spotlights the main workflow and can be reopened', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#courseCount')).not.toHaveText('...');

    const guide = page.locator('#helpGuidePopover');
    await expect(guide).toBeVisible();
    await expect(guide).toContainText('به انتخاب واحد یار خوش آمدی');
    await guide.getByRole('button', { name: 'شروع راهنما' }).click();
    await expect(guide).toContainText('درس موردنظرت را پیدا کن');
    await expect(page.locator('#helpGuideSpotlight')).toBeVisible();

    await guide.getByRole('button', { name: 'رد کردن' }).click();
    await expect(guide).toBeHidden();
    await page.getByRole('button', { name: 'راهنمای استفاده' }).click();
    await expect(guide).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(guide).toBeHidden();
});

test('calendar export modal accepts a term range without external side effects', async ({ page }) => {
    await openPlanner(page);
    await addFirstSingleSectionCourse(page);

    await page.getByRole('button', { name: 'افزودن برنامه به تقویم' }).click();
    const dialog = page.getByRole('dialog', { name: /Google Calendar/ });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('شروع کلاس‌ها').fill('2026-09-19');
    await dialog.getByLabel('پایان کلاس‌ها').fill('2026-12-31');
    await expect(dialog.getByLabel('شروع کلاس‌ها')).toHaveValue('2026-09-19');
    await expect(dialog.getByLabel('پایان کلاس‌ها')).toHaveValue('2026-12-31');
    await expect(dialog.getByRole('checkbox', { name: /یادآوری/ })).toBeChecked();
    await dialog.getByRole('button', { name: 'انصراف' }).click();
    await expect(dialog).toBeHidden();
});

test('calendar export downloads an ICS file and remembers the term range', async ({ page }) => {
    await openPlanner(page);
    await addFirstSingleSectionCourse(page);
    await page.evaluate(() => { window.open = () => null; });

    await page.getByRole('button', { name: 'افزودن برنامه به تقویم' }).click();
    const dialog = page.getByRole('dialog', { name: /Google Calendar/ });
    await dialog.getByLabel('شروع کلاس‌ها').fill('2026-09-19');
    await dialog.getByLabel('پایان کلاس‌ها').fill('2026-12-31');

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'دانلود و بازکردن Google Calendar' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('barname-daneshgah.ics');
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => ({
        start: window.localStorage.getItem('uni_calendar_start_v1'),
        end: window.localStorage.getItem('uni_calendar_end_v1'),
    }))).toEqual({ start: '2026-09-19', end: '2026-12-31' });
});

test('opening calendar export from review replaces the previous modal', async ({ page }) => {
    await openPlanner(page);
    await addFirstSingleSectionCourse(page);

    const reviewTrigger = page.getByRole('button', { name: 'مرور نهایی' });
    await reviewTrigger.click();
    await expect(page.locator('#reviewModal')).toHaveAttribute('aria-hidden', 'false');

    await page.getByRole('button', { name: 'افزودن به تقویم' }).click();
    await expect(page.locator('#calendarModal')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#reviewModal')).toBeHidden();
    await expect(page.locator('.modal-backdrop.open')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator('#calendarModal')).toBeHidden();
    await expect(reviewTrigger).toBeFocused();
});

test('list and exam views use readable tables', async ({ page }) => {
    await openPlanner(page);
    await addFirstSingleSectionCourse(page);

    await page.locator('#planTabList').click();
    await expect(page.locator('#listView .schedule-table')).toBeVisible();
    await expect(page.locator('#listView')).toContainText('زمان کلاس');
    await expect(page.locator('#listView .plan-table-row')).toHaveCount(1);

    await page.locator('#planTabExams').click();
    await expect(page.locator('#examsView .exams-table')).toBeVisible();
    await expect(page.locator('#examsView')).toContainText('وضعیت');
    await expect(page.locator('#examsView .plan-table-row')).toHaveCount(1);
});

test.describe('responsive navigation', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('mobile bottom navigation switches between search and schedule', async ({ page }) => {
        await openPlanner(page);

        const nav = page.locator('.mob-nav');
        await expect(nav).toBeVisible();
        const header = await page.locator('.app-topbar').boundingBox();
        const actions = await page.locator('.topbar-actions').boundingBox();
        expect(actions.y + actions.height).toBeLessThanOrEqual(header.y + header.height + 1);
        await expect(page.locator('#mnSchedule .mob-nav-icon')).toHaveCount(1);
        await expect(page.locator('#mnSchedule .mob-nav-badge')).toHaveCount(0);
        await nav.getByRole('tab', { name: /برنامه/ }).click();
        await expect(page.locator('body')).toHaveAttribute('data-mob', 'schedule');
        await expect(page.locator('#mainContent')).toBeVisible();
        await expect.poll(async () => {
            const box = await page.locator('#mainContent').boundingBox();
            return Boolean(box && box.x >= -1 && box.x + box.width <= 391);
        }).toBe(true);
        await page.locator('#planTabWeekly').click();
        await expect(page.locator('#weeklyView')).toBeVisible();
        await nav.getByRole('tab', { name: 'جستجوی درس' }).click();
        await expect(page.locator('body')).toHaveAttribute('data-mob', 'search');
        await expect(page.locator('#tabSearch')).toBeVisible();
    });

    test('selected courses expose stable color accents', async ({ page }) => {
        await openPlanner(page);
        await addFirstSingleSectionCourse(page);
        await page.locator('.single-course-summary').nth(1).getByRole('button', { name: 'افزودن به برنامه' }).click();
        await page.locator('#mnSchedule').click();

        const colors = await page.locator('#listView .plan-table-row').evaluateAll(items =>
            items.slice(0, 2).map(item => item.style.getPropertyValue('--course-color')));
        expect(colors).toHaveLength(2);
        expect(colors[0]).not.toBe(colors[1]);
    });

    test('mobile action sheet exposes secondary tools', async ({ page }) => {
        await openPlanner(page);

        await page.locator('#mobMoreBtn').click();
        const actions = page.getByRole('dialog', { name: 'سایر ابزارها' });
        await expect(actions).toBeVisible();
        await expect(actions.getByRole('link', { name: /داشبورد استاد/ })).toHaveAttribute('href', 'professor.html');
        await expect(actions.getByRole('button', { name: /چاپ برنامه/ })).toBeVisible();
        await expect(actions.getByRole('button', { name: /افزودن برنامه به تقویم/ })).toBeVisible();
        await expect(actions.getByRole('button', { name: /برنامه امتحانات/ })).toBeVisible();
        await actions.getByRole('button', { name: /دربارهٔ پروژه/ }).click();
        await expect(page.getByRole('dialog', { name: /درباره/ })).toBeVisible();
    });
});

test('tablet navigation keeps the schedule reachable at 800px', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await openPlanner(page);

    const nav = page.locator('.mob-nav');
    await expect(nav).toBeVisible();
    await nav.getByRole('tab', { name: /برنامه/ }).click();
    await expect(page.locator('body')).toHaveAttribute('data-mob', 'schedule');
    await expect.poll(async () => {
        const box = await page.locator('#mainContent').boundingBox();
        return Boolean(box && box.x >= 0 && box.x + box.width <= 800);
    }).toBe(true);
});

test('professor dashboard keeps its conflict panel inside the viewport at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/professor.html');

    await expect(page.locator('#professorMain')).toBeVisible();
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#professorMain');
    const panel = await page.locator('.professor-conflict-panel').boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(1024);
    const timetable = await page.locator('.professor-timetable-panel .timetable-box').evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
    }));
    expect(timetable.scrollWidth).toBeLessThanOrEqual(timetable.clientWidth + 1);
});

test('print media exposes the ink-saving schedule document', async ({ page }) => {
    await page.addInitScript(() => {
        window.print = () => {};
    });
    await openPlanner(page);
    const courseName = await addFirstSingleSectionCourse(page);
    await page.getByRole('button', { name: 'چاپ برنامه' }).click();
    await page.emulateMedia({ media: 'print' });

    await expect(page.locator('.print-header')).toBeVisible();
    await expect(page.locator('#printTimetable')).toBeVisible();
    await expect(page.locator('#printTimetable .print-class', { hasText: courseName }).first()).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
