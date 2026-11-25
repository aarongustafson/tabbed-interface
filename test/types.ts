import type {
	TabbedInterfaceElement,
	TabbedInterfaceChangeEvent,
	TabbedInterfaceLayout,
	TabbedInterfacePresentation,
} from '@aarongustafson/tabbed-interface';

const tabs = document.createElement('tabbed-interface');
const presentation: TabbedInterfacePresentation = 'linear';
tabs.presentation = presentation;
tabs.presentation = null;
tabs.presentation = undefined;
const requested: TabbedInterfacePresentation = tabs.presentation;
const layout: TabbedInterfaceLayout | null = tabs.layout;
tabs.addEventListener('tabbed-interface:change', function (event) {
	const index: number = event.detail.tabIndex;
	const tabId: string = event.detail.tabId;
	const panelId: string = event.detail.tabpanelId;
	const host: TabbedInterfaceElement = this;
	console.log(host.layout, index, tabId, panelId);
	// @ts-expect-error Selection indices are numbers.
	const invalid: string = event.detail.tabIndex;
	console.log(invalid);
});
const onChange = (event: TabbedInterfaceChangeEvent) => {
	console.log(event.detail.tabIndex);
};
tabs.addEventListener('tabbed-interface:change', onChange);
tabs.removeEventListener('tabbed-interface:change', onChange, false);
tabs.addEventListener('click', (event) => {
	const click: MouseEvent = event;
	console.log(click.clientX);
});
tabs.removeEventListener('keydown', (event) => {
	const keydown: KeyboardEvent = event;
	console.log(keydown.key);
});
tabs.addEventListener('application:event', { handleEvent: console.log });
tabs.removeEventListener('application:event', { handleEvent: console.log });
// @ts-expect-error Actual layout is read-only.
tabs.layout = 'tabs';
// @ts-expect-error Presentation only accepts documented enum values.
tabs.presentation = 'grid';
console.log(requested, layout);
