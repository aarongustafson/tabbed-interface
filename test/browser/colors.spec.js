import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const source = await readFile(
	new URL('../../tabbed-interface.js', import.meta.url),
	'utf8',
);
const demoCSS = await readFile(
	new URL('../../demo/styles.css', import.meta.url),
	'utf8',
);
const definitionSource = await readFile(
	new URL('../../define.js', import.meta.url),
	'utf8',
);
const demoSource = await readFile(
	new URL('../../demo/index.html', import.meta.url),
	'utf8',
);
const tokens = [
	'Canvas',
	'CanvasText',
	'ButtonFace',
	'ButtonText',
	'Field',
	'FieldText',
];
// The study's 62 observations reduce to these 19 token palettes.
// Substitution checks authored CSS, not actual forced-color repainting.
const palettes = [
	['#ffffff', '#000000', '#efefef', '#000000', '#ffffff', '#000000'],
	['#121212', '#ffffff', '#6b6b6b', '#ffffff', '#3b3b3b', '#ffffff'],
	['#ffffff', '#000000', '#e9e9ed', '#000000', '#ffffff', '#000000'],
	['#1c1b22', '#fbfbfe', '#2b2a33', '#fbfbfe', '#2b2a33', '#fbfbfe'],
	['#ffffff', '#000000', '#c0c0c0', '#000000d8', '#ffffff', '#000000d8'],
	['#1e1e1e', '#ffffff', '#ffffff3f', '#ffffffd8', '#ffffff3f', '#ffffffd8'],
	['#ffffff', '#000000', '#f0f0f0', '#000000', '#ffffff', '#000000'],
	['#202020', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#3d3d3d'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffee32'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#b6f6f0'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#202020'],
	['#ffffff', '#000000', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#000000', '#ffffff', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#ffffff', '#000000', '#ffffff', '#000000d8', '#ffffff', '#000000d8'],
	['#282828', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#202020', '#ffffff', '#00000000', '#ffffff', '#00000000', '#ffffff'],
];

function substitute(css, palette) {
	const colors = Object.fromEntries(
		tokens.map((token, index) => [token, palette[index]]),
	);
	return css.replace(
		/\b(CanvasText|Canvas|ButtonFace|ButtonText|FieldText|Field)\b/g,
		(token) => colors[token],
	);
}

async function measurements(locator) {
	return locator.evaluate((element) => {
		const context = document.createElement('canvas').getContext('2d');
		if (!context) throw new Error('Canvas measurement unavailable.');
		const pixel = () => [...context.getImageData(0, 0, 1, 1).data];
		const paint = (color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return pixel();
		};
		const parent = (node) =>
			node.assignedSlot || node.parentElement || node.getRootNode().host;
		const background = (node) => {
			context.clearRect(0, 0, 1, 1);
			const ancestors = [];
			for (; node; node = parent(node)) ancestors.unshift(node);
			for (const ancestor of ancestors) {
				const style = getComputedStyle(ancestor);
				paint(style.backgroundColor);
				if (style.backgroundImage !== 'none') {
					const wash = style.backgroundImage.match(
						/^linear-gradient\((.+), \1\)$/,
					);
					if (!wash)
						throw new Error(
							`Unsupported background: ${style.backgroundImage}`,
						);
					paint(wash[1]);
				}
			}
			if (pixel()[3] !== 255)
				throw new Error('Expected opaque measurement surface.');
			return pixel();
		};
		const luminance = (rgb) =>
			rgb.slice(0, 3).reduce((sum, channel, index) => {
				const value = channel / 255;
				return (
					sum +
					(value <= 0.04045
						? value / 12.92
						: ((value + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][index]
				);
			}, 0);
		const ratio = (a, b) => {
			const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
			return (values[0] + 0.05) / (values[1] + 0.05);
		};
		const style = getComputedStyle(element);
		const fill = background(element);
		const foreground = paint(style.color);
		const surround = background(parent(element));
		const border = paint(style.borderTopColor);
		const paintsBorder =
			parseFloat(style.borderTopWidth) > 0 &&
			!['none', 'hidden'].includes(style.borderTopStyle);
		return {
			text: ratio(foreground, fill),
			boundary: Math.max(
				ratio(fill, surround),
				paintsBorder ? ratio(border, surround) : 1,
			),
		};
	});
}

async function fixture(page, attributes = '') {
	await page.goto('/test/browser/colors.html');
	if (attributes)
		await page
			.locator('tabbed-interface')
			.evaluate((host, name) => host.setAttribute(name, ''), attributes);
	await expect(page.locator('tabbed-interface')).toHaveAttribute(
		'data-layout',
		'tabs',
	);
	return page.locator('tabbed-interface');
}

test('hover uses a complete control pair instead of inheriting the host foreground', async ({
	page,
}) => {
	const host = await fixture(page);
	await host.evaluate((element) => {
		element.style.color = 'rgb(255, 255, 255)';
	});
	const tab = host.getByRole('tab').nth(1);
	await tab.hover();
	const colors = await tab.evaluate((element) => {
		const probe = document.createElement('button');
		probe.style.color = 'ButtonText';
		document.body.append(probe);
		const expected = getComputedStyle(probe).color;
		probe.remove();
		return { actual: getComputedStyle(element).color, expected };
	});
	expect(colors.actual).toBe(colors.expected);
	expect((await measurements(tab)).text).toBeGreaterThanOrEqual(4.5);
});

for (const scheme of ['light', 'dark']) {
	test(`${scheme}: selected tabs omit the forced-color underline`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: scheme, forcedColors: 'none' });
		const host = await fixture(page);
		await expect(host.getByRole('tab', { selected: true })).toHaveCSS(
			'text-decoration-line',
			'none',
		);
		await host.getByRole('tab').nth(1).click();
		await expect(host.getByRole('tab', { selected: true })).toHaveCSS(
			'text-decoration-line',
			'none',
		);
	});
}

test('selection is metric-stable, native focus remains available, and focus hooks work', async ({
	page,
}) => {
	const host = await fixture(page);
	const tabs = host.getByRole('tab');
	const first = tabs.first();
	await expect(first).toHaveCSS('text-decoration-line', 'none');
	const before = await first.boundingBox();
	await tabs.nth(1).click();
	await expect(first).toHaveCSS('text-decoration-line', 'none');
	await expect(tabs.nth(1)).toHaveCSS('text-decoration-line', 'none');
	const after = await first.boundingBox();
	expect(after.width).toBe(before.width);
	expect(after.height).toBe(before.height);
	await tabs.nth(1).focus();
	await page.keyboard.press('ArrowRight');
	await expect(tabs.nth(2)).toBeFocused();
	await expect(tabs.nth(2)).toHaveCSS('outline-style', 'auto');
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('Enter');
	await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
	await host.evaluate((element) => {
		element.style.setProperty(
			'--tabbed-interface-tab-focus-outline',
			'3px solid rgb(80, 20, 120)',
		);
	});
	await expect(tabs.nth(2)).toHaveCSS('outline-width', '3px');
	await expect(tabs.nth(2)).toHaveCSS('outline-color', 'rgb(80, 20, 120)');
});

test('19 study palettes retain tab text and boundaries in resting, hover, and selected states', async ({
	page,
}) => {
	const host = await fixture(page);
	for (const [index, palette] of palettes.entries()) {
		const style = await page.addStyleTag({
			content: substitute(demoCSS, palette),
		});
		await host.evaluate(
			(element, css) => {
				element.shadowRoot.querySelector('style').textContent = css;
			},
			substitute(source.match(/<style>([\s\S]*?)<\/style>/)[1], palette),
		);
		for (const selectedIndex of [0, 1]) {
			await host.evaluate((element, value) => {
				element.activeIndex = value;
			}, selectedIndex);
			for (const tab of await host.getByRole('tab').all()) {
				expect(
					(await measurements(tab)).text,
					`palette ${index}: tab`,
				).toBeGreaterThanOrEqual(4.5);
				expect(
					(await measurements(tab)).boundary,
					`palette ${index}: boundary`,
				).toBeGreaterThanOrEqual(3);
				await tab.hover();
				expect(
					(await measurements(tab)).text,
					`palette ${index}: hover`,
				).toBeGreaterThanOrEqual(4.5);
			}
		}
		await style.evaluate((element) => element.remove());
	}
});

test('19 study palettes retain paired demo controls, supporting text and themed tabs', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/demo/index.html');
	await expect(page.locator('tabbed-interface.pills')).toHaveAttribute(
		'data-layout',
		'tabs',
	);
	const componentCSS = source.match(/<style>([\s\S]*?)<\/style>/)[1];
	const inlineCSS = demoSource.match(/<style>([\s\S]*?)<\/style>/)[1];
	for (const [index, palette] of palettes.entries()) {
		const style = await page.addStyleTag({
			content: substitute(demoCSS + inlineCSS, palette),
		});
		await page.locator('tabbed-interface').evaluateAll(
			(hosts, css) => {
				for (const host of hosts)
					host.shadowRoot.querySelector('style').textContent = css;
			},
			substitute(componentCSS, palette),
		);
		for (const selector of [
			'.controls button',
			'.status',
			'.output',
			'footer',
			'.demo-section > p',
		]) {
			for (const element of await page.locator(selector).all())
				expect(
					(await measurements(element)).text,
					`palette ${index}: ${selector}`,
				).toBeGreaterThanOrEqual(4.5);
		}
		for (const variant of ['.pills', '.minimal']) {
			const host = page.locator(`tabbed-interface${variant}`);
			for (const tab of await host.getByRole('tab').all()) {
				expect(
					(await measurements(tab)).text,
					`palette ${index}: ${variant}`,
				).toBeGreaterThanOrEqual(4.5);
				await tab.hover();
				expect(
					(await measurements(tab)).text,
					`palette ${index}: ${variant} hover`,
				).toBeGreaterThanOrEqual(4.5);
			}
			expect(
				(await measurements(host.getByRole('tabpanel'))).text,
				`palette ${index}: panel`,
			).toBeGreaterThanOrEqual(4.5);
		}
		await style.evaluate((element) => element.remove());
	}
});

test('custom normal, hover and active color pairs retain precedence', async ({
	page,
}) => {
	const host = await fixture(page);
	await host.evaluate((element) => {
		element.style.cssText =
			'--tabbed-interface-tab-background:#fff;--tabbed-interface-tab-color:#202020;--tabbed-interface-tab-hover-background:#173f63;--tabbed-interface-tab-hover-color:#fff;--tabbed-interface-tab-active-background:#202020;--tabbed-interface-tab-active-color:#fff;';
	});
	const tabs = host.getByRole('tab');
	await tabs.nth(1).hover();
	await expect(tabs.nth(1)).toHaveCSS('background-color', 'rgb(23, 63, 99)');
	await expect(tabs.nth(1)).toHaveCSS('color', 'rgb(255, 255, 255)');
	await tabs.nth(1).click();
	await expect(tabs.nth(1)).toHaveCSS('background-color', 'rgb(32, 32, 32)');
	expect((await measurements(tabs.nth(1))).text).toBeGreaterThanOrEqual(4.5);
});

test('forced colors retain automatic adjustment, separate selection and keyboard focus', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName !== 'chromium',
		'Only Chromium supports forced-color emulation.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	const host = await fixture(page, 'tablist-after');
	const tabs = host.getByRole('tab');
	await tabs.first().focus();
	await page.keyboard.press('ArrowRight');
	await expect(tabs.nth(1)).toBeFocused();
	await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
	await expect(tabs.first()).toHaveCSS('text-decoration-line', 'underline');
	await expect(tabs.nth(1)).toHaveCSS('text-decoration-line', 'none');
	await expect(tabs.nth(1)).toHaveCSS('outline-style', 'auto');
	await expect(tabs.first()).toHaveCSS('forced-color-adjust', 'auto');
	await page.keyboard.press('Space');
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
	await expect(tabs.nth(1)).toHaveCSS('text-decoration-line', 'underline');
});

