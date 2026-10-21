// <rocket-tabulator> — Datastar Rocket (JS API, Rocket beta.2 / Datastar 1.0.4) wrapping Tabulator 6.3
//
// ─── SOURCE OF TRUTH ─────────────────────────────────────────────────────────
// This file, C:\Code\datastar\vendor\DataStar-Rocket\static\components\
// tabulator-rocket.js (github.com/johntom/DataStar-Rocket), is the ONE place
// this component is edited. Every app carries a copy that is written by
//   node scripts/sync-components.mjs --check     (report drift, write nothing)
//   node scripts/sync-components.mjs --write     (copy to every target)
// from the DataStar-Rocket repo root. The sync keeps each target's OWN
// `import { rocket } from '…'` line (the bundle path / ?v= buster differs per
// app) and its line endings; everything below the import is byte-identical
// across copies. Fix a bug here, run the sync, then commit each app yourself.
// Targets (2026-10-13): datastar-fastify-sdk/components, brm_FlowDS,
// brm_websiteDS, galleryHelen/John/Ken/Nina/Vector, parktowerDS, gail_parenteau
// — the list lives in scripts/sync-components.mjs. Docs: rocket.md
// ("rocket-tabulator") + README.md in this repo.
//
// Public contract (preserved from the RC.7/8 template version):
//   tag:       <rocket-tabulator>
//   props:     columns, data, height, layout, placeholder,
//              movable-columns (default true), resizable-columns,
//              enable-row-click, selectable-rows, selection-checkbox,
//              initial-sort, initial-filters, row-index,
//              filter-bar   (opt-in: shows a blue active-filter status
//                            footer like the legacy Delphi grid),
//              lock-column-order (opt-in: column picker is hide/show only —
//                            no drag-to-reorder grip/handlers),
//              column-calcs, group-toggle, group-by, movable-rows
//   emits:     tab-row-click   { row }
//              tab-columns-changed { columns: [{field, visible, width}] }   (debounced 600ms)
//              tab-rows-selected   { rows }   (only when selectable-rows is set)
//              tab-sorted      { sorters: [{field, dir, title}] }   (on every
//                            sort change + once after build for the initial
//                            state; sorters is [] when no sort is applied)
//   element methods/props:
//              _tabInstance     - the Tabulator instance
//              _tabReady        - promise resolved after tableBuilt
//              _setRows(rows)   - hand a row ARRAY to the grid (setData + re-sort);
//                                 the server-driven path, see window._rkSetRows
//              _showColPicker(anchorEl) - toggle the column picker popup
//              _resolveColumns(defs) - run string tokens through the resolver
//                                 before a post-construction setColumns()
//              _checklistFilter - the Apply/Clear checklist header-filter factory
//   globals:   window._rkSetRows(ids, rows) - rows → one or more hosts by id
//                                 (what sse.executeScript calls)
//              window.brmColPicker(anchorEl, tabInstance, opts) - the shared picker
//              window._rkFormatters - OPTIONAL app registry for "app:<name>"
//                                 formatter tokens (see resolveColumnHelpers)
//
// String tokens in JSON column defs (resolveColumnHelpers): sorters mmddyyyy /
// money, calcs moneySum, headerFilter checklistFilter, formatters isoDate /
// signedMoney / notesWrap / statusBadge / openClaimButton / accountScanLink /
// scanPaymentSearch / "app:<name>" ("pt:<name>" alias). The last four named
// formatters encode brm-app navigation contracts (window.openClaimTab,
// window._loadScansFor, window._searchScanPayments); they are inert unless a
// column opts in by name, so they are harmless in any other app.
//
// Tabulator global is loaded via a <script> tag on the page (not imported here).

// The bundle URL below (incl. any ?v= buster) must be byte-identical to the
// page's <script type="module"> / <link rel="modulepreload"> for the Datastar
// bundle — a different URL would load a SECOND Datastar engine. The sync script
// preserves each app's own line.
import { rocket } from '/static/datastar-rocket.js'

