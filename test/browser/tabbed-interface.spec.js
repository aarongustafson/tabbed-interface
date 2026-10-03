import { expect, test } from '@playwright/test';

async function render(page, { width = 800, attributes = '', style = '' } = {}) {
	await page.setContent(`
		<base href="http://127.0.0.1:4173/">
		<style>
			#fixture { inline-size: ${width}px; }
			${style}
		</style>
		<div id="fixture">
			<tabbed-interface ${attributes}>
				<h2 id="first">First tab with a descriptive label</h2>
				<p class="owned">First panel content</p>
				<h2 id="second">Second tab with another label</h2>
				<p>Second panel content <button id="action">Action</button></p>
				<h2 id="third">Third tab</h2>
				<p>Third panel content</p>
			</tabbed-interface>
		</div>
		<script type="module" src="/define.js"></script>
	`);
	await page.waitForFunction(
		() =>
			customElements.get('tabbed-interface') &&
			document
				.querySelector('tabbed-interface')
				?.shadowRoot?.querySelector('[data-panel]'),
	);
	await page.waitForTimeout(50);
}

test('renders the original authored nodes through panel slots', async ({
	page,
}) => {
	await render(page, {
		style: `
			#fixture tabbed-interface .owned {
				background: rgb(12, 34, 56);
				padding: 13px;
			}
		`,
	});

	const result = await page.evaluate(() => {
		const element = document.querySelector('tabbed-interface');
		const paragraph = element.querySelector('.owned');
		const slot = element.shadowRoot.querySelector('[data-panel-slot="0"]');
		const style = getComputedStyle(paragraph);
		return {
			isOriginal: slot.assignedNodes().includes(paragraph),
			background: style.backgroundColor,
			padding: style.padding,
			shadowClone: Boolean(element.shadowRoot.querySelector('.owned')),
		};
	});

	expect(result).toEqual({
		isOriginal: true,
		background: 'rgb(12, 34, 56)',
		padding: '13px',
		shadowClone: false,
	});
});

test('leaves content without section headings in its original flow', async ({
	page,
}) => {
	await page.setContent(`
		<base href="http://127.0.0.1:4173/">
		<tabbed-interface>
			<!-- Framework marker -->
			<p id="plain">Plain content</p>
		</tabbed-interface>
		<script type="module" src="/define.js"></script>
	`);
	await page.waitForFunction(() => customElements.get('tabbed-interface'));
	await page.waitForTimeout(50);

	const state = await page.locator('tabbed-interface').evaluate((host) => ({
		assigned: host.shadowRoot
			.querySelector('#fallback')
			.assignedNodes()
			.includes(host.querySelector('#plain')),
		tablist: Boolean(host.shadowRoot.querySelector('[data-tablist]')),
		visible:
			getComputedStyle(host.querySelector('#plain')).display !== 'none',
	}));

	expect(state).toEqual({
		assigned: true,
		tablist: false,
		visible: true,
	});
});

test('preserves listeners, live form state, and form ownership', async ({
	page,
}) => {
	await page.setContent(`
		<base href="http://127.0.0.1:4173/">
		<form id="form">
			<tabbed-interface fixed-tabs>
				<h2>Contact</h2>
				<label>Name <input id="name" name="name" value="Initial"></label>
				<h2>Other</h2>
				<button id="action" type="button">Action</button>
			</tabbed-interface>
		</form>
		<script>
			window.actionCount = 0;
			document.querySelector('#action').addEventListener('click', () => {
				window.actionCount += 1;
			});
		</script>
		<script type="module" src="/define.js"></script>
	`);
	await page.waitForFunction(
		() =>
			document.querySelector('tabbed-interface')?.dataset.layout ===
			'tabs',
	);

	await page.locator('#name').fill('Updated');
	await page.locator('tabbed-interface').evaluate((host) => {
		const tab = host.shadowRoot.querySelectorAll('[role="tab"]')[1];
		tab.click();
		tab.focus();
	});
	await page.locator('#action').click();

	const result = await page.evaluate(() => ({
		actionCount: window.actionCount,
		value: document.querySelector('#name').value,
		formValue: new FormData(document.querySelector('#form')).get('name'),
		formOwner: document.querySelector('#name').form?.id,
	}));

	expect(result).toEqual({
		actionCount: 1,
		value: 'Updated',
		formValue: 'Updated',
		formOwner: 'form',
	});
});