test('measurements cross shadow/slot boundaries and ignore unpainted borders', async ({
	page,
}) => {
	await fixture(page);
	const target = page.locator('tabbed-interface').getByRole('tab').first();
	await target.evaluate((element) => {
		element.style.cssText = 'background:white;color:black;border:none';
	});
	expect(await measurements(target)).toEqual({ text: 21, boundary: 1 });
	for (const border of [
		'2px hidden black',
		'0px solid black',
		'2px solid transparent',
	]) {
		await target.evaluate((element, value) => {
			element.style.border = value;
		}, border);
		expect((await measurements(target)).boundary).toBe(1);
	}
	await target.evaluate((element) => {
		element.style.border = '2px solid black';
	});
	expect((await measurements(target)).boundary).toBe(21);
});

for (const scheme of ['light', 'dark']) {
	test(`${scheme}: native control pair contrast`, async ({
		page,
		browserName,
	}) => {
		test.fail(
			browserName === 'webkit' &&
				process.platform === 'linux' &&
				scheme === 'dark',
			'Known Ubuntu WebKit dark native ButtonText/ButtonFace limitation.',
		);
		await page.emulateMedia({ colorScheme: scheme });
		await fixture(page);
		const probe = await page.addStyleTag({
			content: 'body { background:Canvas; color:CanvasText; }',
		});
		expect(
			(await measurements(page.getByRole('tab').nth(1))).text,
		).toBeGreaterThanOrEqual(4.5);
		await probe.evaluate((element) => element.remove());
	});

	test(`${scheme}: demo variants, controls and status surfaces keep readable pairs`, async ({
		page,
		browserName,
	}) => {
		await page.emulateMedia({ colorScheme: scheme });
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/demo/index.html');
		await expect(page.locator('tabbed-interface.pills')).toHaveAttribute(
			'data-layout',
			'tabs',
		);
		const nativePair = await page.evaluate(() => {
			const probe = document.createElement('span');
			probe.style.cssText = 'background:ButtonFace;color:ButtonText';
			document.body.append(probe);
			const style = getComputedStyle(probe);
			const pair = {
				color: style.color,
				background: style.backgroundColor,
			};
			probe.remove();
			return pair;
		});
		const checkText = async (element, label) => {
			const style = await element.evaluate((node) => {
				const color = getComputedStyle(node).color;
				let background = getComputedStyle(node).backgroundColor;
				while (background === 'rgba(0, 0, 0, 0)') {
					node = node.parentElement || node.getRootNode().host;
					if (!node) throw new Error('Missing opaque demo surface.');
					background = getComputedStyle(node).backgroundColor;
				}
				return { color, background };
			});
			// Only the exact native pair is covered by the separate expected-failure test.
			const knownNativeFailure =
				browserName === 'webkit' &&
				process.platform === 'linux' &&
				scheme === 'dark' &&
				style.color === nativePair.color &&
				style.background === nativePair.background;
			if (!knownNativeFailure)
				expect(
					(await measurements(element)).text,
					label,
				).toBeGreaterThanOrEqual(4.5);
		};
		for (const selector of [
			'.controls button',
			'.status',
			'.output',
			'.demo-section > p',
			'footer',
			'.api-reference',
		]) {
			for (const element of await page.locator(selector).all()) {
				await checkText(element, selector);
			}
		}
		for (const variant of ['.pills', '.minimal']) {
			const host = page.locator(`tabbed-interface${variant}`);
			for (const tab of await host.getByRole('tab').all()) {
				await checkText(tab, variant);
				await tab.hover();
				await checkText(tab, `${variant}: hover`);
			}
			await expect(host.getByRole('tab', { selected: true })).toHaveCSS(
				'text-decoration-line',
				'none',
			);
			expect(
				(await measurements(host.getByRole('tabpanel'))).text,
			).toBeGreaterThanOrEqual(4.5);
		}
	});
}

