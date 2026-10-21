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
| `movable-columns` | bool | `true` | Allow column drag reorder (default flipped to `true` 2026-08-19 — every grid reorders by header drag; set `"false"` per grid to turn it off) |
| `resizable-columns` | bool | `true` | Allow column resize |
| `enable-row-click` | bool | `false` | Attach row click handlers |
| `selectable-rows` | bool | `false` | Show checkbox column for row selection |
| `initial-sort` | str | `""` | JSON string of `[{column, dir}]` sort config. Restored on build: the sort is **applied** (rows reordered) after the table is built, including for grids that build empty and stream rows in via a later data swap — not merely registered. |
| `filter-bar` | bool | `false` | Show a blue active-filter status footer (legacy-grid style). Summarizes the live header + programmatic filters as `(Title op value) AND …`, plus an `N of M rows` count and a clear-all (`✕`) button. Collapses when no filter is active. |
| `lock-column-order` | bool | `false` | Make the column picker **hide/show only** — omits the drag-to-reorder grip and drag handlers. Other reorder paths (header drag via `movable-columns`) are unaffected. |
| `column-calcs` | str | `""` | Tabulator column-calculation placement: `""` (off), `both`, `group`, or `table`. `both`/`group` produce per-group subtotal rows when grouping. Per-column `bottomCalc` in the column defs is independent of this. |
| `group-toggle` | str | `""` | Group toggle element (maps to Tabulator `groupToggleElement`): `""` (default arrow), `header` (whole group header click-toggles collapse), or `arrow`. |
| `group-by` | str | `""` | Open the grid grouped by this field; group header shows `field : value (n items)`. Runtime regrouping via `_tabInstance.setGroupBy()`. |
| `initial-filters` | str | `""` | JSON `[{field, value}]` header filters applied once the table is built (server-saved state). |
| `row-index` | str | `""` | Field name used as the Tabulator row index (`index`). |
| `selection-checkbox` | bool | `true` | With `selectable-rows`: show the leading checkbox column. `"false"` keeps row-highlight selection without the checkbox. |
| `movable-rows` | bool | `false` | Drag rows to reorder (Tabulator `movableRows`, construction-time only). Pair with a `rowHandle: true` column and listen for `rowMoved` on `_tabInstance`. |

Two host properties are also exposed for grids driven post-construction:

