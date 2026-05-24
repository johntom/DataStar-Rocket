# `rocket-tom-select`

A light-DOM Rocket wrapper around [Tom Select](https://tom-select.js.org) 2.4.1
that gives every dropdown the same opt-in feature set: typeahead, multi-select
with checkboxes + Apply/Clear bar, remote search-as-you-type, rich option
rendering, and auto-resolve-on-single-match.

- **Source:** `static/components/tom-select-rocket.js`
- **Demo:** `tom-select-rocket.html`
- **Tag:** `<rocket-tom-select>`
- **Mode:** light DOM (`mode: 'light'`) — page CSS reaches into it; no shadow root
- **Loads Tom Select lazily** from the CDN on first use; one `<script>` tag for
  the whole page, shared across every instance via a module-level promise

## Public contract — DO NOT rename

| Surface | Name |
|---|---|
| Tag | `<rocket-tom-select>` |
| Emitted event | `ts-change` — `CustomEvent { detail: { value: string } }` |
| Sync surface | Native `change` on the inner `<select>` (bubbles to host) |
| Value attribute | `value` — also written back by the component on change |

`onChange` always pushes the current value back onto the host's `value`
attribute *and* emits `ts-change`. The `change`-on-`<select>` event bubbles up
to the host so external listeners (form serializers, dirty trackers) can hook
the host element instead of reaching inside.

## Props

Attribute names are kebab-case in HTML; JS prop names are camelCase. Rocket
maps between them automatically.

| HTML attribute | JS prop | Type | Default | What it does |
|---|---|---|---|---|
| `placeholder` | `placeholder` | string | `'Select...'` | Empty-state text |
| `max-items` | `maxItems` | number ≥ 1 | `1` | `1` = single-select. `>1` = multi (adds the remove-button plugin). Overridden to `50` when `check-options` is on. |
| `options` | `options` | string (JSON) | `''` | The full option list, **JSON-encoded** — `[{value, text, …extras}]`. Re-parsed and diffed on attribute change. |
| `value` | `value` | string | `''` | Selected value. Comma-separated for multi. Two-way: external writes flow in; user picks flow out. |
| `allow-create` | `allowCreate` | bool | `false` | Lets the user add ad-hoc options by typing + Enter (`create: true` on TomSelect). |
| `detail-field` | `detailField` | string | `''` | Comma-separated extra option fields to show as a right-aligned column in the dropdown and append to the chosen item. See **Detail rendering** below. |
| `search-url` | `searchUrl` | string | `''` | Remote search. The component appends `?q=<typed>` and expects `[{value, text, …}]` JSON. |
| `check-options` | `checkOptions` | bool | `false` | Multi-select with checkbox plugin + Apply/Clear bar at the bottom. Auto-applies on dropdown close. See **Check-options mode**. |
| `dropdown-parent` | `dropdownParent` | string | `''` | TomSelect `dropdownParent` (e.g. `'body'`) to escape `overflow:hidden` containers. |
| `auto-select-single` | `autoSelectSingle` | bool | mode-dependent | When typing narrows the dropdown to **one** match, auto-resolve it. **Defaults ON for single-select** (`max-items=1`, no `check-options`); **OFF for multi / check-options**. Override either way with `auto-select-single="true"` / `"false"`. See **Auto-select-single**. |

## Events

### `ts-change` (component → outside)

Fired whenever the value changes. Listen with `data-on:ts-change="…"` or with
plain `addEventListener('ts-change', …)`:

```html
<rocket-tom-select
  data-on:ts-change="$selectedFruit = evt.detail.value">
</rocket-tom-select>
```

`evt.detail.value` is always a string — multi-select values are joined with `,`.

### Native `change` (component → forms / external listeners)

TomSelect dispatches a native `change` on its inner `<select>` that bubbles to
the host. Plain DOM listeners on the host see it as a normal change event;
read the value from `host.querySelector('select').value` (or `.tomselect.getValue()`
for arrays in multi-select mode).

## Modes (cookbook)

### 1. Single-select, local options

The simplest case.

```html
<rocket-tom-select
  options='[{"value":"apple","text":"Apple"},
            {"value":"banana","text":"Banana"},
            {"value":"cherry","text":"Cherry"}]'
  value="apple"
  placeholder="Pick a fruit">
</rocket-tom-select>
```

The `options` attribute is a JSON-encoded array of `{value, text, …}` objects.

### 2. Multi-select with chips

Set `max-items` > 1. The component automatically adds the `remove_button`
plugin so each selected chip carries an ✕.

```html
<rocket-tom-select max-items="5"
  options='[{"value":"js","text":"JavaScript"},
            {"value":"ts","text":"TypeScript"},
            {"value":"py","text":"Python"}]'
  value="js,ts">
</rocket-tom-select>
```

### 3. Multi-select with **Apply/Clear bar** — `check-options`

For filter-style multi-pickers where the consumer wants explicit Apply rather
than firing on every checkbox toggle:

```html
<rocket-tom-select check-options
  options='[{"value":"1","text":"Region A"},
            {"value":"2","text":"Region B"},
            {"value":"3","text":"Region C"}]'
  value=""
  data-on:ts-change="$regionFilter = evt.detail.value">
</rocket-tom-select>
```

What changes:

- `maxItems` is forced to **50** (effectively unlimited multi).
- Adds the `checkbox_options` plugin (visible ☑ next to each item).
- Adds the `remove_button` plugin (chips with ✕).
- **Suppresses the native `onChange`** — picking items doesn't fire `ts-change`
  per click. Instead an **Apply / Clear bar** is injected into the bottom of
  the dropdown.
- **Auto-apply on dropdown close** — clicking outside or pressing Escape with
  a changed value applies it.
- Explicit Apply / Clear still work; both are no-ops when the value hasn't
  changed since the last apply (so closing without changes doesn't double-fire
  `ts-change`).

### 4. Remote search — `search-url`

For datasets too big to ship into `options`. The component handles the fetch,
JSON parse, error swallow, and TomSelect's load callback.

```html
<rocket-tom-select
  search-url="/api/search/users"
  placeholder="Search users...">
</rocket-tom-select>
```

The route receives `GET /api/search/users?q=<typed>` and returns
`[{value, text, …extras}]`.

> **Important — the `options` attribute is still used.** Pre-seed it with the
> currently-selected option (or a small initial set) so the picker can render
> the chosen item's label before the user types — otherwise the picker shows a
> bare value ID.

### 5. Rich option rows — `detail-field`

Append extra columns to the dropdown row, separated by `·` in the chosen item
display.

```html
<rocket-tom-select
  options='[{"value":"apple","text":"Apple","origin":"Central Asia","season":"Fall"},
            {"value":"kiwi","text":"Kiwi","origin":"China","season":"Winter"}]'
  detail-field="origin,season">
</rocket-tom-select>
```

Option rows render as:

```
Apple             Central Asia · Fall
```

The chosen item collapses to `Apple · Central Asia · Fall`. Extra fields are
also added to `searchField` so the user can filter by them.

### 6. Auto-resolve on single match — `auto-select-single`

Type until exactly one option remains; the picker resolves it for you.

```html
<!-- Single-select: ON by default. Disable with auto-select-single="false". -->
<rocket-tom-select
  options='[{"value":"apple","text":"Apple"},
            {"value":"banana","text":"Banana"}]'>
</rocket-tom-select>

<!-- Multi-select: opt-in. -->
<rocket-tom-select max-items="5" auto-select-single
  options='[…]'>
</rocket-tom-select>
```

**Behavior depends on the picker mode:**

| Picker | On single match |
|---|---|
| Single-select (default ON) | `setValue` + `close` + `blur` → fires `ts-change` |
| Multi / `check-options` (opt-in) | `addItem` + clears the typed text so the user can keep filtering for more matches. The check-options Apply / dropdown-close auto-apply still gate when the actual change emits (no surprise emits on every keystroke). |

**Works for both option sources:**

| Source | How |
|---|---|
| Local `options` | TomSelect filters `currentResults` synchronously on each keystroke. The component hooks `onType` and runs the auto-select check on `setTimeout(0)` so the filter pass has finished. |
| Remote `search-url` | The keystroke triggers `load()`, which is async. By the time `onType` runs, `currentResults.items.length` is 0. The component also subscribes to TomSelect's `load` event post-init — the helper runs again after the fetch resolves. |

**Live attribute check.** The gate (`_autoSelectActive()`) re-reads the raw
attribute on every keystroke / load, so the behavior can be flipped at
runtime via `setAttribute('auto-select-single', 'true' | 'false')` without
recreating the picker. The multi-select demo card uses this for a live
on/off checkbox.

> **Heads-up — `allow-create` interaction.** A picker carrying both
> `allow-create` AND `auto-select-single` will auto-select an existing match
> rather than create a new entry for a string that exactly matches one option
> (and only one). Creating still works for any string that doesn't match an
> existing option. If that bites a workflow, drop `auto-select-single` from
> that picker.

## Integration patterns

### With Datastar signals

Bind the value to a signal via `data-on:ts-change`:

```html
<rocket-tom-select check-options
  options='…'
  data-on:ts-change="$regionFilter = evt.detail.value;
                     @get('/list', {filterSignals: {include: /^.+Filter$/}})">
</rocket-tom-select>
```

The `filterSignals` whitelist keeps the GET URL from bloating with unrelated
signals.

### Cascading pickers (parent → child)

Wire a `ts-change` listener on the parent picker that rewrites the child's
`options` attribute. Because `options` is observed (see **Internals**), the
child re-renders its list.

```js
parentEl.addEventListener('ts-change', function (evt) {
  const childOpts = lookup[evt.detail.value] || []
  childEl.setAttribute('options', JSON.stringify(childOpts))
})
```

### Dynamically replacing the option list

Write a fresh JSON string to the `options` attribute. The component watches
that prop via `observeProps`:

```js
observeProps((_p, changes) => {
  if (!tsInstance) return
  if ('options' in changes) {
    const optStr = props.options || ''
    if (optStr !== prevOptionsStr) {
      prevOptionsStr = optStr
      const parsed = optStr ? JSON.parse(optStr) : []
      tsInstance.clearOptions()
      tsInstance.addOptions(parsed)
      tsInstance.refreshOptions(false)
    }
  }
  …
}, 'options', 'value')
```

So `host.setAttribute('options', JSON.stringify([…]))` is enough to swap the
list at runtime.

### Adding one option + selecting it (the "+ New" popup pattern)

Reach into the TomSelect instance directly. The inner `<select>` carries
`.tomselect`:

```js
const ts = hostEl.querySelector('select').tomselect

ts.addOption({ value: String(newId), text: 'New label' })
ts.refreshOptions(false)
ts.setValue(String(newId), false)   // false → fire onChange / ts-change
```

`setValue(…, false)` (non-silent) is essential — it fires `onChange` →
`ts-change` → bubbling `change` → any external change listener.

## Gotchas

- **Always JSON-encode `options`.** It's a string attribute; the component
  `JSON.parse`s it. An unencoded value will silently parse to `[]` (try/catch
  swallow).

- **`detail-field` requires extras *in* `options`.** The fields you name
  must exist on each option object (`{value, text, state, city, phone}`),
  otherwise the rendered cells are blank.

- **Pre-seed `options` even with `search-url`.** Without an initial option
  for the currently-selected value, the picker displays the bare ID.

- **`check-options` and single-select don't mix.** Setting `check-options`
  forces `maxItems = 50`. Don't combine with `max-items="1"`.

- **`auto-select-single` is a no-op when the value already includes the
  match** (would otherwise close the dropdown after every keystroke for an
  already-resolved picker). The helper short-circuits on `alreadyHas`.

- **Light DOM only.** Page CSS must reach the inner `<select>`. Don't switch
  to shadow DOM without porting your rules.

- **TomSelect wraps the `<select>` in `.ts-wrapper`.** Layout rules that
  target the picker by class need `.ts-wrapper` selectors.

- **`dropdown-parent="body"` for tight containers.** Inside grids, modal
  bodies, or `overflow:hidden` panels the dropdown is clipped. Setting
  `dropdown-parent="body"` lets it escape to `<body>`.

## Internals

### Lazy CDN load

The Tom Select script is fetched once per page via a module-level promise:

```js
let tomSelectPromise = null
function loadTomSelect() {
  if (window.TomSelect) return Promise.resolve(window.TomSelect)
  if (tomSelectPromise) return tomSelectPromise
  tomSelectPromise = new Promise(…)
  return tomSelectPromise
}
```

So N pickers on a single page = 1 network request.

### Lifecycle

| Hook | What it does |
|---|---|
| `render` | Emits `<select data-rocket-ref="selectEl">` — the bare element TomSelect wraps |
| `onFirstRender` | Loads the CDN, defines `_tryAutoSelectSingle`, builds the TomSelect config, instantiates it, attaches the check-options Apply/Clear bar (if applicable), subscribes to `load` (when `search-url` is set) |
| `observeProps('options', 'value')` | Live-syncs both attributes back into the instance — replaces options or sets value via `tsInstance.setValue` |
| `cleanup` | `tsInstance.destroy()` to release event listeners and DOM |

### `_tryAutoSelectSingle` helper (shared)

One implementation, two call sites — pulled out of `buildConfig` into the
`onFirstRender` closure so both `onType` (sync, local) and the post-init
`tsInstance.on('load', …)` listener (async, remote) can call it. The
per-call `_autoSelectActive()` gate reads the raw attribute live, so the
toggle can be flipped at runtime:

```js
function _autoSelectActive() {
  const raw = host.getAttribute('auto-select-single')
  if (raw === null) return !isMulti   // default: ON for single, OFF for multi
  return raw !== 'false' && raw !== '0'
}

function _tryAutoSelectSingle(ts) {
  if (!ts) return
  if (!_autoSelectActive()) return
  const items = ts.currentResults && ts.currentResults.items
  if (!items || items.length !== 1) return
  const only = items[0].id
  const current = ts.getValue()
  const alreadyHas = Array.isArray(current)
    ? current.indexOf(only) !== -1
    : current === only
  if (alreadyHas) return
  if (isMulti) {
    ts.addItem(only, false)
    ts.setTextboxValue('')
  } else {
    ts.setValue(only, false)
    ts.close()
    ts.blur()
  }
}
```

The `isMulti` capture (`!!props.checkOptions || (props.maxItems || 1) > 1`)
is evaluated once at `onFirstRender` time — `max-items` / `check-options`
aren't expected to change mid-life, so memoizing is safe.