function parseJSONStr(raw) {
  try {
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function isoDateFormatter(cell) {
  const v = cell.getValue()
  if (!v) return ''
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[2] + '/' + m[3] + '/' + m[1] : v
}

// ── Export dates as the grid shows them (JJ 2026-09-17) ─────────────────────
// Firebird DATE/TIMESTAMP values reach the browser as ISO strings
// ("2019-07-01T04:00:00.000Z" / "2026-01-15"); every grid DISPLAYS them as
// MM/DD/YYYY through a formatter, but Tabulator's download() (and
// _groupBar.exportAoa) write the RAW cell value, so Excel/CSV exports carried
// the ISO shape. Every column now gets this as its default `accessorDownload`
// (Tabulator calls it for xlsx/csv downloads; group-bar.js honours the same
// definition key): a date-like raw value is replaced by what the column's own
// formatter renders (so a grid that shows "MM/DD/YYYY HH:MM" exports that),
// falling back to MM/DD/YYYY from the ISO parts. Non-date values pass
// through untouched, and a column that defines its own accessorDownload
// keeps it.
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
function isDateLike(v) {
  return v instanceof Date || (typeof v === 'string' && ISO_DATE_RE.test(v))
}
function mdyOf(v) {
  const p = (n) => String(n).padStart(2, '0')
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? '' : p(v.getMonth() + 1) + '/' + p(v.getDate()) + '/' + v.getFullYear()
  }
  const m = ISO_DATE_RE.exec(v)
  return m ? m[2] + '/' + m[3] + '/' + m[1] : v
}
function dateDownloadAccessor(value, data, _type, _params, column, row) {
  if (!isDateLike(value)) return value
  let def = null
  try { def = column && typeof column.getDefinition === 'function' ? column.getDefinition() : null } catch { /* ignore */ }
  const fmt = def && def.formatter
  if (typeof fmt === 'function') {
    // Render through the column's formatter with a minimal cell stand-in
    // (getValue / getData / getRow / getElement cover every formatter here).
    try {
      const el = document.createElement('div')
      const rowStub = row && typeof row.getData === 'function'
        ? row
        : { getData: () => data, getElement: () => el, getIndex: () => undefined }
      const cell = {
        getValue: () => value, getOldValue: () => value, getData: () => data,
        getRow: () => rowStub, getElement: () => el, getColumn: () => column,
        getField: () => def.field, getTable: () => (column.getTable ? column.getTable() : null),
      }
      const out = fmt(cell, def.formatterParams || {}, () => {})
      let text = ''
      if (typeof out === 'string') text = out.replace(/<[^>]*>/g, '').trim()
      else if (out && out.nodeType === 1) text = String(out.textContent || '').trim()
      if (text) return text
    } catch { /* fall through to the ISO parts */ }
  }
  return mdyOf(value)
}
// Give every field column (incl. nested column groups) the default accessor.
function applyDefaultDownloadAccessor(cols) {
  ;(cols || []).forEach((c) => {
    if (!c || typeof c !== 'object') return
    if (Array.isArray(c.columns)) applyDefaultDownloadAccessor(c.columns)
    if (c.field && c.accessorDownload === undefined) c.accessorDownload = dateDownloadAccessor
  })
}

function notesWrapFormatter(cell) {
  // Multi-line preview cell (max ~3 lines, overflow hidden). The click-to-open
  // full-note popup was removed — it stopPropagation'd the cell click, so
  // clicking Notes opened a modal instead of selecting the diary row +
  // populating the edit form (which already shows the full note). Clicking the
  // cell now behaves like any other cell. The hover tooltip (notesWrapTooltip)
  // still gives a quick preview.
  const v = cell.getValue() || ''
  const div = document.createElement('div')
  div.style.cssText =
    'white-space:pre-wrap;word-break:break-word;' +
    'max-height:3.6em;overflow:hidden;line-height:1.2em;'
  div.textContent = v
  return div
}

// Tabulator 6.3 writes a STRING tooltip with innerHTML (stored XSS from a
// diary note) — return an element so the preview is text-only.
function notesWrapTooltip(_e, cell) {
  const v = cell.getValue() || ''
  const div = document.createElement('div')
  div.style.cssText = 'white-space:pre-wrap;word-break:break-word;max-width:40em;'
  div.textContent = v.length > 200 ? v.substring(0, 200) + '…' : v
  return div
}

// HTML-escape for the few formatters below that still build markup strings.
function _escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Status-pill formatter for the claims grid Status column. Reuses the
// .cdf-status styling already used by the claim-detail header — same
// green (Open / ReOpen) / red (Closed) palette, just scoped to a grid
// cell instead of a label. Accepts either the text label produced by
// liability.js / wcomp.js row mappers ("Open" | "Closed" | "ReOpen")
// OR the raw numeric value (1 | 2 | 3) so the formatter stays robust
// if the upstream mapper is bypassed.
// Render a small primary button that calls window.openClaimTab(id, claimNo,
// townId). Reads WCompID (wcomp) or LiabilityID (liability) from the row so
// the same formatter works on both module grids. Used by the wcomp grid view
// to give users explicit "open this claim" control while a plain row-click
// only updates the right-side scan panel — see views/wcomp/index.njk +
// public/js/wcomp/scan-panel.js.
function openClaimButtonFormatter(cell) {
  const d = cell.getRow().getData() || {}
  const id = d.WCompID != null ? d.WCompID : d.LiabilityID
  if (id == null) return ''
  // ClaimNo goes into a JS string literal inside an HTML attribute: escape
  // for the literal (\\ ') AND the attribute / markup (" < > &).
  const claimNo = _escHtml(String(d.ClaimNo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"))
  const townId  = Number(d.TownID) || 0
  return '<button class="btn btn--xs btn--primary" type="button" ' +
         'onclick="event.stopPropagation();window.openClaimTab(' +
         id + ",'" + claimNo + "'," + townId + ')">Open</button>'
}

// Account cell as a link that filters the right-side scan panel (scan payments
// + scan docs) for the row's insured/town, via window._loadScansFor. Used on the
// wcomp claims grid: row-click opens the claim, this link loads its scans.
// stopPropagation so the row-click open doesn't also fire.
function accountScanLinkFormatter(cell) {
  const v = cell.getValue()
  const text = (v == null ? '' : String(v))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!text) return ''
  const d = cell.getRow().getData() || {}
  const id = d.WCompID != null ? d.WCompID : d.LiabilityID
  const townId = Number(d.TownID) || 0
  if (id == null) return text
  return '<a href="#" class="acct-scan-link" title="Filter scans + payments for this insured" ' +
         'onclick="event.preventDefault();event.stopPropagation();' +
         'window._loadScansFor(' + id + ',' + townId + ')">' + text + '</a>'
}

// WComp claims grid "ScanPay" column: load the account's scan queue and
// filter Scan Payments by CariskWorker = the claim's worker last name.
function scanPaymentSearchFormatter(cell) {
  const d = cell.getRow().getData() || {}
  const id = d.WCompID
  const townId = Number(d.TownID) || 0
  const last = String(d['Last Name'] || d.lastName || '').trim()
  if (id == null || !last) return ''
  // Last name goes into an inline onclick string: escape for the JS string
  // literal and for the HTML attribute.
  const safe = last.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/"/g, '&quot;')
  return '<a href="#" class="acct-scan-link" title="Scan Payments where CariskWorker matches ' + safe + '" ' +
         'onclick="event.preventDefault();event.stopPropagation();' +
         'window._searchScanPayments(' + id + ',' + townId + ',\'' + safe + '\')">&#128269; pay</a>'
}

function statusBadgeFormatter(cell) {
  const raw = cell.getValue()
  if (raw == null || raw === '') return ''
  const s = String(raw).trim()
  let code, label
  if (s === 'Open'   || s === '1') { code = '1'; label = 'Open' }
  else if (s === 'Closed' || s === '2') { code = '2'; label = 'Closed' }
  else if (s === 'ReOpen' || s === 'Re-Open' || s === '3') { code = '3'; label = 'ReOpen' }
  else { code = '0'; label = _escHtml(s) }
  return '<span class="cdf-status" data-status-value="' + code + '">' + label + '</span>'
}

// Factory: build a checklistFilter that cleans up via the supplied registry.
function makeChecklistFilter(registerCleanup) {
  return function checklistFilter(cell, _onRendered, success) {
    const field = cell.getColumn().getField()
    const container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '100%'

    const display = document.createElement('input')
    display.type = 'text'
    display.readOnly = true
    display.style.cssText =
      'width:100%;cursor:pointer;box-sizing:border-box;padding:2px 4px;font-size:12px;'
    display.placeholder = 'Filter...'
    container.appendChild(display)

    let selected = {}
    const currentVal = cell.getValue()
    if (Array.isArray(currentVal)) currentVal.forEach((v) => (selected[v] = true))

    function updateDisplay() {
      const keys = Object.keys(selected)
      display.value = keys.length ? keys.length + ' selected' : ''
    }
    updateDisplay()

    const dropdown = document.createElement('div')
    dropdown.style.cssText =
      'display:none;position:fixed;z-index:9999;' +
      'background:var(--clr-surface,#fff);color:var(--clr-text,#333);' +
      'border:1px solid var(--clr-border,#ccc);box-shadow:0 2px 8px rgba(0,0,0,.25);' +
      'min-width:180px;max-height:260px;overflow:hidden;font-size:12px;'

    const searchBox = document.createElement('input')
    searchBox.type = 'text'
    searchBox.placeholder = 'Search...'
    searchBox.style.cssText =
      'width:100%;box-sizing:border-box;padding:4px 6px;border:none;' +
      'border-bottom:1px solid var(--clr-border,#ddd);font-size:12px;' +
      'background:var(--clr-bg,#fff);color:var(--clr-text,#333);'
    dropdown.appendChild(searchBox)

    const listWrap = document.createElement('div')
    listWrap.style.cssText = 'max-height:170px;overflow-y:auto;padding:4px 0;'
    dropdown.appendChild(listWrap)

    const btnBar = document.createElement('div')
    btnBar.style.cssText =
      'display:flex;gap:4px;padding:4px 6px;border-top:1px solid var(--clr-border,#ddd);'
    const applyBtn = document.createElement('button')
    applyBtn.textContent = 'Apply'
    applyBtn.style.cssText =
      'flex:1;padding:2px 6px;font-size:11px;cursor:pointer;background:#4472c4;color:#fff;border:1px solid #3560a8;border-radius:3px;'
    const clearBtn = document.createElement('button')
    clearBtn.textContent = 'Clear'
    clearBtn.style.cssText =
      'flex:1;padding:2px 6px;font-size:11px;cursor:pointer;' +
      'background:var(--clr-bg,#f5f5f5);color:var(--clr-text,#333);' +
      'border:1px solid var(--clr-border,#ccc);border-radius:3px;'
    btnBar.appendChild(applyBtn)
    btnBar.appendChild(clearBtn)
    dropdown.appendChild(btnBar)

    document.body.appendChild(dropdown)

    function positionDropdown() {
      const rect = display.getBoundingClientRect()
      dropdown.style.top = rect.bottom + 'px'
      dropdown.style.left = rect.left + 'px'
      dropdown.style.minWidth = Math.max(180, rect.width) + 'px'
      // Size the option list to the space below the header instead of the old
      // fixed 170px, so long value lists (e.g. every staff name) are visible
      // without scrolling whenever the viewport allows.
      const avail = window.innerHeight - rect.bottom - 8
      dropdown.style.maxHeight = Math.max(260, avail) + 'px'
      listWrap.style.maxHeight = Math.max(170, avail - 64) + 'px'
    }

    function buildList(filterText) {
      listWrap.innerHTML = ''
      const table = cell.getTable()
      const vals = {}
      // A column may name the full set of valid values
      // (headerFilterParams.values) so the list is complete even when the
      // loaded rows happen not to contain some of them.
      const fixed = cell.getColumn().getDefinition().headerFilterParams?.values
      if (Array.isArray(fixed)) fixed.forEach((v) => { if (v !== '') vals[v] = true })
      table.getData().forEach((row) => {
        const v = row[field]
        if (v !== undefined && v !== null && v !== '') vals[v] = true
      })
      const sorted = Object.keys(vals).sort()
      const ft = (filterText || '').toLowerCase()
      sorted.forEach((val) => {
        if (ft && val.toLowerCase().indexOf(ft) === -1) return
        const label = document.createElement('label')
        label.style.cssText =
          'display:flex;align-items:center;gap:4px;padding:2px 6px;cursor:pointer;white-space:nowrap;'
        label.addEventListener('mouseover', () => (label.style.background = 'var(--clr-bg,#e8f0fe)'))
        label.addEventListener('mouseout', () => (label.style.background = ''))
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.checked = !!selected[val]
        cb.style.margin = '0'
        cb.addEventListener('change', () => {
          if (cb.checked) selected[val] = true
          else delete selected[val]
        })
        label.appendChild(cb)
        label.appendChild(document.createTextNode(val))
        listWrap.appendChild(label)
      })
    }

    searchBox.addEventListener('input', () => buildList(searchBox.value))

    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const keys = Object.keys(selected)
      updateDisplay()
      dropdown.style.display = 'none'
      success(keys.length ? keys : '')
    })

    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      selected = {}
      buildList(searchBox.value)
      updateDisplay()
      dropdown.style.display = 'none'
      success('')
    })

    display.addEventListener('click', (e) => {
      e.stopPropagation()
      const showing = dropdown.style.display !== 'none'
      if (showing) {
        dropdown.style.display = 'none'
      } else {
        positionDropdown()
        dropdown.style.display = 'block'
        searchBox.value = ''
        buildList('')
        searchBox.focus()
      }
    })

    function onDocClick(e) {
      if (!container.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none'
      }
    }
    document.addEventListener('click', onDocClick)

    registerCleanup(() => {
      document.removeEventListener('click', onDocClick)
      if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown)
    })

    return container
  }
}

