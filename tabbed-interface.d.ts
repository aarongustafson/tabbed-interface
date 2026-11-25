export interface TabbedInterfaceChangeDetail {
	tabId: string;
	tabpanelId: string;
	tabIndex: number;
}

export type TabbedInterfaceChangeEvent =
	CustomEvent<TabbedInterfaceChangeDetail>;

export type TabbedInterfacePresentation = 'auto' | 'tabs' | 'linear';
export type TabbedInterfaceLayout = 'tabs' | 'linear';

export interface TabbedInterfaceEventMap extends HTMLElementEventMap {
	'tabbed-interface:change': TabbedInterfaceChangeEvent;
}

export declare class TabbedInterfaceElement extends HTMLElement {
	activeIndex: number;
	showHeaders: boolean;
	tablistAfter: boolean;
	defaultTab: string | null;
	autoActivate: boolean;
	/** @deprecated Use presentation = 'tabs' instead. Retained for compatibility in auto mode. */
	fixedTabs: boolean;
	get presentation(): TabbedInterfacePresentation;
	set presentation(value: TabbedInterfacePresentation | null | undefined);
	get layout(): TabbedInterfaceLayout | null;

	next(): void;
	previous(): void;
	first(): void;
	last(): void;

	addEventListener<K extends keyof TabbedInterfaceEventMap>(
		type: K,
		listener: (
			this: TabbedInterfaceElement,
			event: TabbedInterfaceEventMap[K],
		) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): void;
	removeEventListener<K extends keyof TabbedInterfaceEventMap>(
		type: K,
		listener: (
			this: TabbedInterfaceElement,
			event: TabbedInterfaceEventMap[K],
		) => void,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | EventListenerOptions,
	): void;
}

declare global {
	interface HTMLElementTagNameMap {
		'tabbed-interface': TabbedInterfaceElement;
	}
}
