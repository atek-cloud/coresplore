import { LitElement, html } from '../../../vendor/lit/lit.min.js'
import { repeat } from '../../../vendor/lit/directives/repeat.js'
import * as api from '../../lib/api.js'
import * as QP from '../../lib/qp.js'
import { emit } from '../../lib/dom.js'
import * as toast from '../toast.js'
import { ConfirmPopup } from '../popups/confirm.js'
import selectorSvg from '../../icons/selector.js'
import '../button.js'
import '../code-textarea.js'

class StructCore extends LitElement {
  static get properties () {
    return {
      hyperKey: {type: String},
      dbDesc: {type: Object},
      encoding: {type: String},
      error: {type: String},
      record: {type: Array},
      records: {type: Array},
      selectedRecordKeys: {type: Array},
      isEditingNew: {type: Object}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()
    this.hyperKey = ''
    this.dbDesc = undefined
    this.encoding = undefined
    this.error = undefined
    this.record = undefined
    this.records = undefined
    this.initialRecordValue = undefined
    this.isEditingNew = undefined
  }

  async load () {
    this.record = undefined
    this.records = undefined
    this.isEditingNew = undefined
    
    this.hyperKey = QP.get('key')
    this.encoding = QP.get('encoding')
    if (!this.encoding) {
      this.encoding = this.dbDesc?.type === 'bee' ? 'hyperbee' : 'utf-8'
    }

    if (QP.has('new')) {
      this.isEditingNew = {}
      console.log(this.isEditingNew)
    } else {
      try {
        this.record = QP.has('seq') ? await api.http('GET', `/_api/core/${this.hyperKey}/${QP.get('seq')}?encoding=${this.encoding}`).catch(e => undefined) : undefined
        if (this.record?.error) {
          console.error(this.record)
          this.record = undefined
        }
        if (!this.record) {
          this.records = (await api.http('GET', `/_api/core/${this.hyperKey}?encoding=${this.encoding}`)).records
        }
        this.initialRecordValue = this.record ? JSON.stringify(this.record.value, null, 2) : undefined
        console.log(this.currentDBPath, this.record || this.records)
      } catch (e) {
        this.error = e.toString()
        console.log('Failed to fetch records')
        console.log(e)
      }
    }
  }

  async refresh () {
  }

  async pageLoadScrollTo (y) {
  }

  // rendering
  // =

  render () {
    return html`
      <div class="mb-2">
        ${this.renderBreadcrumbs()}
      </div>
      ${this.renderCurrentData()}
    `
  }

  renderBreadcrumbs () {
    const htmlAcc = []
    htmlAcc.push(html`
      <a class="px-2 py-1 hover:text-primary" href=${QP.genFull({seq: false, new: false})}>Root</a>
    `)
    if (this.record) {
      htmlAcc.push(html`
        <div class="relative" style="width: 20px">
          <div class="absolute border-t border-r border-default pointer-events-none" style="transform: rotate(45deg); width: 24px; height: 24px; left: -10px; top: 4px;"></div>
        </div>
      `)
      htmlAcc.push(html`
        <a class="block px-2 py-1 hover:text-primary" href=${QP.genFull({seq: this.record.seq, new: false})}>${this.record.seq}</a>
      `)
    }
    return html`
      <div class="inline-flex border border-default rounded bg-default px-2">
        ${htmlAcc}
      </div>
    `
  }

  renderCurrentData () {
    if (this.isEditingNew) {
      return this.renderNewRecord()
    } else if (this.record) {
      return this.renderRecord()
    } else if (this.records) {
      return this.renderRecords()
    } else if (this.error) {
      return html`
        <div>${this.error}</div>
      `
    } else {
      return html`
        <div><span class="spinner"></span></div>
      `
    }
  }

  renderRecords () {
    return html`
      <div>
        <div class="flex border rounded-t border-default items-center">
          <div class="flex-1 px-2 py-2">
            <app-button label="New record" class="mr-1" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickNew}></app-button>
          </div>
          <div class="px-2 py-2">
            ${this.renderEncodingControl()}
          </div>
        </div>
        ${repeat(this.records, r => r.seq, (record, i) => html`
          <a
            class="
              flex border border-t-0 border-default items-center
              bg-default hover:bg-default-2
              cursor-pointer ${i === this.records.length - 1 ? 'rounded-b' : ''} tabular-nums"
            href=${QP.genFull({seq: record.seq})}
          >
            <div class="px-3 py-2 text-sm truncate" style="flex: 0 0 100px">${record.seq}</div>
            <div class="flex-1 px-3 py-2 text-sm border-l border-default truncate">
              ${this.renderRecordValue(record, false)}
            </div>
          </a>
        `)}
        ${this.records?.length === 0 ? html`
          <div class="flex border border-default border-t-0 bg-default rounded-b px-4 py-2">No records found.</div>
        ` : ''}
      </div>
    `
  }

  renderRecord () {
    return html`
      <div class="flex">
        <div class="flex-1 mr-2">
          <textarea
            class="w-full px-4 py-3 font-mono rounded border border-default text-sm bg-default shadow-inner"
            style="min-height: calc(100vh - 160px)"
            disabled
          >${this.renderRecordValue(this.record, true)}</textarea>
        </div>
        <div style="flex: 0 0 25vw">
          <div class="border border-default rounded mb-1">
            <div class="py-1 px-1">${this.renderEncodingControl(true)}</div>
            <div class="flex items-center border-t border-default-2">
              <div class="px-2 py-1.5 text-sm text-default-3" style="flex: 0 0 55px">Seq</div>
              <div class="px-2 py-1.5 text-sm text-default-2 border-l border-default-2 flex-1">${this.record.seq}</div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderNewRecord () {
    return html`
      <div class="flex">
        <div class="flex-1 mr-2">
          <div class="flex border rounded-t border-default items-center">
            <div class="px-3 py-2 flex-1">
              <app-button btn-class="px-2 py-0" label="Save record" icon="fas fa-save" @click=${this.onClickSaveNew}></app-button>
              ${this.dbDesc?.type === 'bee' ? html`
                <span class="px-2">
                  <span class="fas fa-exclamation-triangle fa-fw"></span>
                  Warning! You are editing the core of a Hyperbee. This could easily corrupt the Hyperbee.
                </span>
              ` : ''}
            </div>
          </div>
          <textarea
            id="buffer"
            class="w-full px-4 py-3 font-mono rounded-b border border-default border-t-0 text-sm bg-default shadow-inner"
            style="min-height: calc(100vh - 220px)"
            spellcheck="false"
          ></textarea>
        </div>
        <div style="flex: 0 0 25vw">
          <div class="border border-default rounded mb-1">
            <div class="py-1 px-1">
              <div class="inline-flex items-center px-2 py-1">
                <select id="encoding" class="flex-1 appearance-none outline-none bg-transparent text-sm">
                  <option value="utf-8" ?selected=${this.encoding !== 'binary'}>Encoding: utf-8</div>
                  <option value="binary" ?selected=${this.encoding === 'binary'}>Encoding: binary</option>
                </select>
                ${selectorSvg('w-4 h-4')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderEncodingControl (noBorder = false) {
    const items = ['binary', 'utf-8']
    if (this.dbDesc?.type === 'bee') {
      items.push('hyperbee')
    }
    const renderEncoding = (enc) => {
      return html`
        <option value=${enc} ?selected=${this.encoding === enc}>Encoding: ${enc}</option>
      `
    }
    return html`
      <div class="inline-flex items-center ${noBorder ? '' : 'border border-default rounded'} px-2 py-1">
        <select class="flex-1 appearance-none outline-none bg-transparent text-sm" @change=${this.onEncodingChange}>
          ${repeat(items, renderEncoding)}
        </select>
        ${selectorSvg('w-4 h-4')}
      </div>
    `
  }

  renderRecordValue (record, full) {
    if (this.encoding === 'hyperbee') {
      return full ? JSON.stringify(record.value, null, 2) : JSON.stringify(record.value)
    }
    if (this.encoding === 'binary') {
      return record.value.replace(/.{4}(?=.)/g, '$& ')
    }
    return record.value
  }

  // events
  // =

  onEncodingChange (e) {
    emit(this, 'navigate-to', {detail: {url: QP.genFull({encoding: e.currentTarget.value})}})
  }
  
  onClickNew () {
    emit(this, 'navigate-to', {detail: {url: QP.genFull({seq: false, new: true})}})
  }

  async onClickSaveNew () {
    const encoding = this.querySelector('#encoding').value
    let value = this.querySelector('#buffer').value
    
    if (this.dbDesc?.type === 'bee') {
      await ConfirmPopup.create({
        message: 'Warning: You are editing the core of a Hyperbee. Are you sure you want to do this?',
        help: 'Hyperbees are complex structures. Editing them directly could corrupt their state.'
      })
    }
    
    if (encoding === 'binary') {
      value = value.replace(/\s/g, '')
      if (/[^0-9a-f]/.test(value)) {
        toast.create('Binary must be encoded in hex. Non-hex values are present.', 'error')
        return
      }
    }
    
    let res
    try {
      res = await api.http('POST', `/_api/core/${this.hyperKey}?encoding=${encoding}`, value, 'text/plain')
      if (res.error) throw res.message
    } catch (e) {
      console.error(e)
      toast.create(e.toString(), 'error')
      return
    }
    toast.create('Record saved', 'success')
    emit(this, 'navigate-to', {detail: {url: QP.genFull({new: false, seq: res.seq})}})
  }
}

customElements.define('app-struct-core', StructCore)
