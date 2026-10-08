export interface TabbedInterfaceChangeDetail {
	tabId: string;
	tabpanelId: string;
	tabIndex: number;
}

export type TabbedInterfaceChangeEvent = CustomEvent<TabbedInterfaceChangeDetail>;

export declare class TabbedInterfaceElement extends HTMLElement {
	activeIndex: number;
	showHeaders: boolean;
	tablistAfter: boolean;
	defaultTab: string | null;
	autoActivate: boolean;
	fixedTabs: boolean;

	next(): void;
	previous(): void;
	first(): void;
	last(): void;
}

declare global {
	interface HTMLElementTagNameMap {
		'tabbed-interface': TabbedInterfaceElement;
	}
}
