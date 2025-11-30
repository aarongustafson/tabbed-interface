/**
 * TabbedInterfaceElement - A web component that transforms heading-structured content into an accessible tabbed interface
 *
 * @element tabbed-interface
 *
 * @attr {boolean} show-headers - When present, shows the heading elements within tab panels (default: absent/false)
 * @attr {string} tablist-position - Position of the tab list: "before" (default) or "after" the content
 * @attr {string} default-tab - Index or heading ID of the tab to show by default (defaults to first tab)
 * @attr {boolean} auto-activate - When present, tabs activate on focus; when absent, use Enter/Space to activate (default: absent/false)
 *
 * @slot - Default slot for content with heading elements (h1-h6) that define tab sections
 *
 * @cssprop --tabbed-interface-font-family - Font family for the component
 * @cssprop --tabbed-interface-tablist-display - Display property for tablist (default: flex)
 * @cssprop --tabbed-interface-tablist-gap - Gap between tabs (default: 0)
 * @cssprop --tabbed-interface-tablist-padding - Padding for tablist (default: 0)
 * @cssprop --tabbed-interface-tablist-margin - Margin for tablist (default: 0)
 * @cssprop --tabbed-interface-tablist-background - Background color for tablist
 * @cssprop --tabbed-interface-tablist-border - Border for tablist
 * @cssprop --tabbed-interface-tab-padding - Padding for tabs (default: 0.5em 1em)
 * @cssprop --tabbed-interface-tab-background - Background color for tabs
 * @cssprop --tabbed-interface-tab-color - Text color for tabs
 * @cssprop --tabbed-interface-tab-border - Border for tabs
 * @cssprop --tabbed-interface-tab-border-radius - Border radius for tabs
 * @cssprop --tabbed-interface-tab-active-background - Background color for active tab
 * @cssprop --tabbed-interface-tab-active-color - Text color for active tab
 * @cssprop --tabbed-interface-tab-hover-background - Background color for hovered tab
 * @cssprop --tabbed-interface-tab-hover-color - Text color for hovered tab
 * @cssprop --tabbed-interface-tab-focus-outline - Focus outline for tabs
 * @cssprop --tabbed-interface-tabpanel-padding - Padding for tab panels
 * @cssprop --tabbed-interface-tabpanel-background - Background color for tab panels
 * @cssprop --tabbed-interface-tabpanel-border - Border for tab panels
 *
 * @fires tabbed-interface:change - Fired when the active tab changes, with detail { tabId, tabpanelId, tabIndex }
 */
export class TabbedInterfaceElement extends HTMLElement {
	static get observedAttributes() {
		return [
			'show-headers',
			'tablist-position',
			'default-tab',
			'auto-activate',
		];
	}

