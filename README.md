# 🚀 Rocket Tom Select

A Datastar **Rocket** web component wrapping [Tom Select](https://tom-select.js.org/).
Requires a [Datastar Pro](https://data-star.dev/datastar_pro) license for the Rocket plugin.

## Quick Start

```bash
npm install
npm run dev
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
