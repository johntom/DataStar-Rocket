// Rocket Tom Select component — Datastar Pro v1.0.1
// Public contract preserved from the RC.7/8 template version:
//   tag:    <rocket-tom-select>
//   props:  placeholder, max-items, options, value, allow-create,
//           detail-field, search-url, check-options, dropdown-parent
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
  }),

  render: ({ html }) => html`<select data-rocket-ref="selectEl"></select>`,

  onFirstRender({ host, refs, props, emit, cleanup, observeProps }) {
    let tsInstance = null
    let prevOptionsStr = ''
    let lastSyncedValue = ''

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
      applyBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        fireChange.call(ts, ts.getValue())
        ts.close()
      })
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        ts.clear(true)
        fireChange.call(ts, '')
        ts.close()
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
