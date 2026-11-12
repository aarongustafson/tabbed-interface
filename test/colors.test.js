import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('tab color contracts', () => {
	it('keeps published CSS defaults aligned with the implementation and README', () => {
		const manifest = JSON.parse(read('../custom-elements.json'));
		const properties = manifest.modules[0].declarations[0].cssProperties;
		const source = read('../tabbed-interface.js');
		const docs = read('../README.md');
		for (const property of properties.filter((entry) => entry.default)) {
			expect(source).toContain(
				`var(${property.name}, ${property.default})`,
			);
			expect(docs).toContain(property.name);
			expect(docs).toContain(property.default);
		}
	});

	it('keeps shared demo pairs and focus free from unsafe substitutions', () => {
		const css = read('../demo/styles.css');
		const demo = read('../demo/index.html');
		expect(css + demo).not.toMatch(
			/GrayText|HighlightText|SelectedItem|AccentColorText|ActiveText|opacity:\s*0\.[68]/,
		);
		expect(css).not.toContain(':focus-visible');
		expect(css).toMatch(/border:\s*1px solid FieldText/);
		expect(css).toMatch(/border:\s*1px solid ButtonText/);
	});
});
