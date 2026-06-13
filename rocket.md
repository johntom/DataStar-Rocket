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
| `initial-sort` | str | `""` | JSON string of `[{column, dir}]` sort config. Restored on build: the sort is **applied** (rows reordered) after the table is built, including for grids that build empty and stream rows in via a later data swap — not merely registered. |
| `filter-bar` | bool | `false` | Show a blue active-filter status footer (legacy-grid style). Summarizes the live header + programmatic filters as `(Title op value) AND …`, plus an `N of M rows` count and a clear-all (`✕`) button. Collapses when no filter is active. |
| `lock-column-order` | bool | `false` | Make the column picker **hide/show only** — omits the drag-to-reorder grip and drag handlers. Other reorder paths (header drag via `movable-columns`) are unaffected. |
| `column-calcs` | str | `""` | Tabulator column-calculation placement: `""` (off), `both`, `group`, or `table`. `both`/`group` produce per-group subtotal rows when grouping. Per-column `bottomCalc` in the column defs is independent of this. |
| `group-toggle` | str | `""` | Group toggle element (maps to Tabulator `groupToggleElement`): `""` (default arrow), `header` (whole group header click-toggles collapse), or `arrow`. |

Two host properties are also exposed for grids driven post-construction:

- **`host._tabReady`** — a promise resolving after `tableBuilt`. Grids that call `host._tabInstance.setColumns()/replaceData()` after construction (columns carrying live formatter/sorter closures that can't go through the JSON `columns` attribute) must `await` it so resize handles bind.
- **`host._checklistFilter`** — the Apply/Clear checklist header-filter factory, for those same post-construction grids to resolve the `checklistFilter` token themselves.

### Events

| Event | Detail | Description |
|---|---|---|
| `tab-row-click` | `{ row: object }` | Fires on row click (requires `enable-row-click`) |
| `tab-rows-selected` | `{ rows: array }` | Fires on select/deselect (requires `selectable-rows`) |
| `tab-columns-changed` | `{ columns: [{field, visible, width}] }` | Debounced 600ms on column move/resize/visibility change |
| `tab-sorted` | `{ sorters: [{field, dir, title}] }` | Fires on every sort change (header click or programmatic `setSort`) **and once after build** for the initial/restored state. `sorters` is **primary-first** (Tabulator reports multi-column sort last-primary; the event reverses it) and carries each column's display `title`. `sorters` is `[]` when no sort is applied. Use it to render a "Sorted by …" label that survives reload + search. The live payload is also cached on the host as `_lastSorters` for consumers that wire up after the build-time emit. |

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

<!-- Sort label: reflect the current sort, restored on reload + kept through search -->
<div data-signals:sortLabel="''">
  <span data-show="$sortLabel" data-text="'Sorted by ' + $sortLabel"></span>
  <rocket-tabulator
    columns='[{"title":"Name","field":"name"},{"title":"Date","field":"date"}]'
    data='[{"name":"Alice","date":"2026-01-01"}]'
    initial-sort='[{"column":"date","dir":"desc"}]'
    data-on:tab-sorted="$sortLabel = evt.detail.sorters.map(function(s){return s.title + ' ' + s.dir}).join(', ')"
  ></rocket-tabulator>
</div>

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

### Formatter & sorter tokens

Column defs are JSON-serialized server-side, and `JSON.stringify` drops
function-valued props — so a `formatter`/`sorter` **function** set on the server
never reaches the client. Instead set a **string token** the component resolves
to the real function at build time (in `resolveColumnHelpers`):

| Token | Applies to | Behaviour |
|---|---|---|
| `mmddyyyy` | `sorter` | Chronological sort handling both `MM/DD/YYYY` (display) and `YYYY-MM-DD` (ISO) cell values. Blank/unparseable sort to the bottom. **Auto-applied** to any column with `headerFilter: "date"` or `formatter: "isoDate"` that didn't set a sorter. |
| `signedMoney` | `formatter` | Renders negative (credit) amounts in red; positive/blank pass through. Pairs with a pre-formatted `"$-1,234.00"` cell value. |
| `statusBadge` | `formatter` | Status pill — accepts the label (`Open`/`Closed`/`ReOpen`) **or** the raw code (`1`/`2`/`3`), emits a `.cdf-status` span (green open / red closed). _App-oriented._ |
| `openClaimButton` | `formatter` | Renders a primary "Open" button calling `window.openClaimTab(id, claimNo, townId)`; reads `WCompID`/`LiabilityID` + `TownID` from the row. _App-oriented._ |
| `accountScanLink` | `formatter` | Account cell as a link calling `window._loadScansFor(id, townId)` (`stopPropagation` so a row-click open still works). _App-oriented._ |
| `checklistFilter` | `headerFilter` | Apply/Clear multi-select checklist filter. Resolved automatically for JSON columns; for post-construction grids use `host._checklistFilter` (see Props). |

The `_App-oriented_` tokens encode brm-app navigation contracts
(`window.openClaimTab` / `window._loadScansFor`); they're inert unless a column
opts in by name, so they're harmless for generic grids.

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
