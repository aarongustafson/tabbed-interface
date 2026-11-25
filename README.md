# Tabbed Interface Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/tabbed-interface.svg)](https://www.npmjs.com/package/@aarongustafson/tabbed-interface)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/tabbed-interface/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/tabbed-interface/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/tabbed-interface?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/tabbed-interface)
[![License](https://img.shields.io/npm/l/@aarongustafson/tabbed-interface)](https://github.com/aarongustafson/tabbed-interface/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/tabbed-interface)](https://github.com/aarongustafson/tabbed-interface/blob/main/tabbed-interface.d.ts)

A web component that turns heading-structured content into tabs with keyboard
navigation and named panels. When the tabs do not fit, it shows the original
sections in reading order. Without JavaScript, or if the module fails to load,
the authored headings and content remain readable.

This is a web component port of Aaron Gustafson’s original
[TabInterface](https://github.com/easy-designs/TabInterface.js).

## Demo

- [Live Demo](https://aarongustafson.github.io/tabbed-interface/demo/) ([Source](./demo/index.html))
- [unpkg Demo](https://aarongustafson.github.io/tabbed-interface/demo/unpkg.html) ([Source](./demo/unpkg.html))
- [esm.sh Demo](https://aarongustafson.github.io/tabbed-interface/demo/esm.html) ([Source](./demo/esm.html))

## Installation

```bash
npm install @aarongustafson/tabbed-interface
```

## Usage

### Basic Usage

```html
<tabbed-interface>
  <h2>Opening hours</h2>
  <p>Tuesday through Sunday, 10am to 5pm.</p>

  <h2>Getting here</h2>
  <p>The museum is across from Central Station.</p>

  <h2>Contact</h2>
  <p>Ask at the front desk for help planning your visit.</p>
</tabbed-interface>

<script type="module">
  import '@aarongustafson/tabbed-interface/define.js';
</script>
```

The browser needs a bundler or import map to resolve the bare package import
above. Without either, use a served path to `define.js`:

```html
<script
  type="module"
  src="./node_modules/@aarongustafson/tabbed-interface/define.js"
></script>
```

Start with a direct-child heading. The first heading’s level defines the
sections: each subsequent direct-child heading at that level starts another
panel. Lower-level headings belong to the current panel. Content before the
first heading is not included in the enhanced panels; keep introductory content
outside the element. With no direct-child headings, content stays in its
original flow.

### Import Options

**Auto-define (browser environments only):**

```javascript
import '@aarongustafson/tabbed-interface/define.js';
// Registers <tabbed-interface> when customElements is available
```

Importing `define.js` also calls `defineTabbedInterface()`. The helper skips
an already registered tag and returns `true` when a browser registry is
available, or `false` otherwise. Calling it again is safe:

```javascript
import { defineTabbedInterface } from '@aarongustafson/tabbed-interface/define.js';

defineTabbedInterface();
```

**Manual registration:**

The main import and the `tabbed-interface.js` subpath export the class without
registering it. Use your preferred tag name and update your HTML to match:

```javascript
import { TabbedInterfaceElement } from '@aarongustafson/tabbed-interface';
customElements.define('my-tabs', TabbedInterfaceElement);
```

Bundled declarations describe `TabbedInterfaceElement`, the registration helper,
and change events. The component has no runtime package dependencies.

## Selection, labels, and links

The first section is selected by default. Set `default-tab` to a zero-based
index or a heading ID to choose another section. An invalid value falls back
to the first section. At initialization, a URL fragment matching a section
heading ID takes precedence over `default-tab`. Later matching fragment changes
select that section; unrelated fragments leave selection alone. Selecting a tab
does not rewrite the URL.

Use unique heading IDs for [links to sections](./demo/index.html#link-to-sections).
The component matches the fragment text directly; it doesn’t decode
percent-encoded IDs. Simple IDs such as `visit-hours` avoid that ambiguity.

By default, ordinary panel headings are visually hidden in tab layout but
remain available to assistive technology. Add `show-headers` to request visible
headings. All headings are visible in linear and print layouts.

### Custom Tab Titles

`data-tab-short-name` supplies the visible tab label. The full heading becomes
the tab’s accessible name through `aria-label`; that name is not the visible
tab label. Keep the short label recognizable within the full name, including
when rewriting labels for your application or translating them. The
[short-label example](./demo/index.html#short-labels) explicitly uses
`show-headers` to show the full headings too. The current runtime also leaves
headings with nonempty short names visible when `show-headers` is absent.

### Hash Navigation

For example, a link to `#visit-hours` selects the section headed by
`<h2 id="visit-hours">`. The heading remains a native fragment destination
before upgrade or without JavaScript. See the
[section-link example](./demo/index.html#link-to-sections) for matching HTML
and links.

## Attributes

| Attribute       | Type                           | Default  | Description                                                                    |
| --------------- | ------------------------------ | -------- | ------------------------------------------------------------------------------ |
| `show-headers`  | boolean                        | `false`  | When present, shows headings in tab panels                                     |
| `tablist-after` | boolean                        | `false`  | When present, positions tab list after content                                 |
| `default-tab`   | string                         | absent   | Select a zero-based index or heading ID; absent selects the first section      |
| `auto-activate` | boolean                        | `false`  | When present, tabs activate on focus; when absent, use Enter/Space to activate |
| `fixed-tabs`    | boolean                        | `false`  | When present, keeps tabs active even when the complete tablist does not fit    |
| `presentation`  | `"auto" \| "tabs" \| "linear"` | `"auto"` | Request automatic fitting, tabs, or all sections                               |

Boolean attributes work by presence, so `auto-activate="false"` still enables
automatic activation. See the [live examples](./demo/index.html) for configuration
alternatives.

## Responsive Behavior

The component uses tabs only when the complete, styled tablist fits on one horizontal row. Tab labels may wrap within their buttons. If the tablist does not fit, the component automatically presents the original content as fully expanded linear sections with visible headings.

Fit is based on rendered styles rather than a viewport breakpoint. Fonts, padding, borders, CSS parts, custom properties, selected-tab styling, translated labels, and container resizing all participate in the calculation.

Use `fixed-tabs` only when you want tabs at every available width and will handle overflow yourself.

Set `presentation="linear"` to show all sections or `presentation="tabs"` to
keep tabs regardless of fit. These explicit modes take precedence over
`fixed-tabs`; `"auto"` preserves its existing behavior. Print always shows all
sections, then restores the requested presentation afterward.

Change the `presentation` property to switch modes without moving authored
nodes, reconnecting nested components, or losing their state. The selected tab
is retained while all sections are visible. Invalid attribute values log an
error and use `"auto"`; invalid property assignments log and keep the previous
setting. Set the property to `null` or `undefined` to remove the attribute.
See the [presentation control example](./demo/index.html#presentation-control).

When returning to tabs, a section containing keyboard focus takes precedence
over the saved selection so the focused control stays visible.

Read `layout` for the actual applied mode, which can differ from a requested
`presentation="auto"`. It returns `"tabs"` or `"linear"`, including during print,
or `null` before initialization, without headings, and after disconnection.
Layout evaluation is queued, so assigning `presentation` need not change
`layout` synchronously.

The same state is reflected as `data-layout="tabs"` or `data-layout="linear"`
for styling. This is output, not configuration; it is absent when `layout` is
`null`. Don’t author or set it to choose a presentation.

```css
tabbed-interface[data-layout='linear'] {
  margin-block: 2rem;
}
```

## Properties

| Property       | Type                           | Description                                                                                  |
| -------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `activeIndex`  | number                         | Get/set the currently active tab index                                                       |
| `showHeaders`  | boolean                        | Get/set header visibility                                                                    |
| `tablistAfter` | boolean                        | Get/set tablist position                                                                     |
| `autoActivate` | boolean                        | Get/set auto-activation behavior                                                             |
| `fixedTabs`    | boolean                        | Get/set whether tabs remain active when they do not fit                                      |
| `presentation` | `"auto" \| "tabs" \| "linear"` | Get/set the requested presentation; explicit modes override `fixedTabs`                      |
| `layout`       | `"tabs" \| "linear" \| null`   | Read-only actual layout, including print; `null` when not initialized                        |
| `defaultTab`   | string \| null                 | Reflect `default-tab`; setting `null`, `undefined`, or an empty/whitespace string removes it |

The boolean properties reflect their matching attributes and default to `false`.
`activeIndex` starts at `0`. It accepts finite integer numbers; fractional,
non-finite, and non-number assignments log an error and retain the selection
without emitting a change event. Out-of-range integers are ignored. Changing
`defaultTab` after initialization also changes selection.

The component replays assignments to all seven writable properties made before
upgrade. Initial section setup still applies `default-tab` and then a matching
hash, so use `activeIndex` after initialization for imperative selection.

## Methods

| Method       | Description                                          |
| ------------ | ---------------------------------------------------- |
| `next()`     | Select the next tab, wrapping from last to first     |
| `previous()` | Select the previous tab, wrapping from first to last |
| `first()`    | Select the first tab                                 |
| `last()`     | Select the last tab                                  |

These methods also focus the selected tab in tab layout. In linear layout,
they update the remembered selection without hiding sections or moving focus.
They do nothing when there are no tabs. Setting `activeIndex` changes selection
without moving focus.

### Programmatic Control

```javascript
const $tabs = document.querySelector('tabbed-interface');

// Navigate
$tabs.next();
$tabs.previous();
$tabs.first();
$tabs.last();

// Set active tab directly
$tabs.activeIndex = 2;
```

## Events

| Event                     | Detail                            | Description                                                                       |
| ------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `tabbed-interface:change` | `{ tabId, tabpanelId, tabIndex }` | Reports selection, including initial setup; bubbles and crosses shadow boundaries |

```javascript
document
  .querySelector('tabbed-interface')
  .addEventListener('tabbed-interface:change', (e) => {
    console.log(`Switched to tab ${e.detail.tabIndex}`);
  });
```

TypeScript infers `TabbedInterfaceChangeEvent` in ordinary `addEventListener`
callbacks on a `TabbedInterfaceElement`. The exported `TabbedInterfaceEventMap`
extends `HTMLElementEventMap`, so native events, listener objects, and
`removeEventListener` remain supported. The declarations also export
`TabbedInterfacePresentation` and `TabbedInterfaceLayout`.

## Keyboard Navigation

Tab into the selected tab. Without `auto-activate`, arrow keys move focus
without changing the visible panel; press Enter or Space to select the focused
tab. With `auto-activate`, moving focus selects it immediately. Clicking a tab
selects it in either mode.

| Key                | Action                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Arrow Left/Up`    | Previous tab                                                                                                                                            |
| `Arrow Right/Down` | Next tab                                                                                                                                                |
| `Home`             | First tab                                                                                                                                               |
| `End`              | Last tab                                                                                                                                                |
| `Enter/Space`      | Select the focused tab in manual mode; in either mode, focus the first matching link, control, or focusable element in the active section if one exists |

If the section has no matching focusable element, focus stays on the tab.
The component creates tab/panel roles, names each panel from its tab, and uses
one tab stop in the tablist. In linear layout it removes those roles and reveals
all sections. If a focused tab disappears during that change, focus moves to
the host; it returns to the selected tab when tabs fit again, unless the user
has moved focus elsewhere.

## Styling

### Authored panel content

Panel content remains in light DOM and retains its original node identity. Style the content you own with ordinary selectors:

```css
.article tabbed-interface p {
  max-inline-size: 65ch;
}

.article tabbed-interface .callout {
  padding: 1rem;
  background: var(--callout-background);
}
```

Event listeners, live form values, form ownership, nested custom elements, IDs, and runtime state remain attached to the visible authored nodes.

### Component structure

Style the component's shadow DOM elements using CSS `::part()` selectors:

### Available Parts

| Part           | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| `tablist`      | The container for all tabs                                                                  |
| `tab`          | Individual tab buttons                                                                      |
| `selected`     | The currently selected tab                                                                  |
| `tabpanel`     | Individual tab panel containers                                                             |
| `presentation` | Container for the tablist and panels; use a grid in linear mode without reparenting content |

### Styling Examples

Defaults use `CanvasText` over a shaded `Canvas` background: an 8% foreground
mix for ordinary tabs and 16% for hover/focus. The selected tab uses `CanvasText`
on unshaded `Canvas`. Browsers without `color-mix()` fall back to `Canvas`.
This avoids relying on low-contrast native Button pairs in some dark palettes
while keeping the existing color hooks. In forced colors, selection
also has a two-pixel underline so it remains distinguishable when user colors
flatten the surfaces. The underline is off in ordinary light/dark mode and
does not change the tab’s measured size. Browsers without `forced-colors`
media-query support retain the underline as a fallback.

Keyboard focus uses the browser’s native outline unless you set
`--tabbed-interface-tab-focus-outline` or a `::part(tab):focus-visible` rule.
Selection and focus are separate: with manual activation, an arrow key can
focus an unselected tab without changing selection or, in forced colors,
moving the selected underline.

Pair every custom background with a readable foreground, including hover/focus
and selected states. Panels are transparent and inherit their host foreground
by default; if you paint a panel, set its foreground with `::part(tabpanel)`.
Keep automatic forced-color adjustment enabled, and check your actual
surfaces, keyboard focus, and reading order. System-color pairs and automated
checks do not guarantee contrast for every browser or user palette.

**Migration:** ordinary and hover/focus defaults now use the Canvas pair rather
than `ButtonFace`/`ButtonText`. If your theme overrides a hover/focus fill,
set `--tabbed-interface-tab-hover-color` too. Existing color hooks and parts
remain supported. To replace the forced-color selected underline, provide an
equally clear non-color selected cue through `::part(selected)`.

**Basic styling:**

```css
tabbed-interface::part(tablist) {
  gap: 4px;
  background: #f0f0f0;
  padding: 8px;
}

tabbed-interface::part(tab) {
  padding: 0.75em 1.5em;
  background: white;
  color: #202020;
  border: 1px solid #202020;
  border-radius: 4px 4px 0 0;
  font-weight: 500;
}

tabbed-interface::part(tab):hover {
  background: #e9e9e9;
  color: #202020;
}

tabbed-interface::part(tabpanel) {
  padding: 2em;
  border: 1px solid #202020;
  background: white;
  color: #202020;
}
```

**Targeting specific states:**

```css
/* Active tab */
tabbed-interface::part(selected) {
  background: white;
  color: #202020;
  border-bottom-color: white;
  font-weight: bold;
}

/* Focus styles */
tabbed-interface::part(tab):focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 2px;
}
```

**Themed variations:**

```css
/* Pills style */
.pills::part(tablist) {
  gap: 8px;
  background: transparent;
}

.pills::part(tab) {
  border-radius: 20px;
  background: Canvas;
  background: color-mix(in srgb, CanvasText 8%, Canvas);
  color: CanvasText;
  border: 1px solid CanvasText;
}

.pills::part(selected) {
  background: CanvasText;
  color: Canvas;
  border-color: CanvasText;
}

/* Minimal style */
.minimal::part(tab) {
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: Canvas;
  color: CanvasText;
}

.minimal::part(selected) {
  background: Canvas;
  color: CanvasText;
  border-bottom-color: CanvasText;
}

.minimal::part(tabpanel) {
  border: none;
  padding-top: 1.5em;
}
```

Keep hover and focus styles geometry-stable: changing padding, borders, or font
size on focus can make controls move or overflow while someone navigates.
The fit calculation includes normal and selected states, not hover/focus
changes. See the [styling demos](./demo/index.html#styling-tabs) for pill and
underline treatments.

### CSS custom properties

CSS custom properties offer convenient theme-level control without replacing parts:

| Property                                   | Purpose                                                               |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `--tabbed-interface-font-family`           | Component font family                                                 |
| `--tabbed-interface-tablist-display`       | Tablist display mode                                                  |
| `--tabbed-interface-tablist-gap`           | Gap between tabs                                                      |
| `--tabbed-interface-tablist-padding`       | Tablist padding                                                       |
| `--tabbed-interface-tablist-margin`        | Tablist margin                                                        |
| `--tabbed-interface-tablist-background`    | Tablist background                                                    |
| `--tabbed-interface-tablist-border`        | Tablist border                                                        |
| `--tabbed-interface-tab-padding`           | Tab padding                                                           |
| `--tabbed-interface-tab-background`        | Default tab background (`color-mix(in srgb, CanvasText 8%, Canvas)`)  |
| `--tabbed-interface-tab-color`             | Default tab text color (`CanvasText`)                                 |
| `--tabbed-interface-tab-border`            | Tab border (`1px solid currentColor`)                                 |
| `--tabbed-interface-tab-border-radius`     | Tab border radius                                                     |
| `--tabbed-interface-tab-active-background` | Selected tab background (`Canvas`)                                    |
| `--tabbed-interface-tab-active-color`      | Selected tab text color (`CanvasText`)                                |
| `--tabbed-interface-tab-hover-background`  | Hover/focus background (`color-mix(in srgb, CanvasText 16%, Canvas)`) |
| `--tabbed-interface-tab-hover-color`       | Hover/focus text color (`CanvasText`)                                 |
| `--tabbed-interface-tab-focus-outline`     | Keyboard focus outline (browser-native via `revert`)                  |
| `--tabbed-interface-tabpanel-padding`      | Panel padding                                                         |
| `--tabbed-interface-tabpanel-background`   | Panel background                                                      |
| `--tabbed-interface-tabpanel-border`       | Panel border                                                          |

## Printing

Print mode hides the tab controls and reveals every section and original heading in source order. The on-screen selected tab and responsive presentation are restored after printing.

## Content changes and disconnection

Changes to direct-child content or section headings rebuild the tabs while
preserving the selected index when it still exists. The original content nodes,
listeners, and form state remain intact.

On disconnection, the component removes its hash, print, and font listeners,
disconnects its observers, and cancels queued work. Reconnection rebuilds the
presentation from the same authored nodes and applies the initial selection
rules again.

## Browser Support

The component requires:

- Custom Elements v1
- Shadow DOM v1
- ES Modules
- Manual slot assignment (`HTMLSlotElement.assign()`)

It also uses `ResizeObserver` to respond to container resizing. Test your
target browsers, authored labels, form controls, and custom styles. Local
automated browser tests do not establish screen-reader or high-contrast
support across operating systems and user settings.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests once
npm run test:run

# Check public types
npm run test:types

# Lint
npm run lint

# Format code
npm run format
```

## License

MIT - See [LICENSE](LICENSE)

## Credits

Based on the [jQuery TabInterface plugin](https://github.com/easy-designs/jquery.TabInterface.js) by Aaron Gustafson, which is itself a port of his original [TabInterface](https://github.com/easy-designs/TabInterface.js).
