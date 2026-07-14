/* global require, window */
const { test, expect } = require('@playwright/test');

async function openPlanner(page) {
    await page.goto('/index.html');
    await expect(page.locator('#courseCount')).not.toHaveText('...');
}

async function addFirstSingleSectionCourse(page) {
    const card = page.locator('.single-course-summary').first();
    await expect(card).toBeVisible();
    const name = (await card.locator('.course-group-title').textContent()).trim();
    await card.getByRole('button', { name: 'افزودن به برنامه' }).click();
    await expect(page.locator('#unitCount')).not.toHaveText('۰');
    return name;
}

test('renders the RTL planner and its initial empty schedule', async ({ page }) => {
    await openPlanner(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'برنامه این ترم' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: /جستجو در نام درس/ })).toBeVisible();
    await expect(page.locator('#courseList .course-group').first()).toBeVisible();
    await expect(page.locator('#timetable').getByText('برنامه‌ات خالی است')).toBeVisible();
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
    await expect(page.locator('#unitCount')).not.toHaveText('۰');
});

test('academic profile applies relevant courses and persists locally', async ({ page }) => {
    await openPlanner(page);

    await page.getByRole('button', { name: /پروفایل/ }).click();
    const dialog = page.getByRole('dialog', { name: 'پروفایل تحصیلی' });
    await dialog.locator('#profileFaculty').selectOption({ label: 'علوم ریاضی و کامپیوتر' });
    await dialog.locator('#profileGroup').selectOption({ label: 'علوم کامپیوتر' });
    await dialog.locator('#profileCohort').selectOption({ label: '۱۴۰۰' });
    await dialog.locator('#profileGpa').fill('17.25');
    await dialog.getByRole('button', { name: 'ذخیره و نمایش درس‌های مرتبط' }).click();

    await expect(page.locator('#facultyFilter')).toHaveValue('علوم ریاضی و کامپیوتر');
    await expect(page.locator('#groupFilter')).toHaveValue('علوم کامپیوتر');
    await expect(page.locator('#unitMax')).toHaveText('۲۴ واحد');
    await expect(page.locator('#courseList .course-group').first()).toBeVisible();

    await page.reload();
    await expect(page.locator('#courseCount')).not.toHaveText('...');
    await page.getByRole('button', { name: /پروفایل/ }).click();
    await expect(page.getByRole('dialog', { name: 'پروفایل تحصیلی' }).locator('#profileGpa'))
        .toHaveValue('17.25');
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

test.describe('responsive navigation', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('mobile bottom navigation switches between search and schedule', async ({ page }) => {
        await openPlanner(page);

        const nav = page.locator('.mob-nav');
        await expect(nav).toBeVisible();
        await nav.getByRole('tab', { name: /برنامه/ }).click();
        await expect(page.locator('body')).toHaveAttribute('data-mob', 'schedule');
        await expect(page.locator('#mainContent')).toBeVisible();
        await nav.getByRole('tab', { name: 'جستجوی درس' }).click();
        await expect(page.locator('body')).toHaveAttribute('data-mob', 'search');
        await expect(page.locator('#tabSearch')).toBeVisible();
    });
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
