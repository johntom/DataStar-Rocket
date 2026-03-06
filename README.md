# 🚀Rocket Tom Select RC.8  

A Datastar **Rocket** version .8 web component wrapping [Tom Select](https://tom-select.js.org/).
Both rockets require a [Datastar Pro](https://data-star.dev/datastar_pro) 

to run demo
1. npm install
2. copy your datastar-pro.js file to the static directory
3. 
<!--Live Demo: [demo on render](https://datastar-fastify-example-book.onrender.com/)-->

## Quick Start

```bash
npm install
 copy your datastar-pro.js file \static 
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

### CSS

Tabulator CSS is loaded globally via `<link>` tag:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.0/dist/css/tabulator_modern.min.css" />
```
