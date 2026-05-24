# Editable `rocket-tabulator` grids

How to make `<rocket-tabulator>` grids editable. There are **two distinct
editing patterns** — pick per use case:

| Pattern | Best for | UX |
|---|---|---|
| **Inline cell editing** | Simple, single-field edits over many rows | Click a cell → edit in place → auto-saves on blur |
| **Row-button → modal** | Records with lookups, currency, multi-field validation | Frozen `_edit` button column opens a full modal form |

`<rocket-tabulator>` (`static/components/tabulator-rocket.js`) is a thin
light-DOM wrapper around [Tabulator](https://tabulator.info) 6.3. It does **not**
add an editing layer of its own — editing is plain Tabulator, driven entirely
by the column definitions the server sends in the `columns` attribute.

---

## Pattern 1 — Inline cell editing

Four layers.

### 1. Column definitions declare which fields are editable

A column becomes editable purely by carrying an `editor` key — Tabulator's
native mechanism:

```js
const TASK_COLUMNS = [
  { title: "ID",       field: "id",      width: 70, headerFilter: true },   // no editor → read-only
  { title: "Due",      field: "due",     editor: "date",     formatter: "isoDate" },
  { title: "Assignee", field: "assignee",editor: "list",     editorParams: { _staffLookup: true } },
  { title: "Done",     field: "done",    editor: "tickCross",formatter: "tickCross" },
  { title: "Notes",    field: "notes",   editor: "textarea", formatter: "notesWrap" },
];
```

| Editor | Cell becomes |
|---|---|
| `"date"` | native `<input type=date>` — expects ISO `yyyy-mm-dd` values |
| `"list"` | dropdown; needs `editorParams.values` (an array) |
| `"textarea"` | multi-line text box |
| `"tickCross"` | checkbox |
| *(omitted)* | read-only |

A cell whose column has an `editor` enters edit mode on click; Tabulator fires
a `cellEdited` event when the value changes.

### 2. The route resolves dynamic editor params + tags each row's lock state

Two things often need to happen server-side before the columns ship to the
browser:

- **Resolve runtime values.** A `list` editor whose options aren't known at
  module-load time (staff list, account list, anything from the DB) can use a
  placeholder param, then have the route swap it for a real list:

  ```js
  const staffInits = loadStaffInitials()         // your lookup
  const resolvedCols = columns.map(c =>
    c.editorParams && c.editorParams._staffLookup
      ? { ...c, editorParams:       { values: staffInits },
                headerFilterParams: { values: staffInits } }   // list header-filter needs this too
      : c)
  ```

- **Per-row editability.** Attach an `editable` boolean to each row's data
  (computed from whatever rule applies — ownership, lock window, role). The
  client-side handler in step 4 enforces it.

`resolvedCols` → `columnsJson`, row data → `dataJson`, both rendered into
`<rocket-tabulator columns='…' data='…'>`.

### 3. `rocket-tabulator` passes `editor` straight through

The component only translates **formatter** string placeholders (`isoDate`,
`notesWrap`, etc.) into functions. `editor` and `editorParams` are untouched,
so Tabulator renders the editors natively.

### 4. Inline edits auto-save — and the per-row lock is enforced here

Register a Tabulator `cellEdited` listener that maps grid field → DB column
and PUTs the change:

```js
const _fieldMap = { due: 'Due', assignee: 'Assignee',
                    done: 'Done', notes: 'Notes' };   // grid field → DB column

table.on('cellEdited', function (cell) {
  const dbCol = _fieldMap[cell.getField()];
  if (!dbCol) return;                                       // unmapped column → ignore
  if (cell.getRow().getData().editable === false) {         // ← per-row LOCK
    cell.restoreOldValue();                                 //   revert
    cell.getElement().style.outline = '2px solid #f44336';  //   red flash 1.5s
    return;
  }
  fetch('/api/tasks/' + cell.getRow().getData().id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field: dbCol, value: cell.getValue() })
  }).then(/* green flash 0.8s */)
    .catch(/* restoreOldValue() + red flash */);
});
```

Key behaviours:

- **The editor still opens on a locked row.** The lock is *not* a column-level
  `editable` gate — the edit is reverted *after the fact* in `cellEdited`
  (red outline = rejected, green = saved). Doing it post-hoc gives the user
  feedback that the field exists but isn't editable in this state.
- **Only mapped fields save.** A field absent from `_fieldMap` is ignored
  even if its column has an editor — a safety net for accidental editor
  additions.
- **Inline edits and whole-record forms can coexist.** Inline cell edits
  PUT one `{field,value}` pair; a separate modal/form (Pattern 2) can POST
  the whole row.

### Making any grid inline-editable — checklist

1. Add `editor:` (+ `editorParams` if `list`) to the editable columns in your
   column definitions.
2. If an editor needs runtime values, use a placeholder param and resolve it
   in the route. `list` columns also need `headerFilterParams.values` or
   Tabulator's List.js throws.
3. Wire a `cellEdited` handler that maps grid field → DB column and PUTs the
   change. Enforce any per-row lock there.

---

## Pattern 2 — Row-button → modal editing

When a record is too complex for inline cells (lookups, currency,
multi-field validation), use a row-button + modal instead:

- A frozen, non-sortable **`_edit` column** (`formatter: "html"`, `width: 50`,
  `frozen: true`) renders a small Edit button as the first cell of every row.
- Clicking it opens a `<dialog>` modal — a full form, wired by your panel JS.
- A toolbar **"+ Create"** button opens the same modal blank.
- Save → `POST` / `PUT` to your API; the grid row updates in place.

The grid itself stays read-only (no `editor:` on the columns); all editing
happens in the modal.

---

## Gotchas

- **`data-computed` is a no-op** in this Datastar Pro build — irrelevant to
  Tabulator columns, but don't reach for it to toggle editability.
- **Date editors need ISO strings.** The route must emit `yyyy-mm-dd`
  (`new Date(x).toISOString().slice(0,10)`), not locale dates.
- **`list` editors and header filters** both need a `values` array — set
  `editorParams.values` *and* `headerFilterParams.values`.
- **Column state merge.** If you persist per-user column state
  (width/visibility/order) and merge it onto your base column defs, make sure
  `editor` / `editorParams` / `formatter` come from the base defs and
  survive the merge.
- **Light DOM.** `rocket-tabulator` runs in light-DOM mode so page CSS reaches
  the editors; don't switch it to shadow DOM.
