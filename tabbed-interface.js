/**
 * TabbedInterfaceElement - A web component that transforms heading-structured content into an accessible tabbed interface
 *
 * @element tabbed-interface
 *
 * @attr {boolean} show-headers - When present, shows the heading elements within tab panels (default: absent/false)
 * @attr {boolean} tablist-after - When present, positions the tab list after the content; when absent, before the content (default: absent/false)
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
			'tablist-after',
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
	#pendingInitializationFrame = null;
	#hashListenerAttached = false;
	#onSlotChange = () => {
		if (!this.isConnected) {
			return;
		}
		this.#scheduleInitialization();
	};

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.#boundHashChange = this.#handleHashChange.bind(this);
	}

	connectedCallback() {
		this.#upgradeProperty('showHeaders');
		this.#upgradeProperty('tablistAfter');
		this.#upgradeProperty('defaultTab');
		this.#upgradeProperty('autoActivate');
		this.#upgradeProperty('activeIndex');

		this.#render();
		this.#scheduleInitialization();
	}

	disconnectedCallback() {
		if (this.#hashListenerAttached) {
			window.removeEventListener('hashchange', this.#boundHashChange);
			this.#hashListenerAttached = false;
		}

		if (this.#pendingInitializationFrame !== null) {
			cancelAnimationFrame(this.#pendingInitializationFrame);
			this.#pendingInitializationFrame = null;
		}

		this.#detachSlotListener();
		this.#resetInternalState();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue || !this.#initialized) {
			return;
		}

		switch (name) {
			case 'show-headers':
				this.#updateHeaderVisibility();
				break;
			case 'tablist-after':
				this.#updateTablistPosition();
				break;
			case 'default-tab':
				this.#applyDefaultTab();
				break;
			case 'auto-activate':
				this.#focusedIndex = this.#activeIndex;
				break;
			default:
				break;
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
	 * Whether tablist is positioned after content
	 * @returns {boolean}
	 */
	get tablistAfter() {
		// Default to false; true when attribute is present
		return this.hasAttribute('tablist-after');
	}

	set tablistAfter(value) {
		if (value) {
			this.setAttribute('tablist-after', '');
		} else {
			this.removeAttribute('tablist-after');
		}
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

	get defaultTab() {
		return this.getAttribute('default-tab');
	}

	set defaultTab(value) {
		if (value === null || value === undefined) {
			this.removeAttribute('default-tab');
			return;
		}

		const stringValue = String(value).trim();
		if (stringValue === '') {
			this.removeAttribute('default-tab');
			return;
		}

		this.setAttribute('default-tab', stringValue);
	}

	/**
	 * Navigate to the next tab
	 */
	next() {
		if (this.#tabs.length === 0) {
			return;
		}
		const nextIndex = (this.#activeIndex + 1) % this.#tabs.length;
		this.#activateTab(nextIndex);
		this.#tabs[nextIndex].focus();
	}

	/**
	 * Navigate to the previous tab
	 */
	previous() {
		if (this.#tabs.length === 0) {
			return;
		}
		const prevIndex =
			(this.#activeIndex - 1 + this.#tabs.length) % this.#tabs.length;
		this.#activateTab(prevIndex);
		this.#tabs[prevIndex].focus();
	}

	/**
	 * Navigate to the first tab
	 */
	first() {
		if (this.#tabs.length === 0) {
			return;
		}
		this.#activateTab(0);
		this.#tabs[0].focus();
	}

	/**
	 * Navigate to the last tab
	 */
	last() {
		if (this.#tabs.length === 0) {
			return;
		}
		const lastIndex = this.#tabs.length - 1;
		this.#activateTab(lastIndex);
		this.#tabs[lastIndex].focus();
	}

	#render() {
		this.#detachSlotListener();
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

				:host([tablist-after]) [role="tablist"] {
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

				:host([tablist-after]) [role="tab"] {
					border-start-start-radius: 0;
					border-start-end-radius: 0;
					border-end-start-radius: 3px;
					border-end-end-radius: 3px;
				}

				:host([tablist-after]) [role="tab"][aria-selected="true"] {
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
		if (this.#slotElement) {
			this.#slotElement.addEventListener('slotchange', this.#onSlotChange);
		}
	}

	#scheduleInitialization() {
		if (this.#pendingInitializationFrame !== null) {
			cancelAnimationFrame(this.#pendingInitializationFrame);
		}

		this.#pendingInitializationFrame = requestAnimationFrame(() => {
			this.#pendingInitializationFrame = null;
			this.#initializeTabs();

			if (this.#tabs.length === 0) {
				if (this.#hashListenerAttached) {
					window.removeEventListener('hashchange', this.#boundHashChange);
					this.#hashListenerAttached = false;
				}
				return;
			}

			if (!this.#hashListenerAttached) {
				window.addEventListener('hashchange', this.#boundHashChange);
				this.#hashListenerAttached = true;
			}

			this.#handleHashChange();
		});
	}

	#initializeTabs() {
		const container = this.shadowRoot.querySelector('#container');
		const slot = this.#slotElement;

		if (!container || !slot) {
			return;
		}

		this.#resetInternalState();

		const slottedNodes = slot.assignedNodes({ flatten: true });

		let headingTag = null;
		for (const node of slottedNodes) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const match = node.tagName.match(/^H([1-6])$/i);
				if (match) {
					headingTag = node.tagName.toLowerCase();
					break;
				}
			}
		}

		if (!headingTag) {
			container.innerHTML = '';
			slot.style.display = '';
			return;
		}

		const sections = this.#parseContentIntoSections(
			slottedNodes,
			headingTag,
		);

		if (sections.length === 0) {
			container.innerHTML = '';
			slot.style.display = '';
			return;
		}

		slot.style.display = 'none';

		const baseId = this.id || `tabbed-interface-${this.#generateId()}`;
		if (!this.id) {
			this.id = baseId;
		}

		this.#tablist = document.createElement('div');
		this.#tablist.setAttribute('role', 'tablist');
		this.#tablist.setAttribute('part', 'tablist');

		sections.forEach((section, index) => {
			const tabId = `${baseId}-tab-${index}`;
			const panelId = `${baseId}-panel-${index}`;

			const tab = document.createElement('button');
			tab.setAttribute('role', 'tab');
			tab.setAttribute('part', index === 0 ? 'tab selected' : 'tab');
			tab.setAttribute('id', tabId);
			tab.setAttribute('aria-controls', panelId);
			tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
			tab.setAttribute('tabindex', index === 0 ? '0' : '-1');

			const customTitle = section.heading.dataset.tabShortName;
			const tabTitle = customTitle || section.heading.innerHTML;
			tab.innerHTML = tabTitle;

			if (customTitle) {
				tab.setAttribute(
					'aria-label',
					section.heading.textContent.trim(),
				);
				tab.setAttribute('title', '');
			}

			this.#hasCustomTitle.push(Boolean(customTitle));

			tab.addEventListener('focus', () => {
				this.#focusedIndex = index;
				if (this.autoActivate) {
					this.#activateTab(index);
				}
			});
			tab.addEventListener('click', () => this.#activateTab(index));
			tab.addEventListener('keydown', (e) =>
				this.#handleKeydown(e, index),
			);

			this.#tablist.appendChild(tab);
			this.#tabs.push(tab);

			const panel = document.createElement('div');
			panel.setAttribute('role', 'tabpanel');
			panel.setAttribute('part', 'tabpanel');
			panel.setAttribute('id', panelId);
			panel.setAttribute('aria-labelledby', tabId);
			if (index !== 0) {
				panel.setAttribute('hidden', '');
			}

			const clonedHeading = section.heading.cloneNode(true);
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

		container.innerHTML = '';

		if (this.tablistAfter) {
			this.#tabpanels.forEach((panel) => container.appendChild(panel));
			container.appendChild(this.#tablist);
		} else {
			container.appendChild(this.#tablist);
			this.#tabpanels.forEach((panel) => container.appendChild(panel));
		}

		this.#applyDefaultTab({ force: true });
		this.#initialized = true;
		this.#focusedIndex = this.#activeIndex;
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
		if (this.#tabs.length === 0) {
			return;
		}
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
		if (this.#tabs.length === 0) {
			return;
		}
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
		if (this.#tabs.length === 0) {
			return;
		}
		if (this.autoActivate) {
			this.#activateTab(0);
		} else {
			this.#focusedIndex = 0;
		}
		this.#tabs[0].focus();
	}

	#navigateLast() {
		if (this.#tabs.length === 0) {
			return;
		}
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
				if (
					this.#tablist &&
					typeof this.#tablist.scrollIntoView === 'function'
				) {
					this.#tablist.scrollIntoView({ behavior: 'smooth' });
				}
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

		if (this.tablistAfter) {
			container.appendChild(this.#tablist);
		} else {
			container.insertBefore(this.#tablist, container.firstChild);
		}
	}

	#applyDefaultTab({ force = false } = {}) {
		if (this.#tabs.length === 0) {
			return;
		}

		if (!this.#initialized && !force) {
			return;
		}

		const defaultTab = this.getAttribute('default-tab');
		if (defaultTab === null || defaultTab === '') {
			this.#activateTab(0);
			return;
		}

		const numericIndex = Number(defaultTab);
		if (
			Number.isInteger(numericIndex) &&
			numericIndex >= 0 &&
			numericIndex < this.#tabs.length
		) {
			this.#activateTab(numericIndex);
			return;
		}

		const matchedIndex = this.#tabpanels.findIndex((panel) => {
			const heading = panel.querySelector('h1, h2, h3, h4, h5, h6');
			if (!heading) {
				return false;
			}
			const originalId = heading.dataset.originalId || heading.id || '';
			return originalId === defaultTab || heading.id === defaultTab;
		});

		if (matchedIndex !== -1) {
			this.#activateTab(matchedIndex);
		} else {
			this.#activateTab(0);
		}
	}

	#resetInternalState() {
		this.#tablist = null;
		this.#tabs = [];
		this.#tabpanels = [];
		this.#hasCustomTitle = [];
		this.#activeIndex = 0;
		this.#focusedIndex = 0;
		this.#initialized = false;
	}

	#detachSlotListener() {
		if (this.#slotElement) {
			this.#slotElement.removeEventListener('slotchange', this.#onSlotChange);
			this.#slotElement = null;
		}
	}

	#upgradeProperty(prop) {
		if (Object.prototype.hasOwnProperty.call(this, prop)) {
			const value = this[prop];
			delete this[prop];
			this[prop] = value;
		}
	}

	// eslint-disable-next-line class-methods-use-this
	#generateId() {
		return Math.random().toString(36).substring(2, 9);
	}
}
