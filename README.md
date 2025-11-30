# Tabbed Interface Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/tabbed-interface.svg)](https://www.npmjs.com/package/@aarongustafson/tabbed-interface)
[![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/tabbed-interface/ci.yml?branch=main)](https://github.com/aarongustafson/tabbed-interface/actions)

A web component that transforms heading-structured content into an accessible tabbed interface. This is a modern web component port of Aaron Gustafson’s original [TabInterface](https://github.com/easy-designs/TabInterface.js).

[Demo](https://aarongustafson.github.io/tabbed-interface/demo/) ([Source](https://github.com/aarongustafson/tabbed-interface/blob/main/demo/index.html))

## Features

- **Progressive Enhancement**: Works with semantic HTML structure
- **Accessibility**: Full ARIA support and keyboard navigation
- **Customizable**: Extensive CSS custom properties for styling
- **Lightweight**: No dependencies, pure vanilla JavaScript
- **Modern**: Uses Shadow DOM and ES Modules

## Installation

```bash
npm install @aarongustafson/tabbed-interface
```

## Usage

### Basic Usage

```html
<tabbed-interface>
  <h2>First Tab</h2>
  <p>Content for the first tab panel.</p>

  <h2>Second Tab</h2>
  <p>Content for the second tab panel.</p>

  <h2>Third Tab</h2>
  <p>Content for the third tab panel.</p>
</tabbed-interface>

<script type="module">
  import '@aarongustafson/tabbed-interface';
</script>
```

### Import Options

**Auto-define (easiest):**
```javascript
import '@aarongustafson/tabbed-interface';
// Element is automatically registered as <tabbed-interface>
```

**Manual registration:**
```javascript
import { TabbedInterfaceElement } from '@aarongustafson/tabbed-interface/tabbed-interface.js';
customElements.define('my-tabs', TabbedInterfaceElement);
```

**Both (class + auto-define):**
```javascript
import { TabbedInterfaceElement } from '@aarongustafson/tabbed-interface';
// Element is registered AND class is available
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `show-headers` | boolean | `false` | When present, shows headings in tab panels |
| `tablist-after` | boolean | `false` | When present, positions tab list after content |
| `default-tab` | string | `"0"` | Initial active tab (index or heading ID) |
| `auto-activate` | boolean | `false` | When present, tabs activate on focus; when absent, use Enter/Space to activate |

### Examples

```html
<!-- Show headings in panels -->
<tabbed-interface show-headers>
  ...
</tabbed-interface>

<!-- Tabs after content -->
<tabbed-interface tablist-after>
  ...
</tabbed-interface>

<!-- Start on specific tab -->
<tabbed-interface default-tab="2">
  ...
</tabbed-interface>

<!-- Start on tab by heading ID -->
<tabbed-interface default-tab="features">
  <h2 id="intro">Introduction</h2>
  <p>...</p>
  <h2 id="features">Features</h2>
  <p>...</p>
</tabbed-interface>

<!-- Auto-activation (tabs activate on focus) -->
<tabbed-interface auto-activate>
  ...
</tabbed-interface>
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `activeIndex` | number | Get/set the currently active tab index |
| `showHeaders` | boolean | Get/set header visibility |
| `tablistAfter` | boolean | Get/set tablist position |
| `autoActivate` | boolean | Get/set auto-activation behavior |

## Methods

| Method | Description |
|--------|-------------|
| `next()` | Navigate to the next tab |
| `previous()` | Navigate to the previous tab |
| `first()` | Navigate to the first tab |
| `last()` | Navigate to the last tab |

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

| Event | Detail | Description |
|-------|--------|-------------|
| `tabbed-interface:change` | `{ tabId, tabpanelId, tabIndex }` | Fired when active tab changes |

```javascript
document.querySelector('tabbed-interface')
  .addEventListener('tabbed-interface:change', (e) => {
    console.log(`Switched to tab ${e.detail.tabIndex}`);
  });
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Left/Up` | Previous tab |
| `Arrow Right/Down` | Next tab |
| `Home` | First tab |
| `End` | Last tab |
| `Enter/Space` | Activate tab (when auto-activate is absent) and focus first focusable element in panel |

## Styling with CSS Parts

Style the component's shadow DOM elements using CSS `::part()` selectors:

### Available Parts

| Part | Description |
|------|-------------|
| `tablist` | The container for all tabs |
| `tab` | Individual tab buttons |
| `tabpanel` | Individual tab panel containers |

### Styling Examples

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
  border: 1px solid #ccc;
  border-radius: 4px 4px 0 0;
  font-weight: 500;
}

tabbed-interface::part(tab):hover {
  background: #e9e9e9;
}

tabbed-interface::part(tabpanel) {
  padding: 2em;
  border: 1px solid #ccc;
  background: white;
}
```

**Targeting specific states:**
```css
/* Active tab - use attribute selector on the host */
tabbed-interface::part(tab selected) {
  background: white;
  border-bottom-color: white;
  font-weight: bold;
}

/* Focus styles */
tabbed-interface::part(tab):focus-visible {
  outline: 3px solid blue;
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
  background: #e0e0e0;
}

.pills::part(tab)[aria-selected="true"] {
  background: #007bff;
  color: white;
}

/* Minimal style */
.minimal::part(tab) {
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
}

.minimal::part(tab)[aria-selected="true"] {
  border-bottom-color: #007bff;
}

.minimal::part(tabpanel) {
  border: none;
  padding-top: 1.5em;
}
```

## Custom Tab Titles

Use `data-tab-short-name` to show a different label in the tab than the heading. The full heading text is set as the `aria-label` for screen readers:

```html
<tabbed-interface>
  <h2 data-tab-short-name="Intro">Introduction and Getting Started Guide</h2>
  <p>Full content with the complete heading visible in the panel.</p>
</tabbed-interface>
```

## Hash Navigation

The component supports URL hash navigation. Link to specific tabs:

```html
<a href="#features">Go to Features</a>

<tabbed-interface>
  <h2 id="intro">Introduction</h2>
  <p>...</p>
  <h2 id="features">Features</h2>
  <p>...</p>
</tabbed-interface>
```

## Browser Support

Works in all modern browsers supporting:
- Custom Elements v1
- Shadow DOM v1
- ES Modules

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests once
npm run test:run

# Lint
npm run lint

# Format code
npm run format
```

## License

MIT - See [LICENSE](LICENSE)

## Credits

Based on the [jQuery TabInterface plugin](https://github.com/easy-designs/jquery.TabInterface.js) by Aaron Gustafson, which is itself a port of his original [TabInterface](https://github.com/easy-designs/TabInterface.js).
