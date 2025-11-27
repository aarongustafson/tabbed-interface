# tabbed-interface

A web component that transforms heading-structured content into an accessible tabbed interface. This is a modern web component port of the [jQuery TabInterface plugin](https://github.com/easy-designs/jquery.TabInterface.js).

## ✨ Features

- **Progressive Enhancement**: Works with semantic HTML structure
- **Accessibility**: Full ARIA support and keyboard navigation
- **Customizable**: Extensive CSS custom properties for styling
- **Lightweight**: No dependencies, pure vanilla JavaScript
- **Modern**: Uses Shadow DOM and ES Modules

## 🚀 Installation

```bash
npm install @anthropic-ai/tabbed-interface
```

## 📖 Usage

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
  import '@anthropic-ai/tabbed-interface';
</script>
```

### Import Options

**Auto-define (easiest):**
```javascript
import '@anthropic-ai/tabbed-interface';
// Element is automatically registered as <tabbed-interface>
```

**Manual registration:**
```javascript
import { TabbedInterfaceElement } from '@anthropic-ai/tabbed-interface/tabbed-interface.js';
customElements.define('my-tabs', TabbedInterfaceElement);
```

**Both (class + auto-define):**
```javascript
import { TabbedInterfaceElement } from '@anthropic-ai/tabbed-interface';
// Element is registered AND class is available
```

## 📋 Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `hide-headers` | boolean | `true` | When true, visually hides headings in tab panels |
| `tablist-position` | string | `"before"` | Position of tab list: `"before"` or `"after"` content |
| `default-tab` | string | `"0"` | Initial active tab (index or heading ID) |

### Examples

```html
<!-- Show headings in panels -->
<tabbed-interface hide-headers="false">
  ...
</tabbed-interface>

<!-- Tabs after content -->
<tabbed-interface tablist-position="after">
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
```

## 📊 Properties

| Property | Type | Description |
|----------|------|-------------|
| `activeIndex` | number | Get/set the currently active tab index |
| `hideHeaders` | boolean | Get/set header visibility |
| `tablistPosition` | string | Get/set tablist position |

## 🔧 Methods

| Method | Description |
|--------|-------------|
| `next()` | Navigate to the next tab |
| `previous()` | Navigate to the previous tab |
| `first()` | Navigate to the first tab |
| `last()` | Navigate to the last tab |

### Programmatic Control

```javascript
const tabs = document.querySelector('tabbed-interface');

// Navigate
tabs.next();
tabs.previous();
tabs.first();
tabs.last();

// Set active tab directly
tabs.activeIndex = 2;
```

## 🎯 Events

| Event | Detail | Description |
|-------|--------|-------------|
| `tabbed-interface:change` | `{ tabId, tabpanelId, tabIndex }` | Fired when active tab changes |

```javascript
document.querySelector('tabbed-interface')
  .addEventListener('tabbed-interface:change', (e) => {
    console.log(`Switched to tab ${e.detail.tabIndex}`);
  });
```

## ⌨️ Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Left/Up` | Previous tab |
| `Arrow Right/Down` | Next tab |
| `Home` | First tab |
| `End` | Last tab |
| `Enter` | Focus tab panel |
| `Escape` | Blur current tab |

## 🎨 CSS Custom Properties

Style the component using these CSS custom properties:

### Tablist

| Property | Default | Description |
|----------|---------|-------------|
| `--tabbed-interface-font-family` | `inherit` | Font family |
| `--tabbed-interface-tablist-display` | `flex` | Display type |
| `--tabbed-interface-tablist-gap` | `0` | Gap between tabs |
| `--tabbed-interface-tablist-padding` | `0` | Tablist padding |
| `--tabbed-interface-tablist-margin` | `0` | Tablist margin |
| `--tabbed-interface-tablist-background` | `transparent` | Background color |
| `--tabbed-interface-tablist-border` | `none` | Border |

### Tabs

| Property | Default | Description |
|----------|---------|-------------|
| `--tabbed-interface-tab-padding` | `0.5em 1em` | Tab padding |
| `--tabbed-interface-tab-background` | `transparent` | Background |
| `--tabbed-interface-tab-color` | `inherit` | Text color |
| `--tabbed-interface-tab-border` | `1px solid #ccc` | Border |
| `--tabbed-interface-tab-border-radius` | `0` | Border radius |
| `--tabbed-interface-tab-active-background` | `#fff` | Active background |
| `--tabbed-interface-tab-active-color` | `inherit` | Active text color |
| `--tabbed-interface-tab-hover-background` | `#f0f0f0` | Hover background |
| `--tabbed-interface-tab-hover-color` | `inherit` | Hover text color |
| `--tabbed-interface-tab-focus-outline` | `2px solid #005fcc` | Focus outline |

### Tab Panels

| Property | Default | Description |
|----------|---------|-------------|
| `--tabbed-interface-tabpanel-padding` | `1em` | Panel padding |
| `--tabbed-interface-tabpanel-background` | `transparent` | Background |
| `--tabbed-interface-tabpanel-border` | `1px solid #ccc` | Border |

### Example Styling

```css
tabbed-interface {
  --tabbed-interface-tablist-gap: 4px;
  --tabbed-interface-tab-background: #f0f0f0;
  --tabbed-interface-tab-border-radius: 4px 4px 0 0;
  --tabbed-interface-tab-active-background: #fff;
  --tabbed-interface-tabpanel-padding: 1.5em;
}
```

## 🏷️ Custom Tab Titles

Use `data-tab-title` to show a different label in the tab than the heading:

```html
<tabbed-interface>
  <h2 data-tab-title="Intro">Introduction and Getting Started Guide</h2>
  <p>Full content with the complete heading visible in the panel.</p>
</tabbed-interface>
```

## 🔗 Hash Navigation

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

## 🌐 Browser Support

Works in all modern browsers supporting:
- Custom Elements v1
- Shadow DOM v1
- ES Modules

## 🛠️ Development

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

## 📄 License

MIT - See [LICENSE](LICENSE)

## 🙏 Credits

Based on the [jQuery TabInterface plugin](https://github.com/easy-designs/jquery.TabInterface.js) by Aaron Gustafson.