// Human-readable operator for the filter-status bar
function filterOpSymbol(type) {
  switch (type) {
    case '=': return '='
    case '!=': return '≠'   // ≠
    case '<': return '<'
    case '<=': return '≤'   // ≤
    case '>': return '>'
    case '>=': return '≥'   // ≥
    case 'like': return 'contains'
    case 'keywords': return 'contains'
    case 'starts': return 'starts with'
    case 'ends': return 'ends with'
    case 'in': return 'in'
    default: return '='
  }
}

// Collapse the current header + programmatic filters into display parts.
// Legacy Delphi showed e.g. "(Payee Detail ID = Arleo & Donohue, LLC)".
function describeFilters(tabInstance) {
  const parts = []
  const seen = new Set()
  function collect(arr) {
    ;(arr || []).forEach((f) => {
      if (Array.isArray(f)) return collect(f) // OR-groups are nested arrays
      if (!f || !f.field) return
      let val = f.value
      if (val === '' || val === undefined || val === null) return
      if (Array.isArray(val)) {
        if (!val.length) return
        val = val.join(', ')
      }
      const key = f.field + '|' + f.type + '|' + val
      if (seen.has(key)) return
      seen.add(key)
      let title = f.field
      try {
        const col = tabInstance.getColumn(f.field)
        if (col) title = col.getDefinition().title || f.field
      } catch {}
      parts.push({ title: String(title), op: filterOpSymbol(f.type), val: String(val) })
    })
  }
  try { collect(tabInstance.getHeaderFilters && tabInstance.getHeaderFilters()) } catch {}
  try { collect(tabInstance.getFilters && tabInstance.getFilters()) } catch {}
  return parts
}