test('switches between tabs and linear sections based on rendered fit', async ({
	page,
}) => {
	await render(page, { width: 800 });
	const element = page.locator('tabbed-interface');

	await expect(element).toHaveAttribute('data-layout', 'tabs');
	const secondTab = element.locator('[role="tab"]').nth(1);
	await secondTab.click();
	await secondTab.focus();
	await expect(secondTab).toBeFocused();

	await page.locator('#fixture').evaluate((fixture) => {
		fixture.style.inlineSize = '180px';
	});
	await expect(element).toHaveAttribute('data-layout', 'linear');

	const linearState = await element.evaluate((host) => ({
		tablist: host.shadowRoot.querySelector('[role="tablist"]'),
		hiddenPanels: host.shadowRoot.querySelectorAll('[data-panel][hidden]')
			.length,
		panelRoles:
			host.shadowRoot.querySelectorAll('[role="tabpanel"]').length,
		headingPosition: getComputedStyle(host.querySelector('#first'))
			.position,
	}));
	expect(linearState).toEqual({
		tablist: null,
		hiddenPanels: 0,
		panelRoles: 0,
		headingPosition: 'static',
	});
	await expect(element).toBeFocused();

	await page.locator('#fixture').evaluate((fixture) => {
		fixture.style.inlineSize = '800px';
	});
	await expect(element).toHaveAttribute('data-layout', 'tabs');
	const selectedIndex = await element.evaluate((host) =>
		Array.from(host.shadowRoot.querySelectorAll('[role="tab"]')).findIndex(
			(tab) => tab.getAttribute('aria-selected') === 'true',
		),
	);
	expect(selectedIndex).toBe(1);
	const restoredFocus = await element.evaluate(
		(host) =>
			host.shadowRoot.activeElement ===
			host.shadowRoot.querySelectorAll('[role="tab"]')[1],
	);
	expect(restoredFocus).toBe(true);
});

test('allows wrapped labels while keeping the tablist on one row', async ({
	page,
}) => {
	await render(page, {
		width: 330,
		style: `
			tabbed-interface::part(tab) {
				inline-size: 100px;
				padding: 4px;
				white-space: normal;
			}
		`,
	});

	const element = page.locator('tabbed-interface');
	await expect(element).toHaveAttribute('data-layout', 'tabs');
	const geometry = await element.evaluate((host) => {
		const tabs = Array.from(
			host.shadowRoot.querySelectorAll('[role="tab"]'),
		);
		return {
			rows: new Set(tabs.map((tab) => tab.offsetTop)).size,
			wrapped: tabs.some(
				(tab) => tab.getBoundingClientRect().height > 40,
			),
		};
	});
	expect(geometry.rows).toBe(1);
	expect(geometry.wrapped).toBe(true);
});

test('includes external part and selected-state styles in fit measurement', async ({
	page,
}) => {
	await render(page, {
		width: 300,
		style: `
			tabbed-interface::part(tab) {
				padding-inline: 4px;
			}
			tabbed-interface::part(selected) {
				font-weight: 900;
				padding-inline: 120px;
			}
		`,
	});

	await expect(page.locator('tabbed-interface')).toHaveAttribute(
		'data-layout',
		'linear',
	);
});

test('fixed-tabs opts out of automatic linear mode', async ({ page }) => {
	await render(page, { width: 120, attributes: 'fixed-tabs' });
	await expect(page.locator('tabbed-interface')).toHaveAttribute(
		'data-layout',
		'tabs',
	);
});

test('keeps the measurement UI out of interaction and accessibility semantics', async ({
	page,
}) => {
	await render(page);
	const state = await page.locator('tabbed-interface').evaluate((host) => {
		const measurement = host.shadowRoot.querySelector('#measurement');
		return {
			ariaHidden: measurement.getAttribute('aria-hidden'),
			inert: measurement.inert,
			roles: measurement.querySelectorAll('[role]').length,
			focusable: Array.from(measurement.querySelectorAll('button')).some(
				(button) => button.tabIndex >= 0,
			),
			visibility: getComputedStyle(measurement).visibility,
		};
	});

	expect(state).toEqual({
		ariaHidden: 'true',
		inert: true,
		roles: 0,
		focusable: false,
		visibility: 'hidden',
	});
});

test('shows all sections for print and restores the screen layout', async ({
	page,
}) => {
	await render(page, { width: 150, attributes: 'fixed-tabs' });
	const element = page.locator('tabbed-interface');
	await expect(element).toHaveAttribute('data-layout', 'tabs');

	await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
	await expect(element).toHaveAttribute('data-layout', 'linear');

	const printState = await element.evaluate((host) => ({
		hiddenPanels: host.shadowRoot.querySelectorAll('[data-panel][hidden]')
			.length,
		tablistHidden: host.shadowRoot.querySelector('[data-tablist]').hidden,
	}));
	expect(printState).toEqual({ hiddenPanels: 0, tablistHidden: true });

	await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
	await expect(element).toHaveAttribute('data-layout', 'tabs');
});

