# 🚀Rocket Tom Select with datastar 1.0.1    
  
A Datastar **Rocket** version 1 web component wrapping [Tom Select](https://tom-select.js.org/).
Both rockets requires a [Datastar Pro](https://data-star.dev/datastar_pro) License.

## Version

| Field          | Value        |
| -------------- | ------------ |
| `VERSION`      | `2.0.7` |
| `VERSION_date` | `06/12/26` |
| `VERSION_mess` | `Uses Datastar-pro 1.0.1 - fixed same dialog on different views` |

<!--Live Demo: [demo on render](https://datastar-fastify-example-book.onrender.com/)-->

## Quick Start

```bash
npm install
 copy your datastar-pro.js file to \static 
npm run dev 
or
npm run start
# → http://localhost:3000
```

## Component API

### `<rocket-tom-select>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | string | `"Select..."` | Placeholder text |
| `max-items` | int | `1` | Max selectable items |
| `options` | string (JSON) | `""` | JSON array of `{value, text, ...}` objects |
| `value` | string | `""` | Current value (comma-separated for multi); reflected back to the `value` attribute on change |
| `allow-create` | boolean | `false` | Allow creating new items |
| `detail-field` | string | `""` | Comma-separated extra fields to render in the dropdown / selected pill (e.g. `"origin,season"`) |
| `search-url` | string | `""` | Backend URL for remote search (`?q=` → JSON `[{value,text}]`) |
| `check-options` | boolean | `false` | Checkbox multi-select with Apply/Clear buttons |
| `dropdown-parent` | string | `""` | Selector for the element the dropdown is rendered into (e.g. `"body"`) |
| `auto-select-single` | boolean | mode-dependent | When typing narrows the dropdown to a single match, auto-resolve it (single-select: `setValue` + close; multi: `addItem` + clear textbox so the user can keep filtering). **Defaults ON for single-select** (`max-items=1`, no `check-options`); **OFF for multi / check-options**. Override either way with `auto-select-single="true"` / `"false"`. Re-read live, so it can be toggled at runtime via `setAttribute`. |

### Events

The component emits a `ts-change` CustomEvent on the host element with `detail.value` containing the selected value(s) — comma-separated when multi-select. Bind it with `data-on:ts-change`.

### Usage Examples

**Single select with static options (plus extra detail columns):**
```html
<div data-signals:fruit="''">
  <rocket-tom-select
    placeholder="Pick one..."
    options='[{"value":"apple","text":"Apple","origin":"Central Asia"}]'
    detail-field="origin"
    data-on:ts-change="$fruit = evt.detail.value"
  ></rocket-tom-select>
</div>
```

**Multi-select with tagging:**
```html
<rocket-tom-select
  placeholder="Choose..."
  max-items="5"
  options='[...]'
  data-on:ts-change="$items = evt.detail.value"
></rocket-tom-select>
```

**Remote search:**
```html
<rocket-tom-select
  placeholder="Search..."
  search-url="/api/search"
  data-on:ts-change="$user = evt.detail.value"
></rocket-tom-select>
```

The search endpoint should accept `?q=query` and return JSON: `[{value, text}, ...]`

**Checkbox multi-select with Apply/Clear:**
```html
<rocket-tom-select
  placeholder="All"
  check-options
  options='[{"value":"1","text":"Open"},{"value":"2","text":"Closed"}]'
  data-on:ts-change="$status = evt.detail.value; @get('/api/search')"
></rocket-tom-select>
```

When `check-options` is set, the dropdown shows checkboxes next to each option with Apply and Clear buttons pinned at the bottom. Selections are not committed until Apply is clicked. Clear deselects all and fires the change event. Use hyphenated `check-options` (not `checkbox`) to avoid conflicts with Datastar signal binding.

**Creatable tags with backend sync:**
```html
<rocket-tom-select
  placeholder="Add tags..."
  max-items="10"
  allow-create="true"
  data-on:ts-change="$tags = evt.detail.value; @post('/api/save-tags')"
></rocket-tom-select>
```

## How It Works

This is a **Datastar Pro v1.0.1 JS-API component**, not an RC-era `<template data-rocket:>`. It is implemented in `static/components/tom-select-rocket.js` and registered with:

```js
import { rocket } from '/static/datastar-pro.js'
rocket('rocket-tom-select', { mode: 'light', renderOnPropChange: false, props, render, onFirstRender })
```

1. **Registers** the `<rocket-tom-select>` element via `rocket(tag, def)` (light DOM, `renderOnPropChange: false`)
2. **Declares typed props** in `props: ({ string, number, bool }) => ({ ... })` — read from plain HTML attributes
3. **Renders** a single `<select data-rocket-ref="selectEl">` accessed in code as `refs.selectEl`
4. **Self-loads** the Tom Select JS from the CDN by injecting a `<script>` (only the CSS `<link>` is needed in the page)
5. **Initializes** the Tom Select instance in `onFirstRender` once the script resolves
6. **Syncs** `options` and `value` reactively via `observeProps(...)`; on user change it reflects back to the `value` attribute and calls `emit('ts-change', { value })`
7. **Cleans up** via `cleanup()` — destroys the Tom Select instance when the element leaves the DOM

### Props & Binding

- Props are set as **plain attributes** (`placeholder="..."`, `options='[...]'`) or reactively via `data-attr:` — each element instance is isolated
- `$fruit`, `$selectedUser`, etc. are **page signals** — shared across the page
- The `data-on:ts-change` handler bridges the component → page signals via `evt.detail.value`

## CSS

The component self-loads the Tom Select **JS** from the CDN, so only the **CSS** is required in the page. It uses **light DOM** (`mode: 'light'`, no shadow DOM), so styles apply naturally.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.1/dist/css/tom-select.css" />
```

---

## Rocket Tabulator Component v1.0.1

A Datastar **Rocket** v1.0.1 JS-API web component wrapping [Tabulator 6.3](https://tabulator.info/). Implemented in `static/components/tabulator-rocket.js`; demo page is `tabulator-rocket.html`. Unlike the Tom Select component, this one expects `window.Tabulator` to be **preloaded** — include the Tabulator JS `<script>` in the page.

### `<rocket-tabulator>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | string (JSON) | `""` | Tabulator column definitions |
| `data` | string (JSON) | `""` | Row data array |
| `height` | string | `"311px"` | CSS height for the grid |
| `layout` | string | `"fitColumns"` | Tabulator layout mode |
| `placeholder` | string | `"No Data"` | Empty-table message |
| `movable-columns` | boolean | `false` | Allow column drag reorder |
| `resizable-columns` | boolean | `true` | Allow column resize |
| `enable-row-click` | boolean | `false` | Attach row click handlers |
| `selectable-rows` | boolean | `false` | Show checkbox column for row selection |
| `initial-sort` | string (JSON) | `""` | Sort config `[{column, dir}]` |
| `initial-filters` | string (JSON) | `""` | Server-saved header filters `[{field, value}]`, applied once the table is built |
| `row-index` | string | `""` | Field name to use as the Tabulator row index |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `tab-row-click` | `{ row }` | Fired on row click (when `enable-row-click` is true) |
| `tab-rows-selected` | `{ rows }` | Fired on selection change (when `selectable-rows` is true) |
| `tab-columns-changed` | `{ columns }` | Debounced 600ms on column move/resize/visibility change |

### Usage Examples

**Basic grid with filters and sorting:**
```html
<rocket-tabulator
  columns='[{"title":"Name","field":"name","headerFilter":true}]'
  data='[{"name":"Alice"},{"name":"Bob"}]'
  height="320px"
  movable-columns="true"
  initial-sort='[{"column":"name","dir":"asc"}]'
></rocket-tabulator>
```

**Row click with detail display:**
```html
<div data-signals:clicked="''">
  <rocket-tabulator
    columns='[{"title":"Name","field":"name"}]'
    data='[{"name":"Alice"}]'
    enable-row-click="true"
    data-on:tab-row-click="$clicked = JSON.stringify(evt.detail.row)"
  ></rocket-tabulator>
  <span data-text="$clicked"></span>
</div>
```

**Selectable rows with checkboxes:**
```html
<div data-signals:count="0">
  <rocket-tabulator
    columns='[{"title":"Name","field":"name"}]'
    data='[{"name":"Alice"},{"name":"Bob"}]'
    selectable-rows="true"
    data-on:tab-rows-selected="$count = evt.detail.rows.length"
  ></rocket-tabulator>
  <span data-text="$count + ' selected'"></span>
</div>
```

**Dynamic data swap:**
```html
<rocket-tabulator
  columns='[{"title":"Name","field":"name"}]'
  data='[{"name":"Alice"}]'
  data-attr:data="$filteredData"
></rocket-tabulator>
```

Use `data-attr:data` to bind a signal — the component calls `setData()` internally, preserving column state, sort, and filters.

### Custom Header Filter: `checklistFilter`

A built-in multi-select checklist header filter with search, checkboxes, and Apply/Clear buttons. Use it by setting `headerFilter: "checklistFilter"` in a column definition — the component replaces the string with the actual editor function before Tabulator init.

```javascript
{
  title: "Dept",
  field: "DeptDesc",
  width: 90,
  headerFilter: "checklistFilter",  // activates checklist dropdown
  headerFilterFunc: "in"             // Tabulator built-in array filter
}
```

**Features:**
- Auto-populates unique values from column data
- Search box to narrow the list
- Checkboxes for multi-selection
- Apply button commits the filter (emits the selected array; pair with `headerFilterFunc: "in"`), Clear button resets it
- Display shows "N selected" when active
- Dropdown appended to `document.body` (`position:fixed`) to escape header `overflow:hidden`
- Per-cell listeners are torn down on component cleanup

### String-resolved Column Helpers

The same resolution pass also swaps these string placeholders in column definitions for built-in functions:

| Definition key | String value | Effect |
|----------------|--------------|--------|
| `formatter` | `"isoDate"` | Formats `YYYY-MM-DD…` values as `MM/DD/YYYY` |
| `formatter` | `"notesWrap"` | Wrapping multi-line cell; click opens a full-text popup (also sets a truncating tooltip) |
| `headerFilter` | `"checklistFilter"` | The multi-select checklist filter above |

### Column Picker: `_showColPicker(anchorEl)`

A built-in column picker with visibility checkboxes and drag-to-reorder. Call it from any button via the element method:

```html
<button data-on:click="document.getElementById('my-grid')._showColPicker(el)">
  Columns
</button>
<rocket-tabulator id="my-grid" columns='...' data='...'></rocket-tabulator>
```

**Features:**
- Checkboxes to toggle column visibility
- Drag handles (⠇) to reorder columns via drag-and-drop
- Calls Tabulator's `moveColumn()` to reorder the grid on drop
- Emits `tab-columns-changed` event after reorder or visibility change
- Multi-column popup layout based on field count: `Math.ceil(fields / 30)` columns
  - 1–30 fields → 1 column
  - 31–60 fields → 2 columns
  - 61–90 fields → 3 columns
- Toggle: clicking the button again closes the picker
- Appended to `document.body` with `position:fixed`

### CSS

Tabulator CSS is loaded globally via `<link>` tag:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.0/dist/css/tabulator_modern.min.css" />
```
