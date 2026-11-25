# Tabbed Interface Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/tabbed-interface.svg)](https://www.npmjs.com/package/@aarongustafson/tabbed-interface)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/tabbed-interface/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/tabbed-interface/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/tabbed-interface?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/tabbed-interface)
[![License](https://img.shields.io/npm/l/@aarongustafson/tabbed-interface)](https://github.com/aarongustafson/tabbed-interface/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/tabbed-interface)](https://github.com/aarongustafson/tabbed-interface/blob/main/tabbed-interface.d.ts)

`<tabbed-interface>` turns heading-structured content into tabs with keyboard
navigation and named panels. When the tabs don’t fit, it shows all sections in
reading order. Before upgrade, without JavaScript, or if the module fails to
load, the authored headings and content remain readable.

## Demos

- [Live Demo](https://aarongustafson.github.io/tabbed-interface/demo/) ([Source](./demo/index.html))
- [unpkg Demo](https://aarongustafson.github.io/tabbed-interface/demo/unpkg.html) ([Source](./demo/unpkg.html))
- [esm.sh Demo](https://aarongustafson.github.io/tabbed-interface/demo/esm.html) ([Source](./demo/esm.html))

## Installation

```bash
npm install @aarongustafson/tabbed-interface
```

## Usage

### Basic usage

Start with headings and useful content, then register the component:

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

### Import options

The example above imports `define.js`, which registers `<tabbed-interface>`.
Use these imports in a browser; see [browser support](#browser-support) for
the required features and server-rendering caveat.

The same module exports `defineTabbedInterface()`. Importing the module calls
the helper automatically. It skips an already registered tag and returns
`true` when a browser registry is available, or `false` otherwise:

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

The package includes [TypeScript declarations](./tabbed-interface.d.ts) and a
[Custom Elements Manifest](./custom-elements.json). It has no runtime package
dependencies.

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

### Custom tab titles

`data-tab-short-name` supplies the visible tab label. The full heading becomes
the tab’s accessible name through `aria-label`; that name is not the visible
tab label. Keep the short label recognizable within the full name, including
when rewriting labels for your application or translating them. The
[short-label example](./demo/index.html#short-labels) uses `show-headers`.
Headings with nonempty short names also stay visible without that attribute.

### Hash navigation

For example, a link to `#visit-hours` selects the section headed by
`<h2 id="visit-hours">`. The heading remains a native fragment destination
before upgrade or without JavaScript. See the
[section-link example](./demo/index.html#link-to-sections) for matching HTML
and links.

## Responsive behavior

By default, the component uses tabs when the complete, styled tablist fits on
one horizontal row. Labels may wrap within their buttons. If the tablist
doesn’t fit, every section and its heading become visible.

Fit depends on rendered styles, not a viewport breakpoint. Fonts, padding,
borders, parts, custom properties, selected-tab styles, translated labels, and
container resizing all affect it.

Choose a presentation with `presentation`:

| Value      | Behavior                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `"auto"`   | Use rendered fit; `fixed-tabs` keeps tabs regardless of fit when present |
| `"tabs"`   | Always use tabs, overriding `fixed-tabs`                                 |
| `"linear"` | Always show all sections, overriding `fixed-tabs`                        |

With `fixed-tabs` or `presentation="tabs"`, you’re responsible for handling
overflow at narrow widths. [Printing](#printing) always reveals every section.

**Deprecated compatibility options:** prefer `presentation="tabs"` over
`fixed-tabs`, and `.presentation = 'tabs'` over `.fixedTabs = true`. The old
attribute and property still work in `"auto"` mode; explicit presentation
values take precedence. This release neither removes them nor adds runtime
deprecation warnings. Remove `fixed-tabs` when migrating so it won’t force
tabs again if you return to `"auto"`.

Change the `presentation` property to switch modes without moving authored
nodes, reconnecting nested components, or losing their state. The selected tab
is retained while all sections are visible. Invalid attribute values log an
error and use `"auto"`; invalid property assignments log and keep the previous
setting. Set the property to `null` or `undefined` to remove the attribute.
See the [presentation control example](./demo/index.html#presentation-control).

When returning to tabs, a section containing keyboard focus takes precedence
over the saved selection so the focused control stays visible.

Read `layout` for the actual applied mode, including print, rather than the
requested `presentation`. It returns `"tabs"` or `"linear"`, or `null` before
initialization, without headings, and after disconnection. Layout evaluation
is queued, so assigning `presentation` need not change `layout` synchronously.

The same state is reflected as `data-layout="tabs"` or `data-layout="linear"`
for styling. This is output, not configuration; it is absent when `layout` is
`null`. Don’t author or set it to choose a presentation.

```css
tabbed-interface[data-layout='linear'] {
  margin-block: 2rem;
}
```

## Attributes

| Attribute       | Values                         | Default  | Effect                                                     |
| --------------- | ------------------------------ | -------- | ---------------------------------------------------------- |
| `default-tab`   | Index or heading ID            | absent   | Choose the opening section; a matching initial hash wins   |
| `show-headers`  | boolean                        | `false`  | Keep ordinary panel headings visible in tab layout         |
| `tablist-after` | boolean                        | `false`  | Place the tablist after the content                        |
| `auto-activate` | boolean                        | `false`  | Select tabs on focus instead of waiting for Enter or Space |
| `fixed-tabs`    | boolean                        | `false`  | Deprecated; use `presentation="tabs"` instead              |
| `presentation`  | `"auto"`, `"tabs"`, `"linear"` | `"auto"` | Choose automatic fitting, tabs, or all sections            |

Boolean attributes work by presence: `auto-activate="false"` still enables
automatic activation. See the [live demos](./demo/index.html) for configuration
alternatives.

## Properties

| Property       | Type                           | Description                                                                                  |
| -------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `activeIndex`  | number                         | Get/set the currently active tab index                                                       |
| `showHeaders`  | boolean                        | Get/set header visibility                                                                    |
| `tablistAfter` | boolean                        | Get/set tablist position                                                                     |
| `autoActivate` | boolean                        | Get/set auto-activation behavior                                                             |
| `fixedTabs`    | boolean                        | Deprecated; use `presentation = 'tabs'` instead                                              |
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

For example, select a section without moving focus, then navigate to the next
one using the component’s normal focus behavior:

```javascript
const tabs = document.querySelector('tabbed-interface');

tabs.activeIndex = 1;
tabs.next();
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

The event reports selection, not completion of a layout change. Initial setup
and content rebuilds can emit it even when the selected index is unchanged.
Assigning the current `activeIndex` after initialization does not emit it.

## Localization

The component takes its user-facing text from your headings; there’s no
built-in message catalog to translate. Write headings in your application’s
vocabulary and language, and set `lang` on the component or a containing
element when appropriate. `lang` identifies the language; it doesn’t
translate the text.

Translate `data-tab-short-name` alongside the full heading when you use a
short label. The full heading supplies the tab’s accessible name, so keep
the visible short label recognizable within it. See
[custom tab titles](#custom-tab-titles) for the heading-visibility behavior.
Longer translated labels participate in the same rendered-fit calculation
as any other labels.

## Styling

Use custom properties for theme settings, `::part()` selectors for generated
controls, and ordinary selectors for your authored content, which stays in
light DOM:

```css
tabbed-interface {
  --tabbed-interface-tab-padding: 0.75em 1.25em;
}

tabbed-interface::part(selected) {
  font-weight: bold;
}

tabbed-interface p {
  max-inline-size: 65ch;
}
```

### CSS parts

| Part           | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| `tablist`      | The container for all tabs                                                                  |
| `tab`          | Individual tab buttons                                                                      |
| `selected`     | The currently selected tab                                                                  |
| `tabpanel`     | Individual tab panel containers                                                             |
| `presentation` | Container for the tablist and panels; use a grid in linear mode without reparenting content |

See the [styling demos](./demo/index.html#styling-tabs) for pill and underline
treatments, and the [presentation example](./demo/index.html#presentation-control)
for an expanded grid.

### Colors and focus

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

Keep hover and focus styles geometry-stable: changing padding, borders, or font
size on focus can make controls move or overflow while someone navigates.
The fit calculation includes normal and selected states, not hover/focus
changes.

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

## Keyboard navigation

Tab into the selected tab. Without `auto-activate`, arrow keys move focus
without changing the visible panel; press Enter or Space to select the focused
tab. With `auto-activate`, moving focus selects it immediately. Clicking a tab
selects it in either mode.

| Key                | Action                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `Arrow Left/Up`    | Focus the previous tab, wrapping from first to last                        |
| `Arrow Right/Down` | Focus the next tab, wrapping from last to first                            |
| `Home`             | Focus the first tab                                                        |
| `End`              | Focus the last tab                                                         |
| `Enter/Space`      | Select in manual mode, then move focus into the active section if possible |

Enter and Space focus the first matching link, control, or focusable element
in the active section in either activation mode. If there isn’t one, focus
stays on the tab.

The component creates tab/panel roles, names each panel from its tab, and uses
one tab stop in the tablist. In linear layout it removes those roles and reveals
all sections. If a focused tab disappears during that change, focus moves to
the host; it returns to the selected tab when tabs fit again, unless the user
has moved focus elsewhere.

## Printing

Print hides the tab controls and reveals every section and original heading
in source order, regardless of `presentation` or `fixed-tabs`. After printing,
the component restores the requested presentation and remembered selection,
subject to the [focused-section rule](#responsive-behavior).

## Content changes and disconnection

Changes to direct-child content or section headings rebuild the tabs while
preserving the selected index when it still exists. The original content nodes,
listeners, form ownership, and live form values remain intact.

On disconnection, the component removes its hash, print, and font listeners,
disconnects its observers, and cancels queued work. Reconnection rebuilds the
presentation from the same authored nodes and applies the initial selection
rules again.

## Browser support

The component requires:

- Custom Elements v1
- Shadow DOM v1
- ES Modules
- Manual slot assignment (`HTMLSlotElement.assign()`)

It also uses `ResizeObserver` to respond to container resizing. Test your
target browsers, authored labels, form controls, and custom styles. Local
automated browser tests do not establish screen-reader or high-contrast
support across operating systems and user settings.

The modules extend `HTMLElement` when evaluated. Guard browser-only imports
when rendering on a server; the registration helper’s registry check does not
make the imports server-safe.

## Development

Use Node.js 22 or later. Run `npm ci` in a checkout to install the locked
development dependencies, then `npx playwright install` to install the browsers
for browser tests.

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm test`             | Watch unit tests                                  |
| `npm run test:run`     | Run unit tests once                               |
| `npm run test:types`   | Check the public TypeScript API                   |
| `npm run test:browser` | Run Chromium, Firefox, and WebKit tests           |
| `npm run lint`         | Check shared demo integrity, code, and formatting |
| `npm run format`       | Format code and documentation                     |

## Credits

Based on the [jQuery TabInterface plugin](https://github.com/easy-designs/jquery.TabInterface.js) by Aaron Gustafson, which is itself a port of his original [TabInterface](https://github.com/easy-designs/TabInterface.js).

## License

MIT. See [LICENSE](./LICENSE).
