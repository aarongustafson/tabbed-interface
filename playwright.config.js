import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './test/browser',
	fullyParallel: true,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		headless: true,
	},
	webServer: {
		command: 'node test/browser/server.js',
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
});
