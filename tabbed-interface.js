/**
 * TabbedInterfaceElement - A web component that transforms heading-structured content into an accessible tabbed interface
 *
 * @element tabbed-interface
 *
 * @attr {boolean} show-headers - When present, shows the heading elements within tab panels (default: absent/false)
 * @attr {boolean} tablist-after - When present, positions the tab list after the content; when absent, before the content (default: absent/false)
 * @attr {string} default-tab - Index or heading ID of the tab to show by default (defaults to first tab)
 * @attr {boolean} auto-activate - When present, tabs activate on focus; when absent, use Enter/Space to activate (default: absent/false)
 * @attr {boolean} fixed-tabs - When present, keeps the tabbed presentation even when the tablist does not fit
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
			'fixed-tabs',
		];
	}

	#tablist = null;
	#tabs = [];
	#tabpanels = [];
	#panelSlots = [];
	#sections = [];
	#activeIndex = 0;
	#focusedIndex = 0;
	#initialized = false;
	#boundHashChange = null;
	#boundBeforePrint = null;
	#boundAfterPrint = null;
	#hasCustomTitle = [];
	#pendingInitializationFrame = null;
	#pendingLayoutFrame = null;
	#hashListenerAttached = false;
	#resizeObserver = null;
	#contentObserver = null;
	#measurement = null;
	#measurementTablist = null;
	#measurementTabs = [];
	#layout = null;
	#printing = false;
	#managedHostTabIndex = false;
	#restoreTabFocus = false;
	#onFontsChanged = () => this.#scheduleLayoutEvaluation();

	constructor() {
		super();
		this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
		this.#boundHashChange = this.#handleHashChange.bind(this);
		this.#boundBeforePrint = this.#handleBeforePrint.bind(this);
		this.#boundAfterPrint = this.#handleAfterPrint.bind(this);
	}

	connectedCallback() {
		this.#upgradeProperty('showHeaders');
		this.#upgradeProperty('tablistAfter');
		this.#upgradeProperty('defaultTab');
		this.#upgradeProperty('autoActivate');
		this.#upgradeProperty('activeIndex');
		this.#upgradeProperty('fixedTabs');

		this.#render();
		this.#observeContent();
		this.#observeSize();
		document.fonts?.addEventListener('loadingdone', this.#onFontsChanged);
		document.fonts?.ready.then(() => {
			if (this.isConnected) {
				this.#scheduleLayoutEvaluation();
			}
		});
		window.addEventListener('beforeprint', this.#boundBeforePrint);
		window.addEventListener('afterprint', this.#boundAfterPrint);
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

		if (this.#pendingLayoutFrame !== null) {
			cancelAnimationFrame(this.#pendingLayoutFrame);
			this.#pendingLayoutFrame = null;
		}

		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
		this.#contentObserver?.disconnect();
		this.#contentObserver = null;
		document.fonts?.removeEventListener(
			'loadingdone',
			this.#onFontsChanged,
		);
		window.removeEventListener('beforeprint', this.#boundBeforePrint);
		window.removeEventListener('afterprint', this.#boundAfterPrint);
		if (
			this.#managedHostTabIndex &&
			this.getAttribute('tabindex') === '-1'
		) {
			this.removeAttribute('tabindex');
		}
		this.#managedHostTabIndex = false;
		this.#restoreTabFocus = false;
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
			case 'fixed-tabs':
				this.#scheduleLayoutEvaluation();
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

	/**
	 * Whether the component should remain tabbed when its tabs do not fit
	 * @returns {boolean}
	 */
	get fixedTabs() {
		return this.hasAttribute('fixed-tabs');
	}

	set fixedTabs(value) {
		if (value) {
			this.setAttribute('fixed-tabs', '');
		} else {
			this.removeAttribute('fixed-tabs');
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
		if (this.#layout === 'tabs') {
			this.#tabs[nextIndex].focus();
		}
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
		if (this.#layout === 'tabs') {
			this.#tabs[prevIndex].focus();
		}
	}

	/**
	 * Navigate to the first tab
	 */
	first() {
		if (this.#tabs.length === 0) {
			return;
		}
		this.#activateTab(0);
		if (this.#layout === 'tabs') {
			this.#tabs[0].focus();
		}
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
		if (this.#layout === 'tabs') {
			this.#tabs[lastIndex].focus();
		}
	}

	#render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					color: inherit;
					font-family: var(--tabbed-interface-font-family, inherit);
				}

				[data-tablist] {
					display: var(--tabbed-interface-tablist-display, flex);
					flex-wrap: nowrap;
					gap: var(--tabbed-interface-tablist-gap, 0);
					padding: var(--tabbed-interface-tablist-padding, 0);
					margin: var(--tabbed-interface-tablist-margin, 0);
					margin-block-end: -1px;
					background: var(--tabbed-interface-tablist-background, transparent);
					border: var(--tabbed-interface-tablist-border, none);
					list-style: none;
					scroll-margin-block-start: 2rem;
				}

				:host([tablist-after]) [data-tablist] {
					margin-block-start: -1px;
					margin-block-end: 0;
				}

				[data-tab] {
					min-inline-size: 0;
					padding: var(--tabbed-interface-tab-padding, 0.5em 1em);
					background-color: var(--tabbed-interface-tab-background, ButtonFace);
					color: var(--tabbed-interface-tab-color, ButtonText);
					border: var(--tabbed-interface-tab-border, 1px solid ButtonBorder);
					border-radius: var(--tabbed-interface-tab-border-radius, 0);
					border-start-start-radius: 3px;
					border-start-end-radius: 3px;
					cursor: pointer;
					font: inherit;
					text-align: center;
					white-space: normal;
				}

				[data-tab]:hover,
				[data-tab]:focus {
					background: var(--tabbed-interface-tab-hover-background, ButtonFace);
					color: var(--tabbed-interface-tab-hover-color, inherit);
				}

				[data-tab]:focus-visible {
					outline: var(--tabbed-interface-tab-focus-outline, 2px solid AccentColor);
					outline-offset: 1px;
				}

				[data-tab][aria-selected="true"] {
					background: var(--tabbed-interface-tab-active-background, Canvas);
					border-block-end-color: Canvas;
					color: var(--tabbed-interface-tab-active-color, CanvasText);
				}

				:host([tablist-after]) [data-tab] {
					border-start-start-radius: 0;
					border-start-end-radius: 0;
					border-end-start-radius: 3px;
					border-end-end-radius: 3px;
				}

				:host([tablist-after]) [data-tab][aria-selected="true"] {
					border-block-start-color: Canvas;
					border-block-end-color: ButtonBorder;
				}

				[data-panel] {
					padding: var(--tabbed-interface-tabpanel-padding, 1em);
					background: var(--tabbed-interface-tabpanel-background, transparent);
					border: var(--tabbed-interface-tabpanel-border, 1px solid ButtonBorder);
					color: inherit;
				}

				[data-panel][hidden] {
					display: none;
				}

				#presentation[data-layout="tabs"] slot[data-hide-heading]::slotted(h1),
				#presentation[data-layout="tabs"] slot[data-hide-heading]::slotted(h2),
				#presentation[data-layout="tabs"] slot[data-hide-heading]::slotted(h3),
				#presentation[data-layout="tabs"] slot[data-hide-heading]::slotted(h4),
				#presentation[data-layout="tabs"] slot[data-hide-heading]::slotted(h5),
				#presentation[data-layout="tabs"] slot[data-hide-heading]::slotted(h6) {
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

				#presentation {
					display: block;
					inline-size: 100%;
				}

				#presentation[data-layout="linear"] [data-tablist] {
					display: none;
				}

				#presentation[data-layout="linear"] [data-panel] {
					padding: 0;
					background: transparent;
					border: 0;
				}

				#measurement {
					position: fixed;
					inset-block-start: 0;
					inset-inline-start: -100000px;
					visibility: hidden;
					pointer-events: none;
					overflow: visible;
				}

				#measurement [data-tablist] {
					margin: 0;
				}

				@media print {
					#presentation [data-tablist] {
						display: none;
					}

					#presentation [data-panel] {
						padding: 0;
						background: transparent;
						border: 0;
					}

					#measurement {
						display: none;
					}
				}
			</style>
			<div id="presentation" data-layout="linear">
				<slot id="fallback"></slot>
			</div>
			<div id="measurement" aria-hidden="true" inert></div>
		`;

		this.shadowRoot
			.querySelector('#fallback')
			?.assign(
				...TabbedInterfaceElement.#getSlottableNodes(
					Array.from(this.childNodes),
				),
			);
		this.#measurement = this.shadowRoot.querySelector('#measurement');
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
					window.removeEventListener(
						'hashchange',
						this.#boundHashChange,
					);
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
		const presentation = this.shadowRoot.querySelector('#presentation');
		if (!presentation) {
			return;
		}

		const previousActiveIndex = this.#initialized
			? this.#activeIndex
			: null;
		this.#resetInternalState();

		const sourceNodes = Array.from(this.childNodes);

		let headingTag = null;
		for (const node of sourceNodes) {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const match = node.tagName.match(/^H([1-6])$/i);
				if (match) {
					headingTag = node.tagName.toLowerCase();
					break;
				}
			}
		}

		if (!headingTag) {
			presentation.innerHTML = '<slot id="fallback"></slot>';
			presentation
				.querySelector('#fallback')
				?.assign(
					...TabbedInterfaceElement.#getSlottableNodes(sourceNodes),
				);
			return;
		}

		const sections = this.#parseContentIntoSections(
			sourceNodes,
			headingTag,
		);

		if (sections.length === 0) {
			presentation.innerHTML = '<slot id="fallback"></slot>';
			presentation
				.querySelector('#fallback')
				?.assign(
					...TabbedInterfaceElement.#getSlottableNodes(sourceNodes),
				);
			return;
		}

		this.#sections = sections;
		presentation.innerHTML = '';

		const baseId = this.id || `tabbed-interface-${this.#generateId()}`;
		if (!this.id) {
			this.id = baseId;
		}

		this.#tablist = document.createElement('div');
		this.#tablist.setAttribute('role', 'tablist');
		this.#tablist.setAttribute('part', 'tablist');
		this.#tablist.setAttribute('data-tablist', '');

		sections.forEach((section, index) => {
			const tabId = `${baseId}-tab-${index}`;
			const panelId = `${baseId}-panel-${index}`;

			const tab = document.createElement('button');
			tab.setAttribute('role', 'tab');
			tab.setAttribute('data-tab', '');
			tab.setAttribute('part', index === 0 ? 'tab selected' : 'tab');
			tab.setAttribute('id', tabId);
			tab.setAttribute('aria-controls', panelId);
			tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
			tab.setAttribute('tabindex', index === 0 ? '0' : '-1');

			const customTitle = section.heading.dataset.tabShortName;
			const tabTitle = customTitle || section.heading.textContent.trim();
			tab.textContent = tabTitle;

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
			panel.setAttribute('data-panel', '');
			panel.setAttribute('id', panelId);
			panel.setAttribute('aria-labelledby', tabId);
			if (index !== 0) {
				panel.setAttribute('hidden', '');
			}

			const panelSlot = document.createElement('slot');
			panelSlot.setAttribute('data-panel-slot', String(index));
			panelSlot.assign(section.heading, ...section.content);
			panel.appendChild(panelSlot);

			this.#tabpanels.push(panel);
			this.#panelSlots.push(panelSlot);
		});

		if (this.tablistAfter) {
			this.#tabpanels.forEach((panel) => presentation.appendChild(panel));
			presentation.appendChild(this.#tablist);
		} else {
			presentation.appendChild(this.#tablist);
			this.#tabpanels.forEach((panel) => presentation.appendChild(panel));
		}

		if (
			previousActiveIndex !== null &&
			previousActiveIndex < this.#tabs.length
		) {
			this.#activateTab(previousActiveIndex);
		} else {
			this.#applyDefaultTab({ force: true });
		}
		this.#initialized = true;
		this.#focusedIndex = this.#activeIndex;
		this.#updateHeaderVisibility();
		this.#buildMeasurementTablist();
		this.#applyLayout('linear');
		this.#scheduleLayoutEvaluation();
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
				currentSection.content.push(node);
			}
		}

		// Don't forget the last section
		if (currentSection) {
			sections.push(currentSection);
		}

		return sections;
	}

	// Manual slots accept only elements and text nodes.
	static #getSlottableNodes(nodes) {
		return nodes.filter(
			(node) =>
				node.nodeType === Node.ELEMENT_NODE ||
				node.nodeType === Node.TEXT_NODE,
		);
	}

	#observeContent() {
		this.#contentObserver?.disconnect();
		this.#contentObserver = new MutationObserver((mutations) => {
			let needsInitialization = false;
			let needsLayout = false;

			for (const mutation of mutations) {
				if (mutation.target === this) {
					if (
						mutation.type === 'attributes' &&
						['class', 'style'].includes(mutation.attributeName)
					) {
						needsLayout = true;
					} else if (mutation.type === 'childList') {
						needsInitialization = true;
					}
					continue;
				}

				const target =
					mutation.target.nodeType === Node.ELEMENT_NODE
						? mutation.target
						: mutation.target.parentElement;
				const headingChanged = this.#sections.some(
					(section) =>
						target === section.heading ||
						section.heading.contains(target),
				);

				if (
					headingChanged &&
					(mutation.type !== 'attributes' ||
						['data-tab-short-name', 'id'].includes(
							mutation.attributeName,
						))
				) {
					needsInitialization = true;
				}
			}

			if (needsInitialization) {
				this.#scheduleInitialization();
			} else if (needsLayout) {
				this.#scheduleLayoutEvaluation();
			}
		});
		this.#contentObserver.observe(this, {
			attributes: true,
			attributeFilter: ['class', 'data-tab-short-name', 'id', 'style'],
			characterData: true,
			childList: true,
			subtree: true,
		});
	}

	#observeSize() {
		this.#resizeObserver?.disconnect();
		if (typeof ResizeObserver !== 'function') {
			return;
		}

		this.#resizeObserver = new ResizeObserver(() => {
			this.#scheduleLayoutEvaluation();
		});
		this.#resizeObserver.observe(this);
	}

	#buildMeasurementTablist() {
		if (!this.#measurement || !this.#tablist) {
			return;
		}

		this.#measurement.innerHTML = '';
		this.#measurementTablist = this.#tablist.cloneNode(true);
		this.#measurementTablist.setAttribute('data-measurement-tablist', '');
		this.#measurementTabs = Array.from(
			this.#measurementTablist.querySelectorAll('[data-tab]'),
		);
		this.#measurementTablist.removeAttribute('role');

		this.#measurementTabs.forEach((tab, index) => {
			tab.id = `${this.id}-measurement-tab-${index}`;
			tab.removeAttribute('role');
			tab.removeAttribute('aria-controls');
			tab.setAttribute('tabindex', '-1');
		});

		this.#measurement.appendChild(this.#measurementTablist);

		if (this.#resizeObserver) {
			this.#resizeObserver.observe(this.#measurementTablist);
			this.#measurementTabs.forEach((tab) =>
				this.#resizeObserver.observe(tab),
			);
		}
	}

	#scheduleLayoutEvaluation() {
		if (
			!this.isConnected ||
			!this.#initialized ||
			this.#printing ||
			this.#pendingLayoutFrame !== null
		) {
			return;
		}

		this.#pendingLayoutFrame = requestAnimationFrame(() => {
			this.#pendingLayoutFrame = null;
			const nextLayout =
				this.fixedTabs || this.#tabsFit() ? 'tabs' : 'linear';
			this.#applyLayout(nextLayout);
		});
	}

	#tabsFit() {
		const presentation = this.shadowRoot.querySelector('#presentation');
		if (
			!presentation ||
			!this.#measurement ||
			!this.#measurementTablist ||
			this.#measurementTabs.length === 0
		) {
			return false;
		}

		const availableWidth =
			presentation.getBoundingClientRect().width ||
			presentation.clientWidth;
		if (availableWidth <= 0) {
			return false;
		}

		this.#measurement.style.inlineSize = `${availableWidth}px`;
		const tolerance = 1;

		for (
			let selectedIndex = 0;
			selectedIndex < this.#measurementTabs.length;
			selectedIndex += 1
		) {
			this.#measurementTabs.forEach((tab, index) => {
				const selected = index === selectedIndex;
				tab.setAttribute('aria-selected', selected ? 'true' : 'false');
				tab.setAttribute('part', selected ? 'tab selected' : 'tab');
			});

			const listFits =
				this.#measurementTablist.scrollWidth <=
				this.#measurementTablist.clientWidth + tolerance;
			const firstOffset = this.#measurementTabs[0]?.offsetTop;
			const tabsFit = this.#measurementTabs.every(
				(tab) =>
					tab.offsetTop === firstOffset &&
					tab.scrollWidth <= tab.clientWidth + tolerance,
			);

			if (!listFits || !tabsFit) {
				this.#restoreMeasurementSelection();
				return false;
			}
		}

		this.#restoreMeasurementSelection();
		return true;
	}

	#restoreMeasurementSelection() {
		this.#measurementTabs.forEach((tab) => {
			tab.removeAttribute('aria-selected');
			tab.setAttribute('part', 'tab');
		});
	}

	#applyLayout(layout) {
		if (!this.#tablist || this.#tabpanels.length === 0) {
			return;
		}
		if (layout === this.#layout) {
			return;
		}

		const presentation = this.shadowRoot.querySelector('#presentation');
		this.#layout = layout;
		this.setAttribute('data-layout', layout);
		if (presentation) {
			presentation.dataset.layout = layout;
		}

		if (layout === 'tabs') {
			this.#tablist.hidden = false;
			this.#tablist.inert = false;
			this.#tablist.setAttribute('role', 'tablist');
			this.#tabs.forEach((tab, index) => {
				tab.setAttribute('role', 'tab');
				tab.setAttribute('aria-controls', this.#tabpanels[index].id);
				tab.setAttribute(
					'aria-selected',
					index === this.#activeIndex ? 'true' : 'false',
				);
				tab.setAttribute(
					'tabindex',
					index === this.#activeIndex ? '0' : '-1',
				);
			});
			this.#tabpanels.forEach((panel, index) => {
				panel.setAttribute('role', 'tabpanel');
				panel.setAttribute('aria-labelledby', this.#tabs[index].id);
				panel.toggleAttribute('hidden', index !== this.#activeIndex);
			});

			const restoreTabFocus =
				this.#restoreTabFocus && document.activeElement === this;
			if (this.#managedHostTabIndex) {
				if (this.getAttribute('tabindex') === '-1') {
					this.removeAttribute('tabindex');
				}
				this.#managedHostTabIndex = false;
			}
			this.#restoreTabFocus = false;
			if (restoreTabFocus) {
				this.#tabs[this.#activeIndex]?.focus({
					preventScroll: true,
				});
			}
		} else {
			const focusedTab = this.shadowRoot.activeElement;
			if (focusedTab && this.#tabs.includes(focusedTab)) {
				this.#restoreTabFocus = true;
				if (!this.hasAttribute('tabindex')) {
					this.setAttribute('tabindex', '-1');
					this.#managedHostTabIndex = true;
				}
				this.focus({ preventScroll: true });
			}

			this.#tablist.hidden = true;
			this.#tablist.inert = true;
			this.#tablist.removeAttribute('role');
			this.#tabs.forEach((tab) => {
				tab.removeAttribute('role');
				tab.removeAttribute('aria-controls');
				tab.removeAttribute('aria-selected');
				tab.setAttribute('tabindex', '-1');
			});
			this.#tabpanels.forEach((panel) => {
				panel.removeAttribute('role');
				panel.removeAttribute('aria-labelledby');
				panel.removeAttribute('hidden');
			});
		}
	}

	#handleBeforePrint() {
		if (!this.#initialized) {
			return;
		}
		this.#printing = true;
		this.#applyLayout('linear');
	}

	#handleAfterPrint() {
		if (!this.#printing) {
			return;
		}
		this.#printing = false;
		this.#scheduleLayoutEvaluation();
	}

	#findFocusableInSection(index) {
		const section = this.#sections[index];
		if (!section) {
			return null;
		}

		const selector =
			'a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
		for (const node of [section.heading, ...section.content]) {
			if (node.nodeType !== Node.ELEMENT_NODE) {
				continue;
			}
			if (node.matches(selector)) {
				return node;
			}
			const descendant = node.querySelector(selector);
			if (descendant) {
				return descendant;
			}
		}

		return null;
	}

	#activateTab(index) {
		if (index < 0 || index >= this.#tabs.length) return;
		if (index === this.#activeIndex && this.#initialized) return;

		// Deactivate current tab
		if (this.#tabs[this.#activeIndex]) {
			if (this.#layout === 'tabs') {
				this.#tabs[this.#activeIndex].setAttribute(
					'aria-selected',
					'false',
				);
			}
			this.#tabs[this.#activeIndex].setAttribute('tabindex', '-1');
			this.#tabs[this.#activeIndex].setAttribute('part', 'tab');
		}
		if (this.#layout === 'tabs' && this.#tabpanels[this.#activeIndex]) {
			this.#tabpanels[this.#activeIndex].setAttribute('hidden', '');
		}

		// Activate new tab
		this.#activeIndex = index;
		this.#focusedIndex = index;
		if (this.#layout === 'tabs') {
			this.#tabs[index].setAttribute('aria-selected', 'true');
			this.#tabs[index].setAttribute('tabindex', '0');
		}
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
				const focusable = this.#findFocusableInSection(
					this.#activeIndex,
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

		// Look for a heading with this ID in the source sections
		for (let i = 0; i < this.#sections.length; i++) {
			const heading = this.#sections[i].heading;
			if (heading && heading.id === targetId) {
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
		this.#panelSlots.forEach((slot, index) => {
			const shouldHide =
				!this.showHeaders && !this.#hasCustomTitle[index];
			slot.toggleAttribute('data-hide-heading', shouldHide);
		});
	}

	#updateTablistPosition() {
		const presentation = this.shadowRoot.querySelector('#presentation');
		if (!presentation || !this.#tablist) return;

		// Remove tablist from current position
		this.#tablist.remove();

		if (this.tablistAfter) {
			presentation.appendChild(this.#tablist);
		} else {
			presentation.insertBefore(this.#tablist, presentation.firstChild);
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

		const matchedIndex = this.#sections.findIndex((section) => {
			const heading = section.heading;
			if (!heading) {
				return false;
			}
			return heading.id === defaultTab;
		});

		if (matchedIndex !== -1) {
			this.#activateTab(matchedIndex);
		} else {
			this.#activateTab(0);
		}
	}

	#resetInternalState() {
		if (this.#resizeObserver) {
			if (this.#measurementTablist) {
				this.#resizeObserver.unobserve(this.#measurementTablist);
			}
			this.#measurementTabs.forEach((tab) =>
				this.#resizeObserver.unobserve(tab),
			);
		}
		this.#tablist = null;
		this.#tabs = [];
		this.#tabpanels = [];
		this.#panelSlots = [];
		this.#sections = [];
		this.#hasCustomTitle = [];
		this.#measurementTablist = null;
		this.#measurementTabs = [];
		if (this.#measurement) {
			this.#measurement.innerHTML = '';
		}
		this.#activeIndex = 0;
		this.#focusedIndex = 0;
		this.#initialized = false;
		this.#layout = null;
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