	#tablist = null;
	#tabs = [];
	#tabpanels = [];
	#activeIndex = 0;
	#focusedIndex = 0;
	#initialized = false;
	#slotElement = null;
	#boundHashChange = null;
	#hasCustomTitle = [];

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.#boundHashChange = this.#handleHashChange.bind(this);
	}

	connectedCallback() {
		this.#render();
		// Wait for content to be available
		requestAnimationFrame(() => {
			this.#initializeTabs();
			// Listen for hash changes
			window.addEventListener('hashchange', this.#boundHashChange);
			// Check initial hash
			this.#handleHashChange();
		});
	}

	disconnectedCallback() {
		window.removeEventListener('hashchange', this.#boundHashChange);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue && this.#initialized) {
			if (name === 'show-headers') {
				this.#updateHeaderVisibility();
			} else if (name === 'tablist-position') {
				this.#updateTablistPosition();
			}
		}
	}

	/**
	 * Gets the current active tab index
	 * @returns {number} The active tab index
	 */
	get activeIndex() {
		return this.#activeIndex;
	}

	/**
	 * Sets the active tab by index
	 * @param {number} index - The tab index to activate
	 */
	set activeIndex(index) {
		if (index >= 0 && index < this.#tabs.length) {
			this.#activateTab(index);
		}
	}

	/**
	 * Whether to show headers in tab panels
	 * @returns {boolean}
	 */
	get showHeaders() {
		// Default to false; true when attribute is present
		return this.hasAttribute('show-headers');
	}

	set showHeaders(value) {
		if (value) {
			this.setAttribute('show-headers', '');
		} else {
			this.removeAttribute('show-headers');
		}
	}

	/**
	 * Position of the tablist
	 * @returns {string} "before" or "after"
	 */
	get tablistPosition() {
		return this.getAttribute('tablist-position') || 'before';
	}

	set tablistPosition(value) {
		this.setAttribute('tablist-position', value);
	}

	/**
	 * Whether tabs auto-activate on focus
	 * @returns {boolean}
	 */
	get autoActivate() {
		// Default to false; true when attribute is present
		return this.hasAttribute('auto-activate');
	}

	set autoActivate(value) {
		if (value) {
			this.setAttribute('auto-activate', '');
		} else {
			this.removeAttribute('auto-activate');
		}
	}

	/**
	 * Navigate to the next tab
	 */
	next() {
		const nextIndex = (this.#activeIndex + 1) % this.#tabs.length;
		this.#activateTab(nextIndex);
		this.#tabs[nextIndex].focus();
	}

	/**
	 * Navigate to the previous tab
	 */
	previous() {
		const prevIndex =
			(this.#activeIndex - 1 + this.#tabs.length) % this.#tabs.length;
		this.#activateTab(prevIndex);
		this.#tabs[prevIndex].focus();
	}

	/**
	 * Navigate to the first tab
	 */
	first() {
		this.#activateTab(0);
		this.#tabs[0].focus();
	}

	/**
	 * Navigate to the last tab
	 */
	last() {
		const lastIndex = this.#tabs.length - 1;
		this.#activateTab(lastIndex);
		this.#tabs[lastIndex].focus();
	}

	#render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}

				[role="tablist"] {
					display: flex;
					gap: -1px;
					padding: 0;
					margin: 0;
					margin-block-end: -1px;
					background: transparent;
					border: none;
					list-style: none;
					scroll-margin-block-start: 2rem;
				}

				:host([tablist-position="after"]) [role="tablist"] {
					margin-block-start: -1px;
					margin-block-end: 0;
				}

				[role="tab"] {
					padding: 0.5em 1em;
					background-color: ButtonFace;
					color: ButtonText;
					border: 1px solid ButtonBorder;
					border-radius: 0;
					border-start-start-radius: 3px;
					border-start-end-radius: 3px;
					cursor: pointer;
					font: inherit;
					text-align: center;
				}

				[role="tab"]:hover,
				[role="tab"]:focus {
					background: ButtonFace;
					color: inherit;
				}

				[role="tab"]:focus-visible {
					outline: 2px solid AccentColor;
					outline-offset: 1px;
				}

				[role="tab"][aria-selected="true"] {
					background: Canvas;
					border-block-end-color: Canvas;
					color: CanvasText;
				}

				:host([tablist-position="after"]) [role="tab"] {
					border-start-start-radius: 0;
					border-start-end-radius: 0;
					border-end-start-radius: 3px;
					border-end-end-radius: 3px;
				}

				:host([tablist-position="after"]) [role="tab"][aria-selected="true"] {
					border-block-start-color: Canvas;
					border-block-end-color: ButtonBorder;
				}

				[role="tabpanel"] {
					padding: 1em;
					background: transparent;
					border: 1px solid ButtonBorder;
				}

				[role="tabpanel"][hidden] {
					display: none;
				}

				.visually-hidden {
					position: absolute;
					width: 1px;
					height: 1px;
					padding: 0;
					margin: -1px;
					overflow: hidden;
					clip: rect(0, 0, 0, 0);
					white-space: nowrap;
					border: 0;
				}

				#container {
					display: contents;
				}
			</style>
			<div id="container"></div>
			<slot style="display: none;"></slot>
		`;

		this.#slotElement = this.shadowRoot.querySelector('slot');
	}

	#initializeTabs() {
		const container = this.shadowRoot.querySelector('#container');
		const slot = this.#slotElement;

		// Get slotted content
		const slottedNodes = slot.assignedNodes({ flatten: true });

		// Find the first heading to determine the heading level
		let headingLevel = null;
		let headingTag = null;

		for (const node of slottedNodes) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const match = node.tagName.match(/^H([1-6])$/i);
				if (match) {
					headingLevel = parseInt(match[1], 10);
					headingTag = node.tagName.toLowerCase();
					break;
				}
			}
		}

		// If no heading found, don't transform
		if (!headingTag) {
			container.innerHTML = '<slot></slot>';
			this.shadowRoot.querySelector('slot[style]').remove();
			return;
		}

		// Parse the content into sections based on headings
		const sections = this.#parseContentIntoSections(
			slottedNodes,
			headingTag,
		);

		if (sections.length === 0) {
			container.innerHTML = '<slot></slot>';
			this.shadowRoot.querySelector('slot[style]').remove();
			return;
		}

		// Generate unique ID base
		const baseId = this.id || `tabbed-interface-${this.#generateId()}`;
		if (!this.id) {
			this.id = baseId;
		}

		// Create tablist
		this.#tablist = document.createElement('div');
		this.#tablist.setAttribute('role', 'tablist');
		this.#tablist.setAttribute('part', 'tablist');

		// Create tabs and panels
		this.#tabs = [];
		this.#tabpanels = [];
		this.#hasCustomTitle = [];

		sections.forEach((section, index) => {
			const tabId = `${baseId}-tab-${index}`;
			const panelId = `${baseId}-panel-${index}`;

			// Create tab
			const tab = document.createElement('button');
			tab.setAttribute('role', 'tab');
			tab.setAttribute('part', index === 0 ? 'tab selected' : 'tab');
			tab.setAttribute('id', tabId);
			tab.setAttribute('aria-controls', panelId);
			tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
			tab.setAttribute('tabindex', index === 0 ? '0' : '-1');

			// Get tab title from data attribute or heading content
			const customTitle = section.heading.dataset.tabShortName;
			const tabTitle = customTitle || section.heading.innerHTML;
			tab.innerHTML = tabTitle;

			// If using short name, set aria-label to full text and hide the title
			if (customTitle) {
				tab.setAttribute(
					'aria-label',
					section.heading.textContent.trim(),
				);
				tab.setAttribute('title', '');
			}

			// Track whether this tab has a custom title
			this.#hasCustomTitle.push(Boolean(customTitle));

			// Event listeners
			if (this.autoActivate) {
				tab.addEventListener('focus', () => this.#activateTab(index));
			} else {
				tab.addEventListener('click', () => this.#activateTab(index));
			}
			tab.addEventListener('keydown', (e) =>
				this.#handleKeydown(e, index),
			);

			this.#tablist.appendChild(tab);
			this.#tabs.push(tab);

			// Create tabpanel
			const panel = document.createElement('div');
			panel.setAttribute('role', 'tabpanel');
			panel.setAttribute('part', 'tabpanel');
			panel.setAttribute('id', panelId);
			panel.setAttribute('aria-labelledby', tabId);
			// Tabpanels are not focusable themselves
			if (index !== 0) {
				panel.setAttribute('hidden', '');
			}

			// Clone heading and content into panel
			const clonedHeading = section.heading.cloneNode(true);
			// Store reference to original heading for ID lookups
			clonedHeading.dataset.originalId = section.heading.id || '';

			if (!this.showHeaders && !section.heading.dataset.tabShortName) {
				clonedHeading.classList.add('visually-hidden');
			}

			panel.appendChild(clonedHeading);

			section.content.forEach((node) => {
				panel.appendChild(node.cloneNode(true));
			});

			this.#tabpanels.push(panel);
		});

		// Assemble the component
		container.innerHTML = '';

		if (this.tablistPosition === 'after') {
			this.#tabpanels.forEach((panel) => container.appendChild(panel));
			container.appendChild(this.#tablist);
		} else {
			container.appendChild(this.#tablist);
			this.#tabpanels.forEach((panel) => container.appendChild(panel));
		}

		// Check for default tab
		const defaultTab = this.getAttribute('default-tab');
		if (defaultTab !== null) {
			const index = parseInt(defaultTab, 10);
			if (!isNaN(index) && index >= 0 && index < this.#tabs.length) {
				this.#activateTab(index);
			} else {
				// Try to find by heading ID
				const targetIndex = sections.findIndex(
					(s) => s.heading.id === defaultTab,
				);
				if (targetIndex !== -1) {
					this.#activateTab(targetIndex);
				}
			}
		}

		this.#initialized = true;
	}

	// eslint-disable-next-line class-methods-use-this
	#parseContentIntoSections(nodes, headingTag) {
		const sections = [];
		let currentSection = null;

		for (const node of nodes) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				if (node.tagName.toLowerCase() === headingTag) {
					// Start a new section
					if (currentSection) {
						sections.push(currentSection);
					}
					currentSection = {
						heading: node,
						content: [],
					};
				} else if (currentSection) {
					currentSection.content.push(node);
				}
			} else if (
				node.nodeType === Node.TEXT_NODE &&
				node.textContent.trim() &&
				currentSection
			) {
				// Wrap text nodes in a span
				const span = document.createElement('span');
				span.textContent = node.textContent;
				currentSection.content.push(span);
			}
		}

		// Don't forget the last section
		if (currentSection) {
			sections.push(currentSection);
		}

		return sections;
	}

	#activateTab(index) {
		if (index < 0 || index >= this.#tabs.length) return;
		if (index === this.#activeIndex && this.#initialized) return;

		// Deactivate current tab
		if (this.#tabs[this.#activeIndex]) {
			this.#tabs[this.#activeIndex].setAttribute(
				'aria-selected',
				'false',
			);
			this.#tabs[this.#activeIndex].setAttribute('tabindex', '-1');
			this.#tabs[this.#activeIndex].setAttribute('part', 'tab');
		}
		if (this.#tabpanels[this.#activeIndex]) {
			this.#tabpanels[this.#activeIndex].setAttribute('hidden', '');
		}

		// Activate new tab
		this.#activeIndex = index;
		this.#focusedIndex = index;
		this.#tabs[index].setAttribute('aria-selected', 'true');
		this.#tabs[index].setAttribute('tabindex', '0');
		this.#tabs[index].setAttribute('part', 'tab selected');
		this.#tabpanels[index].removeAttribute('hidden');

		// Dispatch change event
		this.dispatchEvent(
			new CustomEvent('tabbed-interface:change', {
				detail: {
					tabId: this.#tabs[index].id,
					tabpanelId: this.#tabpanels[index].id,
					tabIndex: index,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	#handleKeydown(event, tabIndex) {
		const key = event.key;

		switch (key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				this.#navigatePrevious();
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				this.#navigateNext();
				break;
			case 'Home':
				event.preventDefault();
				this.#navigateFirst();
				break;
			case 'End':
				event.preventDefault();
				this.#navigateLast();
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				// If auto-activate is disabled, activate the tab on Enter/Space
				if (!this.autoActivate) {
					this.#activateTab(this.#focusedIndex);
				}
				// Focus the first focusable element in the active panel
				const panel = this.#tabpanels[this.#activeIndex];
				const focusable = panel.querySelector(
					'a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])',
				);
				if (focusable) {
					focusable.focus();
				}
				break;
		}
	}

	#navigateNext() {
		const currentFocus = this.autoActivate
			? this.#activeIndex
			: this.#focusedIndex;
		const nextIndex = (currentFocus + 1) % this.#tabs.length;
		if (this.autoActivate) {
			this.#activateTab(nextIndex);
		} else {
			this.#focusedIndex = nextIndex;
		}
		this.#tabs[nextIndex].focus();
	}

	#navigatePrevious() {
		const currentFocus = this.autoActivate
			? this.#activeIndex
			: this.#focusedIndex;
		const prevIndex =
			(currentFocus - 1 + this.#tabs.length) % this.#tabs.length;
		if (this.autoActivate) {
			this.#activateTab(prevIndex);
		} else {
			this.#focusedIndex = prevIndex;
		}
		this.#tabs[prevIndex].focus();
	}

	#navigateFirst() {
		if (this.autoActivate) {
			this.#activateTab(0);
		} else {
			this.#focusedIndex = 0;
		}
		this.#tabs[0].focus();
	}

	#navigateLast() {
		const lastIndex = this.#tabs.length - 1;
		if (this.autoActivate) {
			this.#activateTab(lastIndex);
		} else {
			this.#focusedIndex = lastIndex;
		}
		this.#tabs[lastIndex].focus();
	}

	#handleHashChange() {
		const hash = window.location.hash;
		if (!hash || !this.#initialized) return;

		const targetId = hash.slice(1);

		// Look for a heading with this ID in the tabpanels
		for (let i = 0; i < this.#tabpanels.length; i++) {
			const panel = this.#tabpanels[i];
			const heading = panel.querySelector('h1, h2, h3, h4, h5, h6');
			if (
				heading &&
				(heading.id === targetId ||
					heading.dataset.originalId === targetId)
			) {
				this.#activateTab(i);
				// Scroll to the tablist
				this.#tablist.scrollIntoView({ behavior: 'smooth' });
				return;
			}
		}
	}

	#updateHeaderVisibility() {
		const showHeaders = this.showHeaders;

		this.#tabpanels.forEach((panel, index) => {
			const heading = panel.querySelector('h1, h2, h3, h4, h5, h6');
			if (heading) {
				// If there's a custom tab title, always show the heading in the panel
				const hasCustomTitle = this.#hasCustomTitle[index];

				if (!showHeaders && !hasCustomTitle) {
					heading.classList.add('visually-hidden');
				} else {
					heading.classList.remove('visually-hidden');
				}
			}
		});
	}

	#updateTablistPosition() {
		const container = this.shadowRoot.querySelector('#container');
		if (!container || !this.#tablist) return;

		// Remove tablist from current position
		this.#tablist.remove();

		if (this.tablistPosition === 'after') {
			container.appendChild(this.#tablist);
		} else {
			container.insertBefore(this.#tablist, container.firstChild);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	#generateId() {
		return Math.random().toString(36).substring(2, 9);
	}
}
