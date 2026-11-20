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
		const shell = read('../demo/demo-shell.css');
		const demo = read('../demo/index.html');
		expect(css + shell + demo).not.toMatch(
			/GrayText|HighlightText|SelectedItem|AccentColorText|ActiveText|opacity:\s*0\.[68]/,
		);
		expect(css).not.toContain(':focus-visible');
		const fields = shell.match(/input:not\([^}]+\}/)?.[0];
		expect(fields).toMatch(/border:\s*1px solid currentColor/);
		expect(fields).toMatch(/background:\s*Field;\s*color:\s*FieldText/);
		expect(css).toMatch(/border:\s*1px solid ButtonText/);
	});

	it('trims block-edge margins inside demo sections', () => {
		expect(read('../demo/demo-shell.css')).toMatch(
			/\.demo-section(?:,\s*\.api-reference)?\s*\{[^}]*\bmargin-trim:\s*block;/,
		);
	});
});
