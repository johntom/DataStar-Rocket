# Rocket Web Components — Documentation

> Datastar RC.8 + Rocket component library wrapping Tom Select and Tabulator.
> Server: Fastify + `@johntom/datastar-fastify` SDK

---

## rocket-tom-select

A Datastar Rocket web component wrapping [Tom Select 2.x](https://tom-select.js.org/).

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | str | `"Select..."` | Placeholder text when nothing is selected |
| `max-items` | int(min(1)) | `1` | Max selectable items; 1 = single-select |
| `options` | str | `""` | JSON string of `[{value, text, ...}]` option objects |
| `value` | str | `""` | Comma-separated initial/current value(s) |
| `allow-create` | bool | `false` | Allow user to type new entries |
| `detail-field` | str | `""` | Comma-separated extra field names for multi-column dropdown (e.g. `"origin,season"`) |
| `search-url` | str | `""` | Remote search URL; appends `?q=term` |

### Events

| Event | Detail | Description |
|---|---|---|
| `ts-change` | `{ value: string }` | Fires on selection change. Value is comma-separated for multi-select |

### Usage

```html
<!-- Single select with three-column dropdown -->
<rocket-tom-select
  placeholder="Pick a fruit..."
  options='[{"value":"apple","text":"Apple","origin":"Central Asia","season":"Fall"}]'
  detail-field="origin,season"
  data-on:ts-change="$selectedFruit = evt.detail.value"
></rocket-tom-select>

<!-- Multi-select with tags -->
<rocket-tom-select
  placeholder="Choose fruits..."
  max-items="5"
  options='[{"value":"a","text":"Apple"}]'
  data-on:ts-change="$selectedFruits = evt.detail.value"
></rocket-tom-select>

<!-- Remote search -->
<rocket-tom-select
  placeholder="Search users..."
  search-url="/api/search/users"
  data-on:ts-change="$selectedUser = evt.detail.value"
></rocket-tom-select>

<!-- Creatable tags with backend sync -->
<rocket-tom-select
  placeholder="Add tags..."
  max-items="10"
  allow-create="true"
  options='[{"value":"js","text":"JavaScript"}]'
  data-on:ts-change="$tags = evt.detail.value; @post('/api/save-tags')"
></rocket-tom-select>
```

### Detail Field (Multi-Column Dropdown)

When `detail-field` is set, the dropdown renders extra columns on the right. Multiple fields are comma-separated.

- Dropdown: `text` on the left, detail values right-aligned in muted text
- Selected pill: all fields joined with ` . ` separator
- All detail fields are included in the search index

```
Apple          Central Asia      Fall
Banana       Southeast Asia      Year-round
```

### Notes

- `options` uses `str` type (not `json`) to avoid Datastar signal proxy issues with arrays
- Use custom event name `ts-change` (not `change`) to avoid Rocket internal prop-init events
- All `$$signal` reads are coerced to primitives before use (`'' + $$prop`, `+$$prop`, `!!$$prop`)
- When `max-items > 1`, the `remove_button` plugin is automatically enabled
- Options can be updated dynamically via the `options` prop — the component detects changes and calls `clearOptions`/`addOptions`
- Value can be synced externally — the component watches `$$value` and calls `setValue`/`clear`

---

## rocket-tabulator

A Datastar Rocket web component wrapping [Tabulator 6.3](https://tabulator.info/).

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | str | `""` | JSON string of Tabulator column definitions |
| `data` | str | `""` | JSON string of row data array |
| `height` | str | `"311px"` | CSS height for the grid |
| `layout` | str | `"fitColumns"` | Tabulator layout mode |
| `placeholder` | str | `"No Data"` | Empty-table message |
| `movable-columns` | bool | `false` | Allow column drag reorder |
| `resizable-columns` | bool | `true` | Allow column resize |
| `enable-row-click` | bool | `false` | Attach row click handlers |
| `selectable-rows` | bool | `false` | Show checkbox column for row selection |
| `initial-sort` | str | `""` | JSON string of `[{column, dir}]` sort config |

### Events

| Event | Detail | Description |
|---|---|---|
| `tab-row-click` | `{ row: object }` | Fires on row click (requires `enable-row-click`) |
| `tab-rows-selected` | `{ rows: array }` | Fires on select/deselect (requires `selectable-rows`) |
| `tab-columns-changed` | `{ columns: [{field, visible, width}] }` | Debounced 600ms on column move/resize/visibility change |

### Usage

```html
<!-- Basic grid with sorting and filters -->
<rocket-tabulator
  columns='[{"title":"Name","field":"name","headerFilter":true}]'
  data='[{"name":"Alice"}]'
  height="320px"
  layout="fitColumns"
  movable-columns="true"
  initial-sort='[{"column":"name","dir":"asc"}]'
></rocket-tabulator>

<!-- Row click -->
<rocket-tabulator
  columns='[{"title":"Name","field":"name"}]'
  data='[{"name":"Alice"}]'
  enable-row-click="true"
  data-on:tab-row-click="$clicked = JSON.stringify(evt.detail.row)"
></rocket-tabulator>

<!-- Checkbox selection + row click dialog -->
<div style="position:relative"
     data-signals:selectedCount="0"
     data-signals:selectedIds="''"
     data-signals:dlgOpen="false"
     data-signals:dlgName="''">

  <rocket-tabulator
    columns='[{"title":"Name","field":"name"}]'
    data='[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]'
    selectable-rows="true"
    enable-row-click="true"
    data-on:tab-rows-selected="$selectedCount = evt.detail.rows.length; $selectedIds = evt.detail.rows.map(function(r){return r.id}).join(', ')"
    data-on:tab-row-click="$dlgName = evt.detail.row.name; $dlgOpen = true"
  ></rocket-tabulator>

  <div class="output">
    Selected: <strong data-text="$selectedCount"></strong>
    -- IDs: <span data-text="$selectedIds || '(none)'"></span>
  </div>

  <!-- Dialog centered over the grid -->
  <div data-show="$dlgOpen" style="position:absolute;inset:0;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:10">
    <div style="background:#fff;border-radius:6px;padding:.75rem 1rem;width:220px">
      <p><strong>Name:</strong> <span data-text="$dlgName"></span></p>
      <button data-on:click="$dlgOpen = false">Close</button>
    </div>
  </div>
</div>

<!-- Dynamic data swap -->
<rocket-tabulator
  columns='[{"title":"Name","field":"name"}]'
  data='[{"name":"Alice"}]'
  data-attr:data="$empData"
  height="280px"
></rocket-tabulator>
```

### Selectable Rows

When `selectable-rows="true"`:
- A frozen checkbox column is prepended (header checkbox = select all)
- Tabulator's `selectableRows` is enabled
- `tab-rows-selected` fires on every select/deselect with `detail.rows` containing selected row data

### Notes

- `columns` and `data` use `str` type (not `json`) to avoid Datastar signal proxy issues
- Data updates are gated behind the `tableBuilt` event via a `tabReady` promise
- Dynamic data swap via `data-attr:data="$signal"` preserves column state, sort, and filters
- The component calls `setData()` (not full rebuild) when data changes
- Column state changes are debounced 600ms before emitting `tab-columns-changed`

---

## Datastar RC.8 Compliance Notes

- All attributes use RC.6+ colon syntax: `data-on:click`, `data-signals:name`
- Signals referenced with `$` prefix, actions with `@` prefix
- Backend uses `@post()` for mutations, `@get()` for reads
- SDK uses `reply.datastar()` + `sse.patchElements()` / `sse.patchSignals()`
- No use of removed RC.8 watchers (`RemoveFragments`, `RemoveSignals`, `ExecuteScript`)
- Rocket props use RC.8 function-call syntax: `int(min(1))`, `str='default'`, `bool`

## Rocket RC.8 Prop Syntax Quick Reference

| Type | Syntax | Implicit Default |
|---|---|---|
| String | `str` or `str='fallback'` | `''` |
| Integer | `int` or `int(min(0))` | `0` |
| Number | `num` or `num(clamp(0,1))` | `0` |
| Boolean | `bool` or `bool=true` | `false` |
| JSON | `json` | `null` |

## File Structure

```
DS-TS-Webcompfiles/
  server.js                 -- Fastify server with sample data + SSE endpoints
  tom-select-rocket.html    -- Standalone Tom Select component definition
  tabulator-rocket.html     -- Standalone Tabulator component definition
  rocket.md                 -- This file
  static/
    datastar-pro.js         -- Datastar Pro + Rocket bundle (RC.8)
    datastar-inspector.js   -- Datastar inspector element
```
