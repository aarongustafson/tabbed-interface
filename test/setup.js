import { beforeAll } from 'vitest';
import { TabbedInterfaceElement } from '../tabbed-interface.js';

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get('tabbed-interface')) {
		customElements.define('tabbed-interface', TabbedInterfaceElement);
	}

	// Make the class available globally for testing static methods
	globalThis.TabbedInterfaceElement = TabbedInterfaceElement;
});
