// Rocket Tom Select component — Datastar Pro v1.0.1
// Public contract preserved from the RC.7/8 template version:
//   tag:    <rocket-tom-select>
//   props:  placeholder, max-items, options, value, allow-create,
//           detail-field, search-url, check-options, dropdown-parent,
//           auto-select-single
//   emits:  ts-change CustomEvent { detail: { value: string } }

import { rocket } from '/static/datastar-pro.js'

const TOM_SELECT_CDN =
  'https://cdn.jsdelivr.net/npm/tom-select@2.4.1/dist/js/tom-select.complete.min.js'

let tomSelectPromise = null
function loadTomSelect() {
  if (window.TomSelect) return Promise.resolve(window.TomSelect)
  if (tomSelectPromise) return tomSelectPromise
  tomSelectPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = TOM_SELECT_CDN
    s.onload = () => resolve(window.TomSelect)
    s.onerror = () => reject(new Error('Failed to load TomSelect'))
    document.head.appendChild(s)
  })
  return tomSelectPromise
}

function parseOptions(raw) {
  try {
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

rocket('rocket-tom-select', {
  mode: 'light',
  renderOnPropChange: false,

  props: ({ string, number, bool }) => ({
    placeholder: string.default('Select...'),
    maxItems: number.min(1).default(1),
    options: string.default(''),
    value: string.default(''),
    allowCreate: bool.default(false),
    detailField: string.default(''),
    searchUrl: string.default(''),
    checkOptions: bool.default(false),
    dropdownParent: string.default(''),
    // When the user's typing narrows the dropdown to a single remaining
    // option, auto-select it. Two code paths: onType (local-option pickers,
    // sync filter) and the post-load event (remote search-url pickers,
    // async results).
    // Single-select picker: setValue + close + blur.
    // Multi / check-options picker: addItem + clear typed text so the user
    //   can keep filtering for more matches.
    // Default: ON for single-select (max-items=1, no check-options); OFF
    // for multi / check-options (would hijack the typed text mid-filter).
    // Override either way with auto-select-single="true" / "false". The
    // attribute is re-read live on every keystroke / load, so it can be
    // toggled at runtime (e.g. via data-attr in Datastar).
    autoSelectSingle: bool.default(false),
  }),

  render: ({ html }) => html`<select data-rocket-ref="selectEl"></select>`,

  onFirstRender({ host, refs, props, emit, cleanup, observeProps }) {
    let tsInstance = null
    let prevOptionsStr = ''
    let lastSyncedValue = ''

    // Shared auto-select-single resolver. Called from config.onType
    // (local-option pickers, sync filter) AND from a post-init 'load'
    // listener (remote search-url pickers, async results). Both call sites
    // are always wired; _autoSelectActive() is the per-call gate.
    const isMulti = !!props.checkOptions || (props.maxItems || 1) > 1
    // Live check — re-read the raw attribute on every call so callers can
    // toggle auto-select-single at runtime (e.g. data-attr:auto-select-single
    // in the demo). bool.default(false) collapses "unset" and explicit
    // "false", so we read the raw attribute: unset → ON for single-select
    // / OFF for multi; explicit "false"/"0" → off; anything else → on.
    function _autoSelectActive() {
      const raw = host.getAttribute('auto-select-single')
      if (raw === null) return !isMulti
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
        ts.addItem(only, false)        // add to selection
        ts.setTextboxValue('')          // clear typed text for next filter
      } else {
        ts.setValue(only, false)        // false → fire onChange / ts-change
        ts.close()
        ts.blur()
      }
    }

    function buildConfig(TomSelect) {
      const opts = parseOptions(props.options)
      const config = {
        placeholder: props.placeholder,
        maxItems: props.maxItems || 1,
        maxOptions: null,
        create: !!props.allowCreate,
        plugins: {},
        onInitialize() {
          if (props.value) this.setValue(props.value.split(','), true)
        },
        onChange(val) {
          try {
            const strVal = Array.isArray(val) ? val.join(',') : ('' + (val || ''))
            // Sync back to the value attribute so external bindings see it
            if (host.getAttribute('value') !== strVal) {
              host.setAttribute('value', strVal)
            }
            lastSyncedValue = strVal
            emit('ts-change', { value: strVal })
          } catch (e) {
            console.error('[rocket-tom-select onChange]', e)
          }
        },
      }

      if (props.dropdownParent) config.dropdownParent = props.dropdownParent

      if (props.checkOptions) {
        config.maxItems = 50
        config.plugins.checkbox_options = {}
        config.plugins.remove_button = { title: 'Remove' }
        config._realOnChange = config.onChange
        config.onChange = function () {} // Apply button fires it
      } else if ((props.maxItems || 1) > 1) {
        config.plugins.remove_button = { title: 'Remove' }
      }

      // Auto-resolve when typing narrows the dropdown to a single option.
      // Always wired; the per-call _autoSelectActive() gate decides whether
      // to actually fire (supports runtime toggling of the attribute).
      // Two call sites:
      //   • onType  → local-option pickers (TomSelect filters currentResults
      //     synchronously, so setTimeout(0) lets that pass finish before we
      //     inspect items).
      //   • 'load' event (wired post-init below) → remote search-url pickers
      //     (results arrive AFTER the keystroke; onType already ran and saw 0).
      // Single-select  → setValue + close + blur.
      // Multi / check-options → addItem and clear the typed text so the user
      //   can keep filtering for more matches (the check-options Apply /
      //   dropdown_close auto-apply still gate the actual search).
      config.onType = function (query) {
        if (!query) return
        var self = this
        setTimeout(function () { _tryAutoSelectSingle(self) }, 0)
      }

      if (opts.length > 0) {
        config.options = opts
        config.labelField = 'text'
        config.valueField = 'value'
        config.searchField = ['text']
      }

      if (props.detailField) {
        const fields = props.detailField.split(',').map((f) => f.trim())
        config.searchField = ['text'].concat(fields)
        config.render = {
          option(data, escape) {
            let h = '<div style="display:flex;gap:.5rem">'
              + '<span style="flex:1">' + escape(data.text) + '</span>'
            for (const f of fields) {
              h += '<span style="color:#888;font-size:.8em;min-width:5rem;text-align:right">'
                + escape(data[f] || '') + '</span>'
            }
            return h + '</div>'
          },
          item(data, escape) {
            const parts = [escape(data.text)]
            for (const f of fields) if (data[f]) parts.push(escape(data[f]))
            return '<div>' + parts.join(' · ') + '</div>'
          },
        }
      }

      if (props.searchUrl) {
        const sUrl = props.searchUrl
        config.load = function (query, callback) {
          if (!query.length) return callback()
          fetch(sUrl + '?q=' + encodeURIComponent(query))
            .then((res) => res.json())
            .then((data) => callback(data))
            .catch(() => callback())
        }
        config.labelField = 'text'
        config.valueField = 'value'
        config.searchField = ['text']
      }

      return config
    }

    function attachCheckboxBar() {
      const cfg = tsInstance.settings
      if (!cfg._realOnChange) return
      const fireChange = cfg._realOnChange
      const bar = document.createElement('div')
      bar.style.cssText = 'display:flex;gap:4px;padding:4px 6px;border-top:1px solid var(--clr-border,#ddd);'
      const applyBtn = document.createElement('button')
      applyBtn.type = 'button'
      applyBtn.textContent = 'Apply'
      applyBtn.style.cssText = 'flex:1;padding:2px 6px;font-size:11px;cursor:pointer;background:#4472c4;color:#fff;border:1px solid #3560a8;border-radius:3px;'
      const clearBtn = document.createElement('button')
      clearBtn.type = 'button'
      clearBtn.textContent = 'Clear'
      clearBtn.style.cssText = 'flex:1;padding:2px 6px;font-size:11px;cursor:pointer;background:var(--clr-bg,#f5f5f5);color:var(--clr-text,#333);border:1px solid var(--clr-border,#ccc);border-radius:3px;'
      const ts = tsInstance
      const norm = (v) => (Array.isArray(v) ? v.join(',') : ('' + (v || '')))
      // Value last emitted via ts-change; used so the dropdown-close
      // auto-apply doesn't fire a duplicate emit right after Apply/Clear.
      let lastApplied = norm(ts.getValue())
      function apply (val) {
        lastApplied = norm(val)
        fireChange.call(ts, val)
      }
      applyBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        apply(ts.getValue())
        ts.close()
      })
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        ts.clear(true)
        apply('')
        ts.close()
      })
      // Auto-apply on dropdown close (click-away / Escape / done selecting)
      // when the value changed since the last apply — so picking a filter
      // refreshes without hunting for the Apply button. Explicit Apply/Clear
      // still work; no-ops when the value is unchanged.
      ts.on('dropdown_close', () => {
        if (norm(ts.getValue()) !== lastApplied) apply(ts.getValue())
      })
      bar.appendChild(applyBtn)
      bar.appendChild(clearBtn)
      ts.dropdown.style.display = 'flex'
      ts.dropdown.style.flexDirection = 'column'
      ts.dropdown_content.style.maxHeight = '170px'
      ts.dropdown_content.style.flex = '1'
      ts.dropdown.appendChild(bar)
      ts.close()
      ts.blur()
    }

    loadTomSelect()
      .then((TomSelect) => {
        if (!refs.selectEl || tsInstance) return
        tsInstance = new TomSelect(refs.selectEl, buildConfig(TomSelect))
        prevOptionsStr = props.options || ''
        lastSyncedValue = props.value || ''
        attachCheckboxBar()
        // Remote-picker auto-select: re-evaluate after each async load
        // completes (onType already ran before fetch returned and saw 0).
        // The helper short-circuits if auto-select is currently inactive.
        if (props.searchUrl) {
          tsInstance.on('load', function () {
            _tryAutoSelectSingle(tsInstance)
          })
        }
      })
      .catch((e) => console.error('[rocket-tom-select]', e))

    observeProps(
      (_p, changes) => {
        if (!tsInstance) return
        if ('options' in changes) {
          const optStr = props.options || ''
          if (optStr !== prevOptionsStr) {
            prevOptionsStr = optStr
            try {
              const parsed = optStr ? JSON.parse(optStr) : []
              tsInstance.clearOptions()
              tsInstance.addOptions(parsed)
              tsInstance.refreshOptions(false)
            } catch {}
          }
        }
        if ('value' in changes) {
          const newVal = props.value || ''
          if (newVal !== lastSyncedValue) {
            lastSyncedValue = newVal
            if (newVal) tsInstance.setValue(newVal.split(','), true)
            else tsInstance.clear(true)
          }
        }
      },
      'options',
      'value',
    )

    cleanup(() => {
      if (tsInstance) {
        tsInstance.destroy()
        tsInstance = null
      }
    })
  },
})