test('reconciles heading changes while preserving authored content state', async ({
	page,
}) => {
	await render(page, { attributes: 'fixed-tabs' });

	await page.locator('tabbed-interface').evaluate((host) => {
		window.initialFirstTab = host.shadowRoot.querySelector('[role="tab"]');
		const paragraph = host.querySelector('.owned');
		window.originalParagraph = paragraph;
		paragraph.dataset.runtimeState = 'preserved';
		host.querySelector('#first').textContent = 'Renamed first tab';
	});

	await page.waitForFunction(
		() =>
			document
				.querySelector('tabbed-interface')
				.shadowRoot.querySelector('[role="tab"]')?.textContent ===
			'Renamed first tab',
	);

	await page.locator('tabbed-interface').evaluate((host) => {
		const newHeading = document.createElement('h2');
		newHeading.textContent = 'Fourth tab';
		const newContent = document.createElement('p');
		newContent.textContent = 'Fourth content';
		host.append(newHeading, newContent);
	});

	await page.waitForFunction(
		() =>
			document
				.querySelector('tabbed-interface')
				.shadowRoot.querySelectorAll('[role="tab"]').length === 4,
	);

	const result = await page.locator('tabbed-interface').evaluate((host) => {
		return {
			firstLabel:
				host.shadowRoot.querySelector('[role="tab"]').textContent,
			tabCount: host.shadowRoot.querySelectorAll('[role="tab"]').length,
			sameParagraph:
				host.querySelector('.owned') === window.originalParagraph,
			runtimeState: window.originalParagraph.dataset.runtimeState,
			tabRebuilt:
				host.shadowRoot.querySelector('[role="tab"]') !==
				window.initialFirstTab,
		};
	});

	expect(result).toEqual({
		firstLabel: 'Renamed first tab',
		tabCount: 4,
		sameParagraph: true,
		runtimeState: 'preserved',
		tabRebuilt: true,
	});
});

test('survives disconnect and reconnect without replacing source nodes', async ({
	page,
}) => {
	await render(page, { attributes: 'fixed-tabs' });

	const result = await page
		.locator('tabbed-interface')
		.evaluate(async (host) => {
			const paragraph = host.querySelector('.owned');
			const parent = host.parentNode;
			host.remove();
			parent.append(host);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));

			const slot = host.shadowRoot.querySelector('[data-panel-slot="0"]');
			return {
				sameParagraph: host.querySelector('.owned') === paragraph,
				assigned: slot.assignedNodes().includes(paragraph),
				layout: host.dataset.layout,
			};
		});

	expect(result).toEqual({
		sameParagraph: true,
		assigned: true,
		layout: 'tabs',
	});
});

test('unobserves replaced measurement controls during reconciliation', async ({
	page,
}) => {
	await page.setContent(`
		<base href="http://127.0.0.1:4173/">
		<script>
			window.observedTargets = new Set();
			window.ResizeObserver = class {
				observe(target) {
					window.observedTargets.add(target);
				}
				unobserve(target) {
					window.observedTargets.delete(target);
				}
				disconnect() {
					window.observedTargets.clear();
				}
			};
		</script>
		<tabbed-interface fixed-tabs>
			<h2 id="first">First</h2>
			<p>First content</p>
			<h2>Second</h2>
			<p>Second content</p>
		</tabbed-interface>
		<script type="module" src="/define.js"></script>
	`);
	await page.waitForFunction(
		() =>
			document.querySelector('tabbed-interface')?.dataset.layout ===
			'tabs',
	);

	for (const label of ['Updated once', 'Updated twice', 'Updated thrice']) {
		await page.locator('#first').evaluate((heading, text) => {
			heading.textContent = text;
		}, label);
		await page.waitForFunction(
			(expected) =>
				document
					.querySelector('tabbed-interface')
					.shadowRoot.querySelector('[role="tab"]')?.textContent ===
				expected,
			label,
		);
	}

	const observationState = await page.evaluate(() => ({
		count: window.observedTargets.size,
		detached: Array.from(window.observedTargets).filter(
			(target) => !target.isConnected,
		).length,
	}));

	expect(observationState).toEqual({
		count: 4,
		detached: 0,
	});
});