// Chronological date sorter. Column defs are JSON-serialized server-side, and
// JSON.stringify drops function-valued properties — so a `sorter: <function>`
// set on the server never reaches the client and the column falls back to a
// STRING sort. For "MM/DD/YYYY" display strings that's wrong order (sorts by
// month, then day, then year). This sorter handles BOTH "MM/DD/YYYY" and ISO
// "YYYY-MM-DD" cell values so it can be applied to any date column regardless of
// the underlying storage format. Servers send `sorter: 'mmddyyyy'` (a string
// token, mapped below) and date columns are also auto-detected (see
// resolveColumnHelpers). Blank/unparseable values sort to the bottom (0).
function mmddyyyySorter(a, b) {
  const toN = (s) => {
    const v = String(s || '')
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v) // MM/DD/YYYY (display)
    if (m) return (+m[3]) * 10000 + (+m[1]) * 100 + (+m[2])
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v) // YYYY-MM-DD (ISO)
    if (m) return (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3])
    return 0
  }
  return toN(a) - toN(b)
}

// Numeric sort for money columns. The claims grids ship Paid / Reserves /
// Incurred as strings (Firebird NUMERIC through the driver, or pre-formatted
// "$1,234.00"), so Tabulator's auto-picked STRING sorter ordered "$9.00"
// above "$10.00" (JJ 2026-09-24 "sort on paid columns in wcomp grid should
// be a numeric sort"). Applied to every column with formatter "money" /
// "signedMoney" (or bottomCalc "moneySum") that sets no sorter of its own;
// servers may also send sorter: 'money'. Blank/unparseable → 0.
function moneySorter(a, b) {
  const toN = (v) => {
    if (v == null || v === '') return 0
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''))
    return isNaN(n) ? 0 : n
  }
  return toN(a) - toN(b)
}

// Money cell that renders NEGATIVE amounts (credits — e.g. a Pay Status = C
// payment, whose Pay/Billed amounts are stored negative) in red. The cell
// value arrives pre-formatted as a string ("$-1,234.00"); a minus sign marks
// it negative. Positive/blank values pass through unchanged. Pairs with the
// `cssClass: "pay-money-green"` (bold) already on these columns.
function signedMoneyFormatter(cell) {
  const v = cell.getValue()
  const s = v == null ? '' : String(v)
  if (s.indexOf('-') !== -1) {
    return '<span style="color:var(--clr-danger,#c0392b)">' + s + '</span>'
  }
  return s
}

// Column calc that SUMS pre-formatted money strings ("$1,234.00" /
// "$-1,234.00" — the shape the payments routes render) and returns the total
// in the same shape, so `bottomCalcFormatter: "signedMoney"` paints a
// negative subtotal red like the cells. Tabulator's built-in "sum" calc
// would read those strings as NaN. Servers send `bottomCalc: "moneySum"`;
// pair with column-calcs="group" for per-group subtotal rows only (the
// payments tabs keep their own grand-total footer).
function moneySumCalc(values) {
  let total = 0
  ;(values || []).forEach((v) => {
    if (v == null || v === '') return
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''))
    if (!isNaN(n)) total += n
  })
  total = Math.round(total * 100) / 100
  return '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Resolve string formatter/headerFilter/sorter placeholders to actual functions
function resolveColumnHelpers(cols, checklistFilter) {
  applyDefaultDownloadAccessor(cols)
  cols.forEach((c) => {
    if (c.bottomCalc === 'moneySum') c.bottomCalc = moneySumCalc
    if (c.topCalc === 'moneySum') c.topCalc = moneySumCalc
    if (c.bottomCalcFormatter === 'signedMoney') c.bottomCalcFormatter = signedMoneyFormatter
    if (c.topCalcFormatter === 'signedMoney') c.topCalcFormatter = signedMoneyFormatter
    if (c.headerFilter === 'checklistFilter') c.headerFilter = checklistFilter
    if (c.sorter === 'mmddyyyy') c.sorter = mmddyyyySorter
    // Auto-apply the chronological date sorter to any date column that didn't
    // set one explicitly — date columns are marked by a "date" header filter or
    // the isoDate display formatter. Without this, MM/DD/YYYY cells sort by
    // month (wrong). The sorter also handles ISO values, so it's safe on either.
    if (!c.sorter && (c.headerFilter === 'date' || c.formatter === 'isoDate')) {
      c.sorter = mmddyyyySorter
    }
    if (c.sorter === 'money') c.sorter = moneySorter
    if (!c.sorter && (c.formatter === 'money' || c.formatter === 'signedMoney' || c.bottomCalc === 'moneySum')) {
      c.sorter = moneySorter
    }
    if (c.formatter === 'signedMoney') c.formatter = signedMoneyFormatter
    if (c.formatter === 'isoDate') c.formatter = isoDateFormatter
    // "app:<name>" — an APP-REGISTERED formatter: resolved against
    // window._rkFormatters[name] (define the registry in the app's shared
    // script before the grid builds) so JSON column defs can name app
    // formatters without this component knowing them. "pt:<name>" is the
    // parktowerDS spelling of the same thing (its registry is
    // window._ptFormatters) — kept so its views need no change. A name with no
    // function registered is left as-is (Tabulator then warns, as before).
    if (typeof c.formatter === 'string' && /^(app|pt):/.test(c.formatter)) {
      const name = c.formatter.replace(/^(app|pt):/, '')
      const reg = (window._rkFormatters && window._rkFormatters[name]) ||
                  (window._ptFormatters && window._ptFormatters[name])
      if (typeof reg === 'function') c.formatter = reg
      if (name === 'mdy' && !c.sorter) c.sorter = mmddyyyySorter
    }
    if (c.formatter === 'notesWrap') {
      c.formatter = notesWrapFormatter
      c.tooltip = notesWrapTooltip
    }
    if (c.formatter === 'statusBadge') {
      c.formatter = statusBadgeFormatter
      // formatter outputs HTML — Tabulator needs to know not to escape it.
      c.formatterParams = c.formatterParams || {}
    }
    if (c.formatter === 'openClaimButton') {
      c.formatter = openClaimButtonFormatter
      c.formatterParams = c.formatterParams || {}
    }
    if (c.formatter === 'accountScanLink') {
      c.formatter = accountScanLinkFormatter
      c.formatterParams = c.formatterParams || {}
    }
    if (c.formatter === 'scanPaymentSearch') {
      c.formatter = scanPaymentSearchFormatter
      c.formatterParams = c.formatterParams || {}
    }
  })
}

