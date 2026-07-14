/* global require, module, process */
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
        ? [['line'], ['html', { open: 'never' }]]
        : [['list'], ['html', { open: 'never' }]],
    outputDir: 'test-results',
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        locale: 'fa-IR',
        timezoneId: 'Asia/Tehran',
        storageState: { cookies: [], origins: [] },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory apps/web`,
        url: `http://127.0.0.1:${PORT}/index.html`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
