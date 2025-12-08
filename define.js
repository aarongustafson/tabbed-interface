import { TabbedInterfaceElement } from './tabbed-interface.js';

export function defineTabbedInterface(tagName = 'tabbed-interface') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, TabbedInterfaceElement);
	}

	return true;
}

defineTabbedInterface();
