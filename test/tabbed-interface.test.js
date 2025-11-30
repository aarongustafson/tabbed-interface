import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabbedInterfaceElement } from '../tabbed-interface.js';

describe('TabbedInterfaceElement', () => {
	let element;

	beforeEach(() => {
		element = document.createElement('tabbed-interface');
	});

	afterEach(() => {
		if (element && element.parentNode) {
			element.parentNode.removeChild(element);
		}
	});

	describe('Registration', () => {
		it('should be defined as a custom element', () => {
			expect(customElements.get('tabbed-interface')).toBe(
				TabbedInterfaceElement,
			);
		});

		it('should create an instance', () => {
			expect(element).toBeInstanceOf(TabbedInterfaceElement);
			expect(element).toBeInstanceOf(HTMLElement);
		});

		it('should have a shadow root', () => {
			expect(element.shadowRoot).toBeTruthy();
		});
	});

	describe('Without heading content', () => {
		it('should not transform content without headings', async () => {
			element.innerHTML = '<p>Just a paragraph</p>';
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));

			// Should have a slot but no tablist
			const tablist =
				element.shadowRoot.querySelector('[role="tablist"]');
			expect(tablist).toBeNull();
		});
	});

	describe('With heading content', () => {
		beforeEach(async () => {
			element.innerHTML = `
				<h2 id="tab1">First Tab</h2>
				<p>First content</p>
				<h2 id="tab2">Second Tab</h2>
				<p>Second content</p>
				<h2 id="tab3">Third Tab</h2>
				<p>Third content</p>
			`;
			document.body.appendChild(element);

			// Wait for initialization
			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		it('should create a tablist', () => {
			const tablist =
				element.shadowRoot.querySelector('[role="tablist"]');
			expect(tablist).toBeTruthy();
		});

		it('should create tabs for each heading', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			expect(tabs.length).toBe(3);
		});

		it('should create tabpanels for each section', () => {
			const panels =
				element.shadowRoot.querySelectorAll('[role="tabpanel"]');
			expect(panels.length).toBe(3);
		});

		it('should set the first tab as active by default', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			expect(tabs[0].getAttribute('aria-selected')).toBe('true');
			expect(tabs[1].getAttribute('aria-selected')).toBe('false');
			expect(tabs[2].getAttribute('aria-selected')).toBe('false');
		});

		it('should show only the first panel by default', () => {
			const panels =
				element.shadowRoot.querySelectorAll('[role="tabpanel"]');
			expect(panels[0].hasAttribute('hidden')).toBe(false);
			expect(panels[1].hasAttribute('hidden')).toBe(true);
			expect(panels[2].hasAttribute('hidden')).toBe(true);
		});

		it('should have proper ARIA attributes on tabs', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			const panels =
				element.shadowRoot.querySelectorAll('[role="tabpanel"]');

			tabs.forEach((tab, i) => {
				expect(tab.getAttribute('aria-controls')).toBe(panels[i].id);
				expect(tab.getAttribute('id')).toBeTruthy();
			});
		});

		it('should have proper ARIA attributes on panels', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			const panels =
				element.shadowRoot.querySelectorAll('[role="tabpanel"]');

			panels.forEach((panel, i) => {
				expect(panel.getAttribute('aria-labelledby')).toBe(tabs[i].id);
			});
		});

		it('should expose activeIndex property', () => {
			expect(element.activeIndex).toBe(0);
		});

		it('should allow setting activeIndex', () => {
			element.activeIndex = 1;
			expect(element.activeIndex).toBe(1);

			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			expect(tabs[0].getAttribute('aria-selected')).toBe('false');
			expect(tabs[1].getAttribute('aria-selected')).toBe('true');
		});
	});

	describe('Tab navigation', () => {
		beforeEach(async () => {
			element.innerHTML = `
				<h2>Tab A</h2>
				<p>Content A</p>
				<h2>Tab B</h2>
				<p>Content B</p>
				<h2>Tab C</h2>
				<p>Content C</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		it('should navigate to next tab', () => {
			element.next();
			expect(element.activeIndex).toBe(1);
		});

		it('should wrap around from last to first', () => {
			element.activeIndex = 2;
			element.next();
			expect(element.activeIndex).toBe(0);
		});

		it('should navigate to previous tab', () => {
			element.activeIndex = 1;
			element.previous();
			expect(element.activeIndex).toBe(0);
		});

		it('should wrap around from first to last', () => {
			element.previous();
			expect(element.activeIndex).toBe(2);
		});

		it('should navigate to first tab', () => {
			element.activeIndex = 2;
			element.first();
			expect(element.activeIndex).toBe(0);
		});

		it('should navigate to last tab', () => {
			element.last();
			expect(element.activeIndex).toBe(2);
		});
	});

	describe('Tab clicking', () => {
		beforeEach(async () => {
			element.innerHTML = `
				<h2>Tab 1</h2>
				<p>Content 1</p>
				<h2>Tab 2</h2>
				<p>Content 2</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		it('should switch tabs when clicked', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			tabs[1].click();
			expect(element.activeIndex).toBe(1);
		});

		it('should dispatch change event when tab changes', () => {
			const handler = vi.fn();
			element.addEventListener('tabbed-interface:change', handler);

			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			tabs[1].click();

			expect(handler).toHaveBeenCalled();
			expect(handler.mock.calls[0][0].detail.tabIndex).toBe(1);
		});
	});

	describe('Keyboard navigation', () => {
		beforeEach(async () => {
			element.innerHTML = `
				<h2>Tab 1</h2>
				<p>Content 1</p>
				<h2>Tab 2</h2>
				<p>Content 2</p>
				<h2>Tab 3</h2>
				<p>Content 3</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		it('should navigate with ArrowRight', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			tabs[0].dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ArrowRight' }),
			);
			// In manual mode, arrow keys move focus but don't activate
			// Need to press Enter to activate
			expect(element.activeIndex).toBe(0);
			expect(element.shadowRoot.activeElement).toBe(tabs[1]);
		});

		it('should navigate with ArrowLeft', () => {
			element.activeIndex = 1;
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			tabs[1].dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ArrowLeft' }),
			);
			// In manual mode, arrow keys move focus but don't activate
			expect(element.activeIndex).toBe(1);
			expect(element.shadowRoot.activeElement).toBe(tabs[0]);
		});

		it('should go to first with Home key', () => {
			element.activeIndex = 2;
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			tabs[2].dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Home' }),
			);
			// In manual mode, Home moves focus but doesn't activate
			expect(element.activeIndex).toBe(2);
			expect(element.shadowRoot.activeElement).toBe(tabs[0]);
		});

		it('should go to last with End key', () => {
			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
			// In manual mode, End moves focus but doesn't activate
			expect(element.activeIndex).toBe(0);
			expect(element.shadowRoot.activeElement).toBe(tabs[2]);
		});
	});

	describe('Attributes', () => {
		describe('show-headers', () => {
			it('should hide headers by default', async () => {
				element.innerHTML = `
					<h2>Tab 1</h2>
					<p>Content 1</p>
				`;
				document.body.appendChild(element);

				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => setTimeout(resolve, 0));

				const panel =
					element.shadowRoot.querySelector('[role="tabpanel"]');
				const heading = panel.querySelector('h2');
				expect(heading.classList.contains('visually-hidden')).toBe(
					true,
				);
			});

			it('should show headers when show-headers is present', async () => {
				element.setAttribute('show-headers', '');
				element.innerHTML = `
					<h2>Tab 1</h2>
					<p>Content 1</p>
				`;
				document.body.appendChild(element);

				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => setTimeout(resolve, 0));

				const panel =
					element.shadowRoot.querySelector('[role="tabpanel"]');
				const heading = panel.querySelector('h2');
				expect(heading.classList.contains('visually-hidden')).toBe(
					false,
				);
			});
		});

		describe('tablist-after', () => {
			it('should place tablist before content by default', async () => {
				element.innerHTML = `
					<h2>Tab 1</h2>
					<p>Content 1</p>
				`;
				document.body.appendChild(element);

				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => setTimeout(resolve, 0));

				const container =
					element.shadowRoot.querySelector('#container');
				const firstChild = container.firstElementChild;
				expect(firstChild.getAttribute('role')).toBe('tablist');
			});

			it('should place tablist after content when tablist-after is present', async () => {
				element.setAttribute('tablist-after', '');
				element.innerHTML = `
					<h2>Tab 1</h2>
					<p>Content 1</p>
				`;
				document.body.appendChild(element);

				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => setTimeout(resolve, 0));

				const container =
					element.shadowRoot.querySelector('#container');
				const lastChild = container.lastElementChild;
				expect(lastChild.getAttribute('role')).toBe('tablist');
			});
		});

		describe('default-tab', () => {
			it('should activate tab by index', async () => {
				element.setAttribute('default-tab', '1');
				element.innerHTML = `
					<h2>Tab 1</h2>
					<p>Content 1</p>
					<h2>Tab 2</h2>
					<p>Content 2</p>
				`;
				document.body.appendChild(element);

				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(element.activeIndex).toBe(1);
			});

			it('should activate tab by heading ID', async () => {
				element.setAttribute('default-tab', 'second');
				element.innerHTML = `
					<h2 id="first">Tab 1</h2>
					<p>Content 1</p>
					<h2 id="second">Tab 2</h2>
					<p>Content 2</p>
				`;
				document.body.appendChild(element);

				await new Promise((resolve) => requestAnimationFrame(resolve));
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(element.activeIndex).toBe(1);
			});
		});
	});

	describe('Custom tab titles', () => {
		it('should use data-tab-short-name when provided', async () => {
			element.innerHTML = `
				<h2 data-tab-short-name="Short Title">Very Long Heading Title</h2>
				<p>Content</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));

			const tab = element.shadowRoot.querySelector('[role="tab"]');
			expect(tab.textContent).toBe('Short Title');
		});

		it('should not hide header when using custom tab title', async () => {
			element.innerHTML = `
				<h2 data-tab-short-name="Short">Long Title</h2>
				<p>Content</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));

			const panel = element.shadowRoot.querySelector('[role="tabpanel"]');
			const heading = panel.querySelector('h2');
			expect(heading.classList.contains('visually-hidden')).toBe(false);
		});
	});

	describe('Multiple heading levels', () => {
		it('should work with h3 headings', async () => {
			element.innerHTML = `
				<h3>Tab 1</h3>
				<p>Content 1</p>
				<h3>Tab 2</h3>
				<p>Content 2</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));

			const tabs = element.shadowRoot.querySelectorAll('[role="tab"]');
			expect(tabs.length).toBe(2);
		});

		it('should use the first heading level found', async () => {
			element.innerHTML = `
				<h4>Tab 1</h4>
				<p>Content 1</p>
				<h4>Tab 2</h4>
				<p>Content 2</p>
			`;
			document.body.appendChild(element);

			await new Promise((resolve) => requestAnimationFrame(resolve));
			await new Promise((resolve) => setTimeout(resolve, 0));

			const panels =
				element.shadowRoot.querySelectorAll('[role="tabpanel"]');
			expect(panels[0].querySelector('h4')).toBeTruthy();
		});
	});
});
