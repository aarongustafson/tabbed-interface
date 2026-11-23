import { expect, test } from '@playwright/test';

test('all primary demo components upgrade successfully', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	await page.waitForFunction(() => {
		const elements = [...document.querySelectorAll('tabbed-interface')];
		return (
			elements.length > 0 &&
			elements.every(
				(element) =>
					element.dataset.layout &&
					element.shadowRoot?.querySelector('[data-tablist]'),
			)
		);
	});

	const demos = await page
		.locator('tabbed-interface')
		.evaluateAll((elements) =>
			elements.map((element) => {
				const headingCount = element.querySelectorAll(
					':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6',
				).length;
				const tablist = element.shadowRoot.querySelector(
					'#presentation > [data-tablist]',
				);
				const tabCount = tablist.querySelectorAll('[data-tab]').length;
				const panelCount =
					element.shadowRoot.querySelectorAll('[data-panel]').length;

				return {
					headingCount,
					layout: element.dataset.layout,
					panelCount,
					tabCount,
				};
			}),
		);

	expect(demos).toHaveLength(12);
	for (const demo of demos) {
		expect(['tabs', 'linear']).toContain(demo.layout);
		expect(demo.panelCount).toBe(demo.headingCount);
		expect(demo.tabCount).toBe(demo.headingCount);
	}
});

for (const path of ['index.html', 'esm.html', 'unpkg.html']) {
	test(`${path} gives each example a unique non-control destination`, async ({
		page,
	}) => {
		await page.goto(`/demo/${path}`);
		const result = await page.evaluate(() => {
			const examples = [...document.querySelectorAll('.code-demo-pair')];
			const ids = [...document.querySelectorAll('[id]')].map(
				(element) => element.id,
			);
			return {
				anchored: examples.every((pair) => {
					const example = pair.closest('.demo-section');
					return (
						example?.id &&
						example.querySelector('h2, h3') &&
						!example.matches('tabbed-interface, input, button')
					);
				}),
				unique: new Set(ids).size === ids.length,
			};
		});
		expect(result).toEqual({ anchored: true, unique: true });
	});
}

test('basic example pairs ordinary section content with its displayed HTML', async ({
	page,
}) => {
	// Inspect authored code before optional highlighting can change its DOM.
	await page.route('**/code-examples.js', (route) => route.abort());
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	const example = page.locator('#basic-use');
	await expect(example.locator('tabbed-interface')).toHaveAttribute(
		'data-layout',
		'tabs',
	);
	const host = example.locator('tabbed-interface');
	await expect(host.locator('micro-lighter, pre, code')).toHaveCount(0);
	const content = await host.evaluate((element) =>
		[...element.children].map((child) => child.textContent.trim()),
	);
	const code = await example.locator('pre code').textContent();
	for (const text of content) {
		expect(code.replace(/\s+/g, ' ')).toContain(text.replace(/\s+/g, ' '));
	}
	expect(await host.locator('h3').count()).toBeGreaterThan(1);
});

test('manual and automatic examples separate focus from selection', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	const manual = page.locator('#basic-use tabbed-interface');
	await expect(manual).toHaveAttribute('data-layout', 'tabs');
	const tabs = manual.getByRole('tab');
	await tabs.nth(0).focus();
	const before = await tabs.nth(1).boundingBox();
	await page.keyboard.press('ArrowRight');
	await expect(tabs.nth(1)).toBeFocused();
	await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
	expect(await tabs.nth(1).boundingBox()).toEqual(before);
	await page.keyboard.press('Space');
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('End');
	await expect(tabs.nth(2)).toBeFocused();
	await page.keyboard.press('Home');
	await expect(tabs.nth(0)).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

	const automatic = page.locator('#activate-on-focus tabbed-interface');
	await expect(automatic).toHaveAttribute('data-layout', 'tabs');
	await automatic.getByRole('tab').nth(0).focus();
	await page.keyboard.press('ArrowRight');
	await expect(automatic.getByRole('tab').nth(1)).toHaveAttribute(
		'aria-selected',
		'true',
	);
});

test('short-label example requests visible headings and keeps full accessible names', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	const host = page.locator('#short-labels tabbed-interface');
	await expect(host).toHaveAttribute('show-headers', '');
	await expect(host).toHaveAttribute('data-layout', 'tabs');
	const headings = await host.locator('h3').allTextContents();
	for (let index = 0; index < headings.length; index += 1) {
		const tab = host.getByRole('tab').nth(index);
		await expect(tab).toHaveAccessibleName(headings[index].trim());
		await tab.click();
		await expect(host.locator('h3').nth(index)).toBeVisible();
	}
});

test('example fragments do not select panels, while existing heading fragments do', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html#hash-end');
	const host = page.locator('#link-to-sections tabbed-interface');
	await expect(host.getByRole('tab').nth(2)).toHaveAttribute(
		'aria-selected',
		'true',
	);
	await page.evaluate(() => {
		location.hash = 'link-to-sections';
	});
	await expect(host.getByRole('tab').nth(2)).toHaveAttribute(
		'aria-selected',
		'true',
	);
	await page.locator('a[href="#hash-middle"]').click();
	await expect(host.getByRole('tab').nth(1)).toHaveAttribute(
		'aria-selected',
		'true',
	);
});