- **`host._tabReady`** — a promise resolving after `tableBuilt`. Grids that call `host._tabInstance.setColumns()/replaceData()` after construction (columns carrying live formatter/sorter closures that can't go through the JSON `columns` attribute) must `await` it so resize handles bind.
- **`host._checklistFilter`** — the Apply/Clear checklist header-filter factory, for those same post-construction grids to resolve the `checklistFilter` token themselves.
- **`host._resolveColumns(defs)`** — run string tokens (below) through the resolver before a post-construction `setColumns(defs)`; the `setColumns` hook only adds the export date accessor, on purpose.
- **`host._setRows(rows)`** — hand a row **array** to the grid: waits for `tableBuilt`, `setData`, then re-asserts the active sort. Column state, filters and layout survive. Nulled on disconnect.
- **`window._rkSetRows(ids, rows)`** (module-level global) — `_setRows` for one id or an array of ids, retried every 100 ms for ~15 s while a host is not on the page / not built yet (latest rows per id win). **This is how a server sends rows** — `sse.executeScript(\`window._rkSetRows('grid-id', ${jsonForScript(rows)})\`)` — instead of patching a stringified signal bound with `data-attr:data`, which held the rowset three times (signal-store string, DOM attribute, Tabulator data) and JSON-encoded it twice. Bulk rows never belong in a signal; if a grid must stay signal-fed, name the signal with a leading `_` so Datastar never sends it back to the server.

### Events

| Event | Detail | Description |
|---|---|---|
| `tab-row-click` | `{ row: object }` | Fires on row click (requires `enable-row-click`) |
| `tab-rows-selected` | `{ rows: array }` | Fires on select/deselect (requires `selectable-rows`) |
| `tab-columns-changed` | `{ columns: [{field, visible, width}] }` | Debounced 600ms on column move/resize/visibility change |
| `tab-sorted` | `{ sorters: [{field, dir, title}] }` | Fires on every sort change (header click or programmatic `setSort`) **and once after build** for the initial/restored state. `sorters` is **primary-first** (Tabulator reports multi-column sort last-primary; the event reverses it) and carries each column's display `title`. `sorters` is `[]` when no sort is applied. Use it to render a "Sorted by …" label that survives reload + search. The live payload is also cached on the host as `_lastSorters` for consumers that wire up after the build-time emit. |

**Multi-column sort (2026-10-21):** click = one column; **Ctrl / Shift + click**
adds the column as the next (lower-priority) sort, so click order = sort
order; Ctrl+click a sorted column again flips asc → desc → removes it. With
2+ sorts each sorted header shows a rank number (`span.rk-sort-rank`,
1 = primary). The component handles the modified click itself because
Tabulator's own Ctrl+click made the column clicked LAST the primary. See
`tabulator-rocket.md`.

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
| `isoDate` | `formatter` | Renders an ISO `YYYY-MM-DD[THH:mm…]` value as `MM/DD/YYYY`; auto-pairs with the `mmddyyyy` sorter. Export writes the displayed form (every column gets a default `accessorDownload` — date-like raw values export as rendered, never ISO). |
| `money` | `sorter` | Numeric sort of `$-1,234.00`-style strings. **Auto-applied** to `formatter: "money"`/`"signedMoney"` and `bottomCalc: "moneySum"` columns without a sorter. |
| `moneySum` | `bottomCalc` / `topCalc` | Sums money strings or numbers to a `$x,xxx.xx` total; the group-bar subtotals use it. |
| `notesWrap` | `formatter` | Wrapping multi-line text cell + a hover tooltip that is a text-only **element** (Tabulator 6.3 writes a string tooltip with innerHTML — a stored-XSS vector). |
| `scanPaymentSearch` | `formatter` | "🔍 pay" link calling `window._searchScanPayments(id, townId, lastName)`. _App-oriented._ |
| `app:<name>` | `formatter` | **App registry**: resolved against `window._rkFormatters[name]` — define the registry in the app's shared script before the grid builds, and JSON column defs can name app formatters the component never heard of. `pt:<name>` is the parktowerDS spelling (registry `window._ptFormatters`; `pt:mdy` also gets the `mmddyyyy` sorter). An unregistered name is left as the string. |

The `_App-oriented_` tokens encode brm-app navigation contracts
(`window.openClaimTab` / `window._loadScansFor`); they're inert unless a column
opts in by name, so they're harmless for generic grids.

### Notes

- `columns` and `data` use `str` type (not `json`) to avoid Datastar signal proxy issues
- Data updates are gated behind the `tableBuilt` event via a `tabReady` promise
- Rows after build arrive through `host._setRows(rows)` / `window._rkSetRows(ids, rows)` — one `setData()` (never a rebuild) that keeps column state, filters and the active sort. A bound `data-attr:data="$_signal"` attribute still works through the same `applyRows` path, but is kept only as an example (starter pages); bulk rows do not belong in signals.
- Column state changes are debounced 600ms before emitting `tab-columns-changed`

### Source of truth & sync (2026-10-13)

`static/components/tabulator-rocket.js` **in this repo is the one place the
component is edited.** Ten apps carry a copy (datastar-fastify-sdk/components,
brm_FlowDS, brm_websiteDS, galleryHelen/John/Ken/Nina/Vector, parktowerDS,
gail_parenteau); they used to drift (505 … 1,066 lines, parktower with its
own `pt:` hook). Now:

```bash
node scripts/sync-components.mjs --check     # report drift, exit 1 if any (write nothing)
node scripts/sync-components.mjs --write     # copy the canonical to every target
node scripts/sync-components.mjs --write --all   # also tom-select-rocket.js / echarts-rocket.js
```

The sync keeps each target's **own** `import { rocket } from '…'` line (the
bundle path and `?v=` buster differ per app: `/static/datastar-rocket.js` here,
`/public/js/datastar-rocket.js` in the SDK, `/public/js/datastar-pro.js[?v=…]`
in the Pro apps) and its line endings; everything below the import is
byte-identical. The component is the same code on the free Rocket bundle and on
a Pro ≥ 1.0.1 bundle (Rocket beta.1 → beta.2 was bug fixes only). Workflow: fix
here → `--check` → `--write` → run each app's own tests → commit each app
yourself (the script never touches git). Add a target line to the script when a
new app gets a copy; a missing file is reported and skipped, never created.