for (const demo of ['index.html', 'esm.html', 'unpkg.html']) {
	test(`${demo}: code/live examples reflow without horizontal page overflow`, async ({
		page,
	}) => {
		await page.route(
			/https:\/\/(?:esm\.sh|unpkg\.com)\//,
			async (route) => {
				// Validate this branch's registration contracts, not third-party availability.
				const definition = new URL(
					route.request().url(),
				).pathname.endsWith('/define.js');
				await route.fulfill({
					contentType: 'text/javascript',
					headers: { 'Access-Control-Allow-Origin': '*' },
					body: definition
						? definitionSource.replaceAll(
								"'./tabbed-interface.js'",
								"'/tabbed-interface.js'",
							)
						: source,
				});
			},
		);
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`/demo/${demo}`);
		await expect(page.locator('tabbed-interface').first()).toHaveAttribute(
			'data-layout',
			/tabs|linear/,
		);
		for (const width of [1400, 320]) {
			await page.setViewportSize({ width, height: 900 });
			await expect
				.poll(() =>
					page.evaluate(
						() =>
							document.documentElement.scrollWidth <= innerWidth,
					),
				)
				.toBe(true);
			const pairs = page.locator('.code-demo-pair');
			expect(await pairs.count()).toBeGreaterThan(0);
			for (const pair of await pairs.all()) {
				const code = await pair.locator(':scope > pre').boundingBox();
				const live = await pair.locator(':scope > .demo').boundingBox();
				expect(code).not.toBeNull();
				expect(live).not.toBeNull();
				const fullWidthFitExample = await pair.evaluate((element) =>
					element.classList.contains('responsive-demo-pair'),
				);
				if (width === 1400 && !fullWidthFitExample) {
					expect(code.x + code.width).toBeLessThanOrEqual(live.x);
					expect(Math.abs(code.y - live.y)).toBeLessThan(2);
				} else expect(code.y + code.height).toBeLessThanOrEqual(live.y);
			}
		}
		expect(errors).toEqual([]);
	});

	for (const mode of ['no JavaScript', 'module failure']) {
		test(`${demo}: ${mode} retains readable headings and content`, async ({
			browser,
		}) => {
			const context = await browser.newContext({
				javaScriptEnabled: mode !== 'no JavaScript',
				colorScheme: 'dark',
				viewport: { width: 320, height: 900 },
			});
			try {
				const page = await context.newPage();
				if (mode === 'module failure')
					await page.route(
						/(?:\/define\.js|https:\/\/(?:esm\.sh|unpkg\.com)\/)/,
						(route) => route.abort(),
					);
				await page.goto(`/demo/${demo}`);
				for (const host of await page
					.locator('tabbed-interface')
					.all()) {
					for (const heading of await host
						.locator(':scope > h2, :scope > h3')
						.all()) {
						await expect(heading).toBeVisible();
						expect(
							(await measurements(heading)).text,
						).toBeGreaterThanOrEqual(4.5);
					}
				}
				await expect(page.getByRole('tab')).toHaveCount(0);
				expect(
					await page.evaluate(
						() =>
							document.documentElement.scrollWidth <= innerWidth,
					),
				).toBe(true);
			} finally {
				await context.close();
			}
		});
	}
}