for (const path of ['index.html', 'esm.html', 'unpkg.html']) {
	test(`${path} keeps every authored section useful without JavaScript`, async ({
		browser,
	}) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		try {
			const page = await context.newPage();
			await page.goto(`/demo/${path}`);
			const hosts = page.locator('tabbed-interface');
			expect(await hosts.count()).toBeGreaterThan(0);
			for (const host of await hosts.all()) {
				for (const content of await host
					.locator(':scope > h2, :scope > h3, :scope > p')
					.all()) {
					await expect(content).toBeVisible();
				}
			}
			if (path === 'index.html') {
				await expect(page.locator('#selection-controls')).toBeHidden();
			}
		} finally {
			await context.close();
		}
	});
}

test('printing the actual demo reveals all sections and restores selection', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	const host = page.locator('#basic-use tabbed-interface');
	await expect(host).toHaveAttribute('data-layout', 'tabs');
	await host.getByRole('tab').nth(1).click();
	await expect(host.getByRole('tab').nth(1)).toHaveAttribute(
		'aria-selected',
		'true',
	);
	await page.emulateMedia({ media: 'print' });
	await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
	for (const element of await page.locator('tabbed-interface').all()) {
		await expect(element).toHaveAttribute('data-layout', 'linear');
		const state = await element.evaluate((demo) => ({
			hiddenPanels: demo.shadowRoot.querySelectorAll(
				'[data-panel][hidden]',
			).length,
			tablistHidden:
				demo.shadowRoot.querySelector('[data-tablist]').hidden,
		}));
		expect(state).toEqual({ hiddenPanels: 0, tablistHidden: true });
		for (const heading of await element.locator(':scope > h3').all()) {
			await expect(heading).toBeVisible();
			expect((await heading.boundingBox()).height).toBeGreaterThan(1);
		}
	}
	await page.emulateMedia({ media: 'screen' });
	await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
	await expect(host).toHaveAttribute('data-layout', 'tabs');
	await expect(host.getByRole('tab').nth(1)).toHaveAttribute(
		'aria-selected',
		'true',
	);
});

test('long-title demo switches to linear layout on smaller screens', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');

	const demo = page.locator('#responsive-layout-demo');
	await expect(demo).toHaveAttribute('data-layout', 'tabs');

	await page.setViewportSize({ width: 390, height: 900 });
	await expect(demo).toHaveAttribute('data-layout', 'linear');

	const state = await demo.evaluate((host) => ({
		headingsVisible: [...host.querySelectorAll(':scope > h3')].every(
			(heading) => getComputedStyle(heading).display !== 'none',
		),
		tabRoles: host.shadowRoot.querySelectorAll('[role="tab"]').length,
		tabpanelRoles:
			host.shadowRoot.querySelectorAll('[role="tabpanel"]').length,
	}));

	expect(state).toEqual({
		headingsVisible: true,
		tabRoles: 0,
		tabpanelRoles: 0,
	});
});

test('part selector variants style their selected tabs', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	await page.waitForFunction(
		() =>
			document.querySelector('tabbed-interface.pills')?.dataset.layout ===
				'tabs' &&
			document.querySelector('tabbed-interface.minimal')?.dataset
				.layout === 'tabs',
	);

	const styles = await page.evaluate(() => {
		const getTabStyles = (selector) => {
			const host = document.querySelector(selector);
			const tabs = host.shadowRoot
				.querySelector('#presentation > [data-tablist]')
				.querySelectorAll('[data-tab]');
			const selected = getComputedStyle(tabs[0]);
			const unselected = getComputedStyle(tabs[1]);

			return {
				selectedBackground: selected.backgroundColor,
				selectedBorderBottomWidth: selected.borderBottomWidth,
				selectedColor: selected.color,
				unselectedBackground: unselected.backgroundColor,
				unselectedBorderBottomWidth: unselected.borderBottomWidth,
				unselectedColor: unselected.color,
			};
		};

		return {
			minimal: getTabStyles('tabbed-interface.minimal'),
			pills: getTabStyles('tabbed-interface.pills'),
		};
	});

	expect(styles.pills.selectedBackground).not.toBe(
		styles.pills.unselectedBackground,
	);
	expect(styles.minimal.selectedBorderBottomWidth).toBe('2px');
	expect(styles.minimal.unselectedBorderBottomWidth).toBe('0px');
	expect(styles.minimal.selectedColor).toBe(styles.minimal.unselectedColor);
});

test('interactive demos respond to user actions', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	await page.waitForFunction(
		() =>
			document.querySelector('#event-demo')?.dataset.layout === 'tabs' &&
			document.querySelector('#programmatic-demo')?.dataset.layout ===
				'tabs',
	);

	await page.locator('#event-demo').evaluate((host) => {
		host.shadowRoot
			.querySelectorAll('[data-tablist] [data-tab]')[1]
			.click();
	});
	await expect(page.locator('#event-output')).toContainText('index=1');

	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('#programmatic-output')).toContainText(
		'Current tab: 1',
	);
});
