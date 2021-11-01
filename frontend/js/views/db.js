import { LitElement, html } from '../../vendor/lit/lit.min.js'
import { repeat } from '../../vendor/lit/directives/repeat.js'
import * as api from '../lib/api.js'
import { shortenHash } from '../lib/strings.js'
import { emit } from '../lib/dom.js'
import { writeToClipboard } from '../lib/clipboard.js'
import * as QP from '../lib/qp.js'
import * as toast from '../com/toast.js'
import selectorSvg from '../icons/selector.js'
import { ConfirmPopup } from '../com/popups/confirm.js'
import { PromptPopup } from '../com/popups/prompt.js'
import { ConfigdbPopup } from '../com/popups/configdb.js'
import '../com/structs/core.js'
import '../com/structs/bee.js'
import '../com/button.js'
import '../com/code-textarea.js'

class DbView extends LitElement {
  static get properties () {
    return {
      hyperKey: {type: String},
      struct: {type: String},
      dbDesc: {type: Object}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()
    this.currentPath = ''
    this.hyperKey = ''
    this.struct = undefined
    this.dbDesc = undefined
  }

  async load () {
    this.hyperKey = QP.get('key')

    if (!this.dbDesc) {
      this.dbDesc = await api.http('GET', `/_api/dbs/${this.hyperKey}`)
      console.log(this.dbDesc)
    }
    if (QP.has('struct')) {
      const struct = QP.get('struct')
      if ((struct === 'core' || struct === 'bee')) {
        this.struct = struct
      }
    }
    if (!this.struct) {
      this.struct = this.dbDesc?.type || 'core'
    }
    document.title = `${this.dbDesc?.alias || shortenHash(this.hyperKey)} | Coresplore`

    await this.updateComplete
    this.querySelector('#struct')?.load()
  }

  async refresh () {
  }

  async pageLoadScrollTo (y) {
  }

  // rendering
  // =

  render () {
    return html`
      <main class="flex min-h-screen bg-default-3">
        <div class="flex-1" style="min-width: 0">
          <div class="flex items-center px-4 py-2 text-md bg-default border-b border-default-2">
            <div class="flex-1">
              <a class="font-bold hover:underline" href="/">Coresplore</a>
              › <a class="font-medium hover:underline" href="/db${QP.dropAllBut('key', 'struct')}">${this.dbDesc?.alias || shortenHash(this.hyperKey)}</a>
            </div>
            <div class="w-64">
              <input type="text" placeholder="Enter a hypercore key" class="border border-default rounded-full w-full px-3 py-1 text-sm" @keyup=${this.onKeyupKeyInput}>
            </div>
          </div>
          ${this.renderStruct()}
        </div>
        <div class="px-4 py-3 border-default-2 border-l" style="flex: 0 0 250px">
          <app-button btn-class="block w-full py-1.5 px-3 mb-2 font-medium" color="green" label="New Database" @click=${this.onClickNewDatabase}></app-button>
          <app-button btn-class="block w-full py-1.5 px-3 mb-2" label="Import Database" @click=${this.onClickImportDatabase}></app-button>
        </div>
      </main>
    `
  }

  renderStruct () {
    if (this.struct) {
      return html`
        ${this.renderStructNav()}
        <div class="px-4 py-4">
          ${this.struct === 'bee' ? html`
            <app-struct-bee id="struct" current-path=${this.currentPath} .dbDesc=${this.dbDesc}></app-struct-bee>
          ` : ''}
          ${this.struct === 'core' ? html`
            <app-struct-core id="struct" current-path=${this.currentPath} .dbDesc=${this.dbDesc}></app-struct-core>
          ` : ''}
        </div>
      `
    } else {
      return html`
        <div><span class="spinner"></span></div>
      `
    }
  }

  renderStructNav () {
    const items = ['core']
    if (this.dbDesc?.type === 'bee') {
      items.push('bee')
    }
    const renderType = (type) => {
      const label = ({core: 'Hypercore', bee: 'Hyperbee'})[type]
      return html`
        <option value=${type} ?selected=${this.struct === type}>View: ${label}</div>
      `
    }
    return html`
      <div class="flex text-sm pl-3 pr-4 py-1 bg-default border-b border-default-2"">
        <div class="flex-1 flex">
          <div class="inline-flex items-center border border-default rounded px-2">
            <select class="flex-1 appearance-none outline-none" name="struct" @change=${this.onStructChange}>
              ${repeat(items, renderType)}
            </select>
            ${selectorSvg('w-4 h-4')}
          </div>
        </div>
        <div class="">
          ${this.dbDesc ? html`
            ${this.dbDesc.saved ? html`
              <app-button transparent label="Delete DB" @click=${this.onClickToggleSaved}></app-button>
            ` : html`
              <app-button transparent label="Save DB" @click=${this.onClickToggleSaved}></app-button>
            `}
            <app-button transparent label="Copy Key" @click=${this.onClickCopyKey}></app-button>
          ` : ''}
        </div>
      </div>
    `
  }

  // events
  // =

  onStructChange (e) {
    emit(this, 'navigate-to', {detail: {url: QP.genFull({struct: e.currentTarget.value, key: this.hyperKey}, true)}})
  }

  async onClickToggleSaved (e) {
    if (this.dbDesc.saved) {
      await ConfirmPopup.create({message: 'Delete this database?'})
      try {
        await api.http('DELETE', `/_api/dbs/${this.hyperKey}`)
      } catch (e) {
        toast.create(e.message, 'error')
        console.error(e)
        return
      }
      emit(this, 'navigate-to', {detail: {url: `/`}})
    } else {
      const alias = await PromptPopup.create({message: 'Enter a name for this database:'})
      try {
        await api.http('POST', '/_api/dbs', {
          key: this.hyperKey,
          alias
        })
      } catch (e) {
        toast.create(e.message, 'error')
        console.error(e)
        return
      }
      location.reload()
    }
  }

  onClickCopyKey (e) {
    e.preventDefault()
    e.stopPropagation()
    writeToClipboard(this.hyperKey)
    toast.create('Key copied to clipboard')
  }

  onKeyupKeyInput (e) {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      emit(this, 'navigate-to', {detail: {url: `/db${QP.gen({key: e.currentTarget.value.trim().toLowerCase()}, true)}`}})
    }
  }

  async onClickNewDatabase (e) {
    e.preventDefault()
    e.stopPropagation()
    await ConfigdbPopup.create({})
  }

  async onClickImportDatabase (e) {
    e.preventDefault()
    e.stopPropagation()
    await ImportdbPopup.create({})
  }
}

customElements.define('app-db-view', DbView)