// ── Shared column picker (show/hide + drag-to-reorder) ───────────────────────
// window.brmColPicker(anchorEl, tabInstance, opts) — ONE picker for EVERY grid
// (JJ 2026-08-19 "all grids should have ability to move columns also from
// columns click"). Used by host._showColPicker below and, via the window
// global, by the few grids that are plain Tabulator instances (payee-flow
// detail grid) or pages that used to build their own checkbox-only popup.
//   opts.lockOrder  — hide/show only, no drag grip (lock-column-order prop)
//   opts.onChange   — called after every show/hide/reorder (e.g. autosave)
//   opts.skip(def)  — return true to leave a column out of the list
// Toggles: calling it again for the same table while open closes it.
// Reorder: dragging a row onto another reorders the popup AND the grid
// (tabInstance.moveColumn), so the two stay in sync.
const _colPickerOpen = new WeakMap()   // tabInstance → { panel, close }
function brmColPicker(anchorEl, tabInstance, opts) {
  if (!tabInstance) return null
  opts = opts || {}
  const open = _colPickerOpen.get(tabInstance)
  if (open) { open.close(); return null }

  const allCols = tabInstance.getColumns()
    .filter((c) => !!c.getField())
    .filter((c) => !(opts.skip && opts.skip(c.getDefinition())))
  // 40 fields per column: the 119-field wcomp set and the 83-field liability set both lay
  // out in 3 columns (JJ 2026-09-25 "3 columns select like in liability"); short sets stay 1
  // opts.columns forces the count (Analysis: always 3, JJ 2026-09-30)
  const numCols = opts.columns > 0 ? Math.max(1, Math.round(opts.columns)) : Math.max(1, Math.ceil(allCols.length / 40))
  const lockOrder = !!opts.lockOrder
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {}

  const panel = document.createElement('div')
  panel.className = 'brm-col-picker'
  panel.style.cssText =
    'position:fixed;z-index:10000;' +
    'background:var(--clr-surface,#fff);color:var(--clr-text,#333);' +
    'border:1px solid var(--clr-border,#ccc);' +
    'border-radius:4px;padding:6px 4px;max-height:calc(100vh - 40px);overflow-y:auto;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.25);font-size:12px;' +
    'column-count:' + numCols + ';column-gap:8px;min-width:' + (numCols * 180) + 'px;'

  let dragSrc = null
  allCols.forEach((col) => {
    const def = col.getDefinition()
    const row = document.createElement('div')
    row.draggable = !lockOrder
    row.dataset.field = def.field
    row.style.cssText =
      'display:flex;align-items:center;gap:4px;padding:2px 4px;' +
      'cursor:pointer;border-radius:3px;white-space:nowrap;break-inside:avoid;'
    if (!lockOrder) {
      const grip = document.createElement('span')
      grip.textContent = '⠇'
      grip.title = 'Drag to reorder'
      grip.style.cssText = 'cursor:grab;opacity:.5;font-size:14px;user-select:none;color:var(--clr-text,#666);'
      row.appendChild(grip)
    }
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = col.isVisible()
    cb.style.cssText = 'margin:0;cursor:pointer;'
    cb.addEventListener('change', (e) => { e.stopPropagation(); col.toggle(); onChange() })
    cb.addEventListener('mousedown', (e) => e.stopPropagation())
    row.appendChild(cb)
    row.appendChild(document.createTextNode(' ' + (def.title || def.field)))
    row.addEventListener('mouseover', () => (row.style.background = 'var(--clr-bg,#f0f4ff)'))
    row.addEventListener('mouseout', () => (row.style.background = ''))
    if (!lockOrder) {
      row.addEventListener('dragstart', (e) => {
        dragSrc = row; row.style.opacity = '.4'
        try { e.dataTransfer.effectAllowed = 'move' } catch {}
      })
      row.addEventListener('dragend', () => {
        dragSrc = null; row.style.opacity = ''
        panel.querySelectorAll('div').forEach((d) => (d.style.borderTop = ''))
      })
      row.addEventListener('dragover', (e) => {
        e.preventDefault()
        try { e.dataTransfer.dropEffect = 'move' } catch {}
        if (dragSrc && row !== dragSrc) row.style.borderTop = '2px solid #4472c4'
      })
      row.addEventListener('dragleave', () => (row.style.borderTop = ''))
      row.addEventListener('drop', (e) => {
        e.preventDefault(); row.style.borderTop = ''
        if (!dragSrc || dragSrc === row) return
        panel.insertBefore(dragSrc, row)
        try { tabInstance.moveColumn(dragSrc.dataset.field, row.dataset.field, false) } catch {}
        onChange()
      })
    }
    panel.appendChild(row)
  })

  const rect = anchorEl ? anchorEl.getBoundingClientRect() : { bottom: 40, left: 40 }
  document.body.appendChild(panel)
  const panelRect = panel.getBoundingClientRect()
  let top = rect.bottom + 4
  const maxTop = window.innerHeight - panelRect.height - 4
  if (top > maxTop) top = Math.max(4, maxTop)
  let left = rect.left
  if (left + panelRect.width > window.innerWidth - 4) left = Math.max(4, window.innerWidth - panelRect.width - 4)
  panel.style.top = top + 'px'
  panel.style.left = left + 'px'

  function close() {
    panel.remove()
    document.removeEventListener('mousedown', onDown)
    _colPickerOpen.delete(tabInstance)
  }
  function onDown(e) {
    if (!panel.contains(e.target) && e.target !== anchorEl && !(anchorEl && anchorEl.contains(e.target))) close()
  }
  setTimeout(() => document.addEventListener('mousedown', onDown), 50)
  _colPickerOpen.set(tabInstance, { panel, close })
  return panel
}
window.brmColPicker = brmColPicker

// window._rkSetRows(ids, rows) — hand a row ARRAY straight to one or more
// <rocket-tabulator> hosts by element id (a string or an array of strings).
// The server calls it through
//   sse.executeScript(`window._rkSetRows('claims-grid', ${jsonForScript(rows)})`)
// instead of patching a stringified signal bound with data-attr:data — that
// path held the rowset three times (signal-store string, DOM attribute,
// Tabulator data) and JSON-encoded it twice on the wire (2026-10-13; the
// 13-14 grids' _lossApplyRows was the model). A host that is not on the page
// yet, or whose table is still building, is retried every 100 ms for ~15 s;
// only the LATEST rows handed to an id survive the wait.
const _rkPendingRows = new Map()
window._rkSetRows = function (ids, rows) {
  const list = Array.isArray(ids) ? ids : [ids]
  const data = Array.isArray(rows) ? rows : []
  list.forEach((id) => {
    if (!id) return
    _rkPendingRows.set(id, data)
    let tries = 0
    const attempt = () => {
      if (_rkPendingRows.get(id) !== data) return // superseded by a newer call
      const el = document.getElementById(id)
      if (el && typeof el._setRows === 'function') {
        _rkPendingRows.delete(id)
        el._setRows(data)
        return
      }
      if (++tries < 150) setTimeout(attempt, 100)
      else _rkPendingRows.delete(id)
    }
    attempt()
  })
}