---

## Datastar 1.0.4 Compliance Notes

- All attributes use the colon syntax: `data-on:click`, `data-signals:name`
- Signals referenced with `$` prefix, actions with `@` prefix
- Backend uses `@post()` for mutations, `@get()` — or `@query()` (1.0.4, signals in the request body) — for reads
- SDK uses `reply.datastar()` + `sse.patchElements()` / `sse.patchSignals()`; inbound signals come from `request.readSignals()` (the RC-era `datastar-signals` request header no longer exists)
- No use of removed watchers (`RemoveFragments`, `RemoveSignals`, `ExecuteScript`) — only `datastar-patch-elements` / `datastar-patch-signals`
- Rocket is the 1.0 JavaScript API (`rocket('tag', { props, render, onFirstRender })`), shipped in the free `datastar-rocket.js` bundle since 1.0.4 (Rocket beta.2); the RC.8 `<template data-rocket:>` syntax is gone

## Rocket 1.0 Prop Codec Quick Reference

Props are declared in `props: (codecs) => ({ ... })`; attribute names are kebab-case (`maxItems` → `max-items`). Invalid input falls back to the codec default.

| Codec | Decoded type | Zero value | Chainable |
|---|---|---|---|
| `string` | string | `''` | `.trim` `.upper` `.lower` `.kebab` `.camel` `.snake` `.pascal` `.title` `.prefix(s)` `.suffix(s)` `.maxLength(n)` `.default(v)` |
| `number` | number | `0` | `.min(n)` `.max(n)` `.clamp(a,b)` `.step(s, base?)` `.round` `.ceil(d?)` `.floor(d?)` `.fit(...)` `.default(v)` |
| `bool` | boolean | `false` | `.default(v)` — `""`, `"true"`, `"1"` are truthy |
| `date` | Date | now | `.default(() => new Date())` |
| `json` | any | `{}` | `.default(v)` (strict JSON) |
| `js` | any | `{}` | `.default(v)` — JS-like object literals, revives function strings (used by `<rocket-echarts option>`) |
| `bin` | Uint8Array | empty | base64 in/out |
| `array(codec)` / `array(a, b, …)` | T[] / tuple | `[]` | `.default(v)` |
| `object(shape)` | typed object | per-field defaults | `.default(v)` |
| `oneOf(...)` | union | first entry | `.default(v)` |

Custom codecs: `createCodec({ decode, encode })`, exported from the bundle next to `rocket`.

## File Structure

```
DataStar-Rocket/
  server.js                 -- Fastify server with sample data + SSE endpoints
  tom-select-rocket.html    -- Standalone Tom Select demo page
  tabulator-rocket.html     -- Standalone Tabulator demo page
  rocket.md                 -- This file
  static/
    datastar-rocket.js      -- Datastar v1.0.4 + Rocket beta.2 (free MIT bundle, committed)
    datastar-pro.js         -- optional Datastar Pro bundle (licensed, git-ignored; the Pro v1.0.4 build also includes Rocket)
    datastar-inspector.js   -- Datastar Inspector dev tool (Pro, git-ignored, optional)
    components/
      tom-select-rocket.js  -- <rocket-tom-select>
      tabulator-rocket.js   -- <rocket-tabulator>
      echarts-rocket.js     -- <rocket-echarts>
```
