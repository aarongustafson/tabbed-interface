import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TabbedInterfaceElement } from '../tabbed-interface.js';

describe('TabbedInterfaceElement - Style Inheritance', () => {
	let element;

	beforeEach(() => {
		element = document.createElement('tabbed-interface');
	});

	afterEach(() => {
		if (element && element.parentNode) {
			element.parentNode.removeChild(element);
		}
	});

	describe('Color inheritance', () => {
		it('should have color: inherit on host and tabpanel', async () => {
			element.innerHTML = `
				<h2>Tab 1</h2>
				<p>Content 1</p>
				<h2>Tab 2</h2>
				<p>Content 2</p>
			`;

			// Set a custom color
			element.style.color = 'rgb(255, 0, 0)';
			document.body.appendChild(element);

			// Wait for initialization
			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check that the element has color set
			const hostStyle = window.getComputedStyle(element);
			expect(hostStyle.color).toBe('rgb(255, 0, 0)');

			// Check tabpanel has color: inherit in its CSS
			const tabpanel =
				element.shadowRoot.querySelector('[role="tabpanel"]');
			expect(tabpanel).toBeTruthy();

			// The tabpanel should have color: inherit which allows it to inherit from :host
			// We can't easily test the computed value in jsdom, but we can verify
			// the CSS rule is applied by checking the style sheet
			const styleElement = element.shadowRoot.querySelector('style');
			expect(styleElement).toBeTruthy();
			expect(styleElement.textContent).toContain('color: inherit');
		});
	});

	describe('CSS custom properties', () => {
		beforeEach(async () => {
			element.innerHTML = `
				<h2>Tab 1</h2>
				<p>Content 1</p>
				<h2>Tab 2</h2>
				<p>Content 2</p>
			`;
			document.body.appendChild(element);
			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		it('should apply --tabbed-interface-tabpanel-padding', () => {
			element.style.setProperty(
				'--tabbed-interface-tabpanel-padding',
				'2em',
			);
			const tabpanel =
				element.shadowRoot.querySelector('[role="tabpanel"]');
			const style = window.getComputedStyle(tabpanel);

			// The padding should be set (exact value depends on font size)
			expect(style.padding).not.toBe('16px'); // Default is 1em ≈ 16px
		});

		it('should apply --tabbed-interface-tabpanel-background', () => {
			element.style.setProperty(
				'--tabbed-interface-tabpanel-background',
				'rgb(173, 216, 230)',
			);
			const tabpanel =
				element.shadowRoot.querySelector('[role="tabpanel"]');
			const style = window.getComputedStyle(tabpanel);

			expect(style.backgroundColor).toBe('rgb(173, 216, 230)');
		});

		it('should apply --tabbed-interface-tab-background', () => {
			element.style.setProperty(
				'--tabbed-interface-tab-background',
				'rgb(0, 128, 0)',
			);
			const tab = element.shadowRoot.querySelector('[role="tab"]');
			const style = window.getComputedStyle(tab);

			expect(style.backgroundColor).toBe('rgb(0, 128, 0)');
		});

		it('should apply --tabbed-interface-tab-active-background', () => {
			element.style.setProperty(
				'--tabbed-interface-tab-active-background',
				'rgb(255, 0, 0)',
			);
			const activeTab = element.shadowRoot.querySelector(
				'[role="tab"][aria-selected="true"]',
			);
			const style = window.getComputedStyle(activeTab);

			expect(style.backgroundColor).toBe('rgb(255, 0, 0)');
		});

		it('should apply --tabbed-interface-font-family', () => {
			element.style.setProperty(
				'--tabbed-interface-font-family',
				'monospace',
			);
			const hostStyle = window.getComputedStyle(element);

			expect(hostStyle.fontFamily).toContain('monospace');
		});
	});

	describe('Font inheritance', () => {
		it('should inherit font-family through shadow DOM', async () => {
			element.innerHTML = `
				<h2>Tab 1</h2>
				<p>Content 1</p>
			`;

			element.style.fontFamily = 'monospace';
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 10));

			const tabpanel =
				element.shadowRoot.querySelector('[role="tabpanel"]');
			const paragraph = tabpanel.querySelector('p');
			const pStyle = window.getComputedStyle(paragraph);

			// Font family should be inherited through shadow DOM
			expect(pStyle.fontFamily).toContain('monospace');
		});
	});
});
