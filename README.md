# 🚀Rocket Tom Select with datastar 1.0.1  

A Datastar **Rocket** version 1 web component wrapping [Tom Select](https://tom-select.js.org/).
Both rockets requires a [Datastar Pro](https://data-star.dev/datastar_pro) License.

## Version

| Field          | Value        |
| -------------- | ------------ |
| `VERSION`      | `2.0.1` |
| `VERSION_date` | `05/16/26` |
| `VERSION_mess` | `Uses Datastar-pro 1.0.1` |

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
| `options` | json | `[]` | Array of `{value, text}` objects |
| `value` | string | `""` | Current value (comma-separated for multi) |
| `allow-create` | boolean | `false` | Allow creating new items |
| `search-url` | string | `""` | Backend URL for remote search |
| `check-options` | boolean | `false` | Checkbox multi-select with Apply/Clear buttons |

### Events

The component dispatches a `change` CustomEvent with `detail.value` containing the selected value(s).

### Usage Examples

**Single select with static options:**
```html
<div data-signals:fruit="''">
  <rocket-tom-select
    data-attr:placeholder="'Pick one...'"
    data-attr:options='[{"value":"a","text":"Apple"}]'
    data-on:change="$fruit = evt.detail.value"
  ></rocket-tom-select>
</div>
```

**Multi-select with tagging:**
```html
<rocket-tom-select
  data-attr:placeholder="'Choose...'"
  data-attr:max-items="'5'"
  data-attr:options='[...]'
  data-on:change="$items = evt.detail.value"
></rocket-tom-select>
```

**Remote search:**
```html
<rocket-tom-select
  data-attr:placeholder="'Search...'"
  data-attr:search-url="'/api/search'"
  data-on:change="$user = evt.detail.value"
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
  data-attr:placeholder="'Add tags...'"
  data-attr:max-items="'10'"
  data-attr:allow-create="'true'"
  data-on:change="$tags = evt.detail.value; @get('/api/save-tags')"
></rocket-tom-select>
```

## How It Works

The Rocket component:

1. **Defines** via `<template data-rocket:rocket-tom-select>` with typed props
2. **Imports** Tom Select as IIFE via `data-import:TomSelect__iife`
3. **Initializes** when both `$$selectEl` (via `data-ref`) and `TomSelect` are available
4. **Syncs** `$$value` ↔ Tom Select instance bidirectionally using effects
5. **Dispatches** `change` events on the host `el` for Datastar `data-on:change` binding
6. **Cleans up** via `onCleanup()` when the component is removed from DOM

### Signal Scoping

- `$$value`, `$$options`, etc. are **component-scoped** — each instance is isolated
- `$fruit`, `$selectedUser` etc. are **global signals** — shared across the page
- The `data-on:change` bridges component → global via `evt.detail.value`

## CSS

Tom Select CSS is loaded globally via `<link>` tag. The component uses **light DOM** (no shadow DOM), so styles apply naturally.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.1/dist/css/tom-select.css" />
```

---

## Rocket Tabulator Component RC.8  

A Datastar **Rocket** web component wrapping [Tabulator 6.3](https://tabulator.info/). Defined in `tabulator-rocket.html`.

### `<rocket-tabulator>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | string (JSON) | `[]` | Tabulator column definitions |
| `data` | string (JSON) | `[]` | Row data array |
| `height` | string | `"311px"` | CSS height for the grid |
| `layout` | string | `"fitColumns"` | Tabulator layout mode |
| `placeholder` | string | `"No Data"` | Empty-table message |
| `movable-columns` | boolean | `false` | Allow column drag reorder |
| `resizable-columns` | boolean | `true` | Allow column resize |
| `enable-row-click` | boolean | `false` | Attach row click handlers |
| `selectable-rows` | boolean | `false` | Show checkbox column for row selection |
| `initial-sort` | string (JSON) | `[]` | Sort config `[{column, dir}]` |

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
- Apply button commits the filter, Clear button resets it
- Display shows "N selected" when active
- Dropdown appended to `document.body` to escape header `overflow:hidden`

### Column Picker: `_showColPicker(anchorEl)`

A built-in column picker with visibility checkboxes and drag-to-reorder. Call it from any button via the element method:

```html
<button onclick="document.getElementById('my-grid')._showColPicker(this)">
  Columns
</button>
<rocket-tabulator id="my-grid" columns='...' data='...'></rocket-tabulator>
```

**Features:**
- Checkboxes to toggle column visibility
- Drag handles (⠿) to reorder columns via drag-and-drop
- Calls `table.moveColumn()` to reorder the grid on drop
- Emits `tab-columns-changed` event after reorder or visibility change
- Auto-column layout based on field count:
  - `< 20` fields → 1 column
  - `20–39` fields → 2 columns
  - `40+` fields → 3 columns
- Toggle: clicking the button again closes the picker
- Appended to `document.body` with `position:fixed`

### CSS

Tabulator CSS is loaded globally via `<link>` tag:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.0/dist/css/tabulator_modern.min.css" />
```