rocket('rocket-tabulator', {
  mode: 'light',
  renderOnPropChange: false,

  props: ({ string, number, bool }) => ({
    columns: string.default(''),
    data: string.default(''),
    height: string.default('311px'),
    layout: string.default('fitColumns'),
    placeholder: string.default('No Data'),
    // JJ 2026-08-19: every grid can reorder columns by dragging headers
    // (was opt-in per view via movable-columns="true"). movable-columns="false"
    // still turns it off for a specific grid.
    movableColumns: bool.default(true),
    resizableColumns: bool.default(true),
    enableRowClick: bool.default(false),
    selectableRows: bool.default(false),
    // When selectableRows is on, this controls the leading row-selection
    // checkbox column. Default true = existing behavior; set false (e.g. the
    // diary grid) to keep the row-highlight selection WITHOUT the checkbox.
    selectionCheckbox: bool.default(true),
    initialSort: string.default(''),
    initialFilters: string.default(''),
    rowIndex: string.default(''),
    filterBar: bool.default(false),
    // When true, the column picker (_showColPicker) is hide/show only — its
    // drag-to-reorder grip and handlers are omitted. Default false keeps the
    // existing reorder behavior for every other view.
    lockColumnOrder: bool.default(false),
    // Tabulator column-calculation placement: "" (default), "both", "group",
    // or "table". "both"/"group" yield per-group subtotal rows when grouping.
    columnCalcs: string.default(''),
    // Tabulator group toggle element: "" (default arrow), "header" (whole
    // group header click-toggles collapse), or "arrow".
    groupToggle: string.default(''),
    // Open the grid grouped by this field (grid-reports pattern): group
    // header shows "field : value (n items)". Runtime regrouping still works
    // via _tabInstance.setGroupBy(). Empty = no grouping (default).
    groupBy: string.default(''),
    // Drag rows to reorder (Tabulator movableRows — construction-time only,
    // so it has to be a prop). Pair with a `rowHandle: true` column and
    // listen for `rowMoved` on host._tabInstance (Maint → Databases uses it
    // to renumber its Order column). Default false keeps every other grid.
    movableRows: bool.default(false),
  }),

  render: ({ html }) => html`<div data-rocket-ref="tableEl" style="width:100%"></div>`,

  onFirstRender({ host, refs, props, emit, cleanup, observeProps }) {
    if (!window.Tabulator) {
      console.error('[rocket-tabulator] Tabulator global is not loaded')
      return
    }

    const cellCleanups = []
    const registerCellCleanup = (fn) => cellCleanups.push(fn)
    const checklistFilter = makeChecklistFilter(registerCellCleanup)
    // Expose the Apply/Clear checklist filter for grids that set their columns
    // AFTER construction via host._tabInstance.setColumns() (e.g. mailflow,
    // whose columns carry live formatter/sorter closures that can't go through
    // the JSON `columns` attribute where resolveColumnHelpers normally runs).
    // Such grids resolve the 'checklistFilter' token themselves from here.
    host._checklistFilter = checklistFilter
    // Same idea for every string token (isoDate, signedMoney, moneySum,
    // mmddyyyy, statusBadge, checklistFilter, …): a grid that calls
    // setColumns() after construction can run its definitions through the
    // component's own resolver first — the setColumns hook below only adds the
    // download accessor, so an unresolved 'isoDate' reached Tabulator as an
    // unknown formatter and dates showed raw ISO (Analysis pages, 2026-09-29).
    // Opt-in on purpose: resolving inside the hook would also change grids
    // that never asked (mailflow's money columns would gain moneySorter).
    host._resolveColumns = (defs) => {
      if (Array.isArray(defs)) resolveColumnHelpers(defs, checklistFilter)
      return defs
    }

    const cols = parseJSONStr(props.columns)
    const rows = parseJSONStr(props.data)
    const sort = parseJSONStr(props.initialSort)
    resolveColumnHelpers(cols, checklistFilter)

    const config = {
      data: rows,
      layout: props.layout || 'fitColumns',
      height: props.height || '311px',
      movableColumns: !!props.movableColumns,
      resizableColumns: !!props.resizableColumns,
      placeholder: props.placeholder || 'No Data',
      columns: cols,
    }
    if (props.rowIndex) config.index = props.rowIndex
    if (props.movableRows) config.movableRows = true
    // Hand Tabulator a COPY — it mutates the initialSort array in place,
    // replacing each `column` string with the live Column object (circular
    // refs). Keeping `sort` pristine lets us re-apply it cleanly post-build.
    if (sort.length) config.initialSort = sort.map((s) => ({ ...s }))
    if (props.columnCalcs) config.columnCalcs = props.columnCalcs
    if (props.groupToggle) config.groupToggleElement = props.groupToggle
    if (props.groupBy) {
      config.groupBy = props.groupBy
      // Group values come from row data — escape them, groupHeader renders HTML.
      const escGh = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      config.groupHeader = (value, count) =>
        `${escGh(props.groupBy)} : ${escGh(value)} <span style="color:#16a34a">(${count} items)</span>`
    }

    if (props.selectableRows) {
      config.selectableRows = 'highlight'
      // The checkbox column is opt-out (selection-checkbox="false") — highlight
      // selection still works via row.select() without it.
      if (props.selectionCheckbox) {
        config.rowHeader = {
          formatter: 'rowSelection',
          titleFormatter: 'rowSelection',
          headerSort: false,
          resizable: false,
          frozen: true,
          headerHozAlign: 'center',
          hozAlign: 'center',
          width: 40,
        }
      }
    }

    if (props.enableRowClick) {
      const prevFormatter = config.rowFormatter
      config.rowFormatter = (row) => {
        if (prevFormatter) {
          try { prevFormatter(row) } catch {}
        }
        row.getElement().style.cursor = 'pointer'
      }
    }

    // Active-filter status footer (opt-in via filter-bar="true")
    let filterBarEl = null
    if (props.filterBar) {
      filterBarEl = document.createElement('div')
      filterBarEl.className = 'rk-filter-bar'
      filterBarEl.style.display = 'none'
      config.footerElement = filterBarEl
    }

    const tabInstance = new window.Tabulator(refs.tableEl, config)
    host._tabInstance = tabInstance
    // Columns set AFTER construction (users, ref-data, databases, mailflow,
    // alerts, analysis: host._tabInstance.setColumns(defs)) bypass
    // resolveColumnHelpers — give those definitions the same default
    // download accessor so their date exports match the grid too.
    const _origSetColumns = tabInstance.setColumns.bind(tabInstance)
    tabInstance.setColumns = (defs) => {
      if (Array.isArray(defs)) applyDefaultDownloadAccessor(defs)
      return _origSetColumns(defs)
    }

    // Tabulator's dataFiltered fires with (filters, rows) BEFORE the table's
    // own active-row count is updated, so getDataCount('active') still reports
    // the previous state (the bar read "48 of 48" with 4 rows showing). The
    // rows argument is the filtered set - use it when present.
    function renderFilterBar(_filters, filteredRows) {
      if (!filterBarEl || !host._tabInstance) return
      const footerWrap = filterBarEl.closest('.tabulator-footer')
      const parts = describeFilters(tabInstance)
      filterBarEl.textContent = ''
      if (!parts.length) {
        filterBarEl.style.display = 'none'
        if (footerWrap) footerWrap.style.display = 'none'
        return
      }
      if (footerWrap) footerWrap.style.display = ''
      filterBarEl.style.cssText =
        'display:flex;align-items:center;gap:10px;box-sizing:border-box;width:100%;' +
        'background:var(--clr-accent,#4472c4);color:#fff;font-size:11px;' +
        'padding:3px 8px;line-height:1.4;'

      const lbl = document.createElement('span')
      lbl.textContent = '▼ Filtered:' // ▼
      lbl.style.cssText = 'font-weight:600;white-space:nowrap;flex-shrink:0;'
      filterBarEl.appendChild(lbl)

      const txt = parts
        .map((p) => '(' + p.title + ' ' + p.op + ' ' + p.val + ')')
        .join(' AND ')
      const txtSpan = document.createElement('span')
      txtSpan.textContent = txt
      txtSpan.title = txt
      txtSpan.style.cssText =
        'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
      filterBarEl.appendChild(txtSpan)

      let shown = 0
      let total = 0
      if (Array.isArray(filteredRows)) shown = filteredRows.length
      else { try { shown = tabInstance.getDataCount('active') } catch {} }
      try { total = tabInstance.getDataCount('all') } catch {}
      const count = document.createElement('span')
      count.textContent = shown + ' of ' + total + ' rows'
      count.style.cssText = 'white-space:nowrap;flex-shrink:0;opacity:.9;'
      filterBarEl.appendChild(count)

      const clr = document.createElement('button')
      clr.type = 'button'
      clr.textContent = '✕' // ✕
      clr.title = 'Clear all filters'
      clr.style.cssText =
        'flex-shrink:0;background:rgba(255,255,255,.18);color:#fff;border:none;' +
        'border-radius:3px;cursor:pointer;font-size:11px;line-height:1;padding:2px 6px;'
      clr.addEventListener('click', (e) => {
        e.stopPropagation()
        try { tabInstance.clearHeaderFilter() } catch {}
        try { tabInstance.clearFilter(true) } catch {}
      })
      filterBarEl.appendChild(clr)
    }
    if (filterBarEl) tabInstance.on('dataFiltered', renderFilterBar)

    if (props.enableRowClick) {
      tabInstance.on('rowClick', (e, row) => {
        if (e.target.closest('.tabulator-row-header')) return
        emit('tab-row-click', { row: row.getData() })
      })
    }

    const tabReady = new Promise((resolve) => tabInstance.on('tableBuilt', resolve))
    // Expose the build-ready promise. host._tabInstance is set synchronously
    // (above) BEFORE Tabulator finishes building, so grids that drive the table
    // post-construction (mailflow: setColumns/replaceData) must wait on this —
    // otherwise columns set pre-build don't get resize handles bound.
    host._tabReady = tabReady
    let prevDataStr = props.data || ''

    // Init the filter bar (collapses the empty footer strip + reflects
    // any server-restored initial-filters once the table is built).
    if (filterBarEl) tabReady.then(renderFilterBar)

    // Apply server-saved header filters once the table is built
    try {
      const savedFilters = JSON.parse(props.initialFilters || '[]')
      if (Array.isArray(savedFilters) && savedFilters.length) {
        tabReady.then(() => {
          savedFilters.forEach((f) => {
            if (f && f.field && f.value !== undefined && f.value !== '') {
              try { tabInstance.setHeaderFilterValue(f.field, f.value) } catch {}
            }
          })
        })
      }
    } catch {}

    // Debounced column-state emit
    let colTimer = null
    function emitColumnState() {
      clearTimeout(colTimer)
      colTimer = setTimeout(() => {
        if (!host._tabInstance) return
        const out = tabInstance
          .getColumns()
          .filter((c) => !!c.getField())
          .map((c) => ({
            field: c.getField(),
            visible: c.isVisible(),
            width: c.getWidth(),
          }))
        emit('tab-columns-changed', { columns: out })
      }, 600)
    }
    tabInstance.on('columnMoved', emitColumnState)
    tabInstance.on('columnResized', emitColumnState)
    tabInstance.on('columnVisibilityChanged', emitColumnState)

    if (props.selectableRows) {
      const emitSelection = () => emit('tab-rows-selected', { rows: tabInstance.getSelectedData() })
      tabInstance.on('rowSelected', emitSelection)
      tabInstance.on('rowDeselected', emitSelection)
    }

    // Sort-changed emit. Fires on every sort change (header click or a
    // programmatic setSort) and once after the table is built — so consumers
    // can render an initial sort label even when a saved initial-sort was
    // applied (or none, in which case sorters is []). Each sorter carries its
    // resolved column title so consumers don't have to reach into the instance
    // or duplicate the field→title lookup.
    // Build the current-sort payload (primary-first; see ordering note below)
    // and emit it. Also cache it on the host so consumers that wire up AFTER an
    // emit already fired (the toolbar sort label attaches via its own poll, and
    // can miss the build-time emit) can read the live state on attach.
    const sortPayload = () => {
      const out = tabInstance.getSorters().map((s) => {
        let title = s.field
        try { title = (s.column && s.column.getDefinition().title) || s.field } catch {}
        return { field: s.field, dir: s.dir, title }
      })
      // Tabulator applies/reports a multi-column sort with the LAST entry as the
      // PRIMARY (verified: setSort([Date,Dept]) groups by Dept). Reverse so the
      // payload lists the primary sort first, matching what the user sees.
      // Harmless for single-column.
      out.reverse()
      return out
    }
    const emitSorted = () => {
      const out = sortPayload()
      host._lastSorters = out
      emit('tab-sorted', { sorters: out })
    }
    tabInstance.on('dataSorted', emitSorted)
    tabReady.then(emitSorted)

    // Multi-column sort in CLICK order + rank numbers (brm_FlowDS 2026-10-21,
    // JJ "how do you sort more than 1 column … it's not working"). Tabulator's
    // own Ctrl/Shift+click pushes the clicked column to the END of its sort
    // list and the LAST entry is the PRIMARY (see sortPayload) — so the column
    // clicked second became the main sort and the grid looked re-sorted by it
    // alone. A capture-phase listener takes the modified click first: the
    // column joins as the LOWEST-priority sort (front of Tabulator's list);
    // Ctrl/Shift+click on a sorted column flips asc → desc, a third time drops
    // it. A plain click is untouched (Tabulator's single-column sort). The
    // header filter inputs and resize handles are left alone.
    refs.tableEl.addEventListener('click', (e) => {
      if (!(e.ctrlKey || e.shiftKey || e.metaKey)) return
      const t = e.target
      if (!t || !t.closest) return
      if (t.closest('.tabulator-header-filter, input, select, textarea, .tabulator-col-resize-handle')) return
      const colEl = t.closest('.tabulator-col.tabulator-sortable')
      if (!colEl || !refs.tableEl.contains(colEl)) return
      const field = colEl.getAttribute('tabulator-field')
      if (!field) return
      e.stopPropagation()
      e.preventDefault()
      const list = tabInstance.getSorters().map((s) => ({ column: s.field, dir: s.dir }))
      const i = list.findIndex((s) => s.column === field)
      if (i < 0) list.unshift({ column: field, dir: 'asc' })
      else if (list[i].dir === 'asc') list[i].dir = 'desc'
      else list.splice(i, 1)
      try { if (list.length) tabInstance.setSort(list); else tabInstance.clearSort() } catch {}
    }, true)

    // Rank numbers: with 2+ sorted columns each sorted header shows a small
    // 1 / 2 / 3 next to its arrow (1 = the primary sort). One sort → none.
    const paintSortRanks = () => {
      try {
        refs.tableEl.querySelectorAll('.rk-sort-rank').forEach((n) => n.remove())
        const sorters = tabInstance.getSorters()
        if (sorters.length < 2) return
        sorters.forEach((s, idx) => {
          const el = s.column && s.column.getElement && s.column.getElement()
          const arrow = el && el.querySelector('.tabulator-col-sorter')
          if (!arrow) return
          const rank = sorters.length - idx
          const b = document.createElement('span')
          b.className = 'rk-sort-rank'
          b.textContent = String(rank)
          b.title = 'Sort ' + rank + ' of ' + sorters.length
          b.style.cssText = 'font-size:9px;font-weight:700;line-height:1;margin-left:2px;align-self:flex-start;'
          arrow.appendChild(b)
        })
      } catch {}
    }
    tabInstance.on('dataSorted', paintSortRanks)
    tabReady.then(paintSortRanks)

    // Apply the saved initial-sort once the table is built. Passing data +
    // initialSort together in the constructor REGISTERS the sorters but does NOT
    // order the rows in this build (the claims grids get their rows at construct
    // time via data-attr:data) — so the grid showed source order with the sort
    // "set" but unapplied. setSort here actually orders the rows (and fires
    // dataSorted → emitSorted, refreshing the label). Pass a COPY: Tabulator
    // mutates the array (column string → live Column object, circular).
    if (sort.length) tabReady.then(() => { try { tabInstance.setSort(sort.map((s) => ({ ...s }))) } catch {} })

    // applyRows(rows) — the ONE row-swap path (setData, then re-assert the
    // active sort). Used by the `data` attribute observer below AND by
    // host._setRows(rows), which window._rkSetRows calls: the direct path the
    // server takes since 2026-10-13 — rows arrive as one executeScript call,
    // never as a stringified signal copied into a giant data="…" attribute.
    const applyRows = (rows) => {
      const parsed = Array.isArray(rows) ? rows : []
      let res
      try { res = tabInstance.setData(parsed) } catch { return Promise.resolve() }
      const reapply = () => {
        const s = tabInstance.getSorters()
        if (s.length) {
          try { tabInstance.setSort(s.map((x) => ({ column: x.field, dir: x.dir }))) } catch {}
        }
      }
      if (res && typeof res.then === 'function') return res.then(reapply).catch(() => {})
      reapply()
      return Promise.resolve()
    }
    host._setRows = (rows) => tabReady.then(() => applyRows(rows))

    // Data swap — preserves column state, sort, filters. Fires when a bound
    // `data` attribute changes after build (the starter page's $_gridData;
    // every app grid now takes host._setRows). setData replaces the rows WITHOUT
    // re-running the active sort, so re-assert it afterward; empty getSorters()
    // (user cleared the sort) is a no-op so the server default is respected.
    // (The initial load is handled by the tabReady setSort above, since the
    // grid is built with its rows already in place.) addData (load-more) does
    // not route through here, so appended pages keep the active sort untouched.
    observeProps((p) => {
      const dataStr = p.data || ''
      if (dataStr === prevDataStr) return
      prevDataStr = dataStr
      tabReady.then(() => {
        let parsed = []
        try { parsed = dataStr ? JSON.parse(dataStr) : [] } catch { return }
        return applyRows(parsed)
      })
    }, 'data')

    // Column picker with drag-to-reorder — the shared brmColPicker (above).
    // extra (optional): { columns: n } forces the picker's column count.
    host._showColPicker = function (anchorEl, extra) {
      if (!tabInstance) return
      brmColPicker(anchorEl, tabInstance, Object.assign({
        lockOrder: !!props.lockColumnOrder,
        onChange: emitColumnState,
      }, extra || {}))
    }

    cleanup(() => {
      clearTimeout(colTimer)
      const openPicker = tabInstance && _colPickerOpen.get(tabInstance)
      if (openPicker) openPicker.close()
      cellCleanups.forEach((fn) => {
        try { fn() } catch {}
      })
      cellCleanups.length = 0
      if (host._tabInstance) {
        try { host._tabInstance.destroy() } catch {}
        host._tabInstance = null
      }
      host._setRows = null
    })
  },
})
