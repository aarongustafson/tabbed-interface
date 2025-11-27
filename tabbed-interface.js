/**
 * TabbedInterfaceElement - A web component that transforms heading-structured content into an accessible tabbed interface
 *
 * @element tabbed-interface
 *
 * @attr {boolean} hide-headers - When true, hides the heading elements within tab panels (default: true)
 * @attr {string} tablist-position - Position of the tab list: "before" (default) or "after" the content
 * @attr {string} default-tab - Index or heading ID of the tab to show by default (defaults to first tab)
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
		return ['hide-headers', 'tablist-position', 'default-tab'];
	}

	#tablist = null;
	#tabs = [];
	#tabpanels = [];
	#activeIndex = 0;
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
			if (name === 'hide-headers') {
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
	 * Whether to hide headers in tab panels
	 * @returns {boolean}
	 */
	get hideHeaders() {
		const attr = this.getAttribute('hide-headers');
		// Default to true unless explicitly set to "false"
		return attr !== 'false';
	}

	set hideHeaders(value) {
		this.setAttribute('hide-headers', value ? 'true' : 'false');
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
					font-family: var(--tabbed-interface-font-family, inherit);
				}

				[role="tablist"] {
					display: var(--tabbed-interface-tablist-display, flex);
					gap: var(--tabbed-interface-tablist-gap, 0);
					padding: var(--tabbed-interface-tablist-padding, 0);
					margin: var(--tabbed-interface-tablist-margin, 0);
					background: var(--tabbed-interface-tablist-background, transparent);
					border: var(--tabbed-interface-tablist-border, none);
					list-style: none;
				}

				[role="tab"] {
					padding: var(--tabbed-interface-tab-padding, 0.5em 1em);
					background: var(--tabbed-interface-tab-background, transparent);
					color: var(--tabbed-interface-tab-color, inherit);
					border: var(--tabbed-interface-tab-border, 1px solid #ccc);
					border-radius: var(--tabbed-interface-tab-border-radius, 0);
					cursor: pointer;
					font: inherit;
					text-align: center;
				}

				[role="tab"]:hover {
					background: var(--tabbed-interface-tab-hover-background, #f0f0f0);
					color: var(--tabbed-interface-tab-hover-color, inherit);
				}

				[role="tab"]:focus {
					outline: var(--tabbed-interface-tab-focus-outline, 2px solid #005fcc);
					outline-offset: -2px;
				}

				[role="tab"][aria-selected="true"] {
					background: var(--tabbed-interface-tab-active-background, #fff);
					color: var(--tabbed-interface-tab-active-color, inherit);
				}

				[role="tabpanel"] {
					padding: var(--tabbed-interface-tabpanel-padding, 1em);
					background: var(--tabbed-interface-tabpanel-background, transparent);
					border: var(--tabbed-interface-tabpanel-border, 1px solid #ccc);
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
			tab.setAttribute('id', tabId);
			tab.setAttribute('aria-controls', panelId);
			tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
			tab.setAttribute('tabindex', index === 0 ? '0' : '-1');

			// Get tab title from data attribute or heading content
			const customTitle = section.heading.dataset.tabTitle;
			const tabTitle = customTitle || section.heading.innerHTML;
			tab.innerHTML = tabTitle;

			// Track whether this tab has a custom title
			this.#hasCustomTitle.push(Boolean(customTitle));

			// Add thumbnail if specified
			const thumbnail = section.heading.dataset.tabThumbnail;
			if (thumbnail) {
				const img = document.createElement('img');
				img.src = thumbnail;
				img.alt = '';
				img.className = 'tab-thumbnail';
				tab.appendChild(document.createTextNode(' '));
				tab.appendChild(img);
			}

			// Event listeners
			tab.addEventListener('click', () => this.#activateTab(index));
			tab.addEventListener('keydown', (e) => this.#handleKeydown(e));

			this.#tablist.appendChild(tab);
			this.#tabs.push(tab);

			// Create tabpanel
			const panel = document.createElement('div');
			panel.setAttribute('role', 'tabpanel');
			panel.setAttribute('id', panelId);
			panel.setAttribute('aria-labelledby', tabId);
			panel.setAttribute('tabindex', '0');
			if (index !== 0) {
				panel.setAttribute('hidden', '');
			}

			// Clone heading and content into panel
			const clonedHeading = section.heading.cloneNode(true);
			// Store reference to original heading for ID lookups
			clonedHeading.dataset.originalId = section.heading.id || '';

			if (this.hideHeaders && !section.heading.dataset.tabTitle) {
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
		}
		if (this.#tabpanels[this.#activeIndex]) {
			this.#tabpanels[this.#activeIndex].setAttribute('hidden', '');
		}

		// Activate new tab
		this.#activeIndex = index;
		this.#tabs[index].setAttribute('aria-selected', 'true');
		this.#tabs[index].setAttribute('tabindex', '0');
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

	#handleKeydown(event) {
		const key = event.key;

		switch (key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				this.previous();
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				this.next();
				break;
			case 'Home':
				event.preventDefault();
				this.first();
				break;
			case 'End':
				event.preventDefault();
				this.last();
				break;
			case 'Enter':
				event.preventDefault();
				// Focus the active panel
				this.#tabpanels[this.#activeIndex].focus();
				break;
			case 'Escape':
				event.preventDefault();
				event.target.blur();
				break;
		}
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
		const hideHeaders = this.hideHeaders;

		this.#tabpanels.forEach((panel, index) => {
			const heading = panel.querySelector('h1, h2, h3, h4, h5, h6');
			if (heading) {
				// If there's a custom tab title, always show the heading in the panel
				const hasCustomTitle = this.#hasCustomTitle[index];

				if (hideHeaders && !hasCustomTitle) {
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
