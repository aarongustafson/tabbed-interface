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

	expect(demos).toHaveLength(13);
	for (const demo of demos) {
		expect(['tabs', 'linear']).toContain(demo.layout);
		expect(demo.panelCount).toBe(demo.headingCount);
		expect(demo.tabCount).toBe(demo.headingCount);
	}
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
	expect(styles.minimal.selectedColor).not.toBe(
		styles.minimal.unselectedColor,
	);
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
