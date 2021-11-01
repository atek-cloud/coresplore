import { LitElement, html } from '../../../vendor/lit/lit.min.js'
import { repeat } from '../../../vendor/lit/directives/repeat.js'
import * as api from '../../lib/api.js'
import * as QP from '../../lib/qp.js'
import { joinPath, pluralize } from '../../lib/strings.js'
import { emit, readTextFile } from '../../lib/dom.js'
import { exportAsJson, importFromJson } from '../../lib/import-export.js'
import * as toast from '../toast.js'
import { GeneralPopup } from '../popups/general.js'
import { ConfirmPopup } from '../popups/confirm.js'
import selectorSvg from '../../icons/selector.js'
import '../button.js'
import '../code-textarea.js'

class StructBee extends LitElement {
  static get properties () {
    return {
      hyperKey: {type: String},
      dbDesc: {type: Object},
      encoding: {type: String},
      error: {type: String},
      record: {type: Array},
      records: {type: Array},
      selectedRecordKeys: {type: Array},
      hasChanges: {type: Boolean},
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
    this.selectedRecordKeys = []
    this.initialRecordValue = undefined
    this.hasChanges = false
    this.isEditingNew = undefined
  }

  async load () {
    this.record = undefined
    this.records = undefined
    this.selectedRecordKeys = []
    this.hasChanges = false
    this.isEditingNew = undefined

    this.hyperKey = QP.get('key')
    this.encoding = QP.get('encoding')
    if (!this.encoding) {
      this.encoding = 'utf-8'
    }

    if (QP.has('new')) {
      this.isEditingNew = {
        path: QP.get('path').split('/').filter(Boolean)
      }
      this.currentDBPath = this.isEditingNew.path
      console.log(this.isEditingNew)
    } else {
      this.currentDBPath = QP.get('path', '/').split('/').filter(Boolean)
      try {
        this.record = QP.has('container') || this.currentDBPath.length === 0 ? undefined : await api.http('GET', `/_api/bee/${this.hyperKey}/${this.currentDBPath.join('/')}?encoding=${this.encoding}`).catch(e => undefined)
        if (this.record?.error) {
          console.error(this.record)
          this.record = undefined
        }
        this.records = toShallow(this.currentDBPath, (await api.http('GET', `/_api/bee/${this.hyperKey}/${this.currentDBPath.join('/')}?list=1&encoding=${this.encoding}`)).records)
        this.initialRecordValue = this.record ? this.renderRecordValue(this.record, true) : ''
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

  async doRenamePopup (record) {
    const newpath = await GeneralPopup.create({
      render () {
        const onSubmit = e => {
          e.preventDefault()
          const newpath = e.currentTarget.path.value.trim()
          if (!newpath) {
            return toast.create('Path can not be empty', 'error')
          }
          this.dispatchEvent(new CustomEvent('resolve', {detail: newpath}))
        }
        return html`
          <form class="bg-default px-6 py-4 rounded" @submit=${onSubmit}>
            <h2 class="text-2xl mb-2 font-medium">Rename record</h2>
            <input
              type="text"
              name="path"
              class="block border rounded px-5 py-4 w-full shadow-inner mb-4"
              value=${record.path}
            >
            <div class="flex justify-between">
              <app-button label="Cancel" @click=${this.onReject}></app-button>
              <app-button primary label="Save" btn-type="submit"></app-button>
            </div>
          </form>
        `
      }
    })
    if (newpath === record.path) {
      return
    }
    try {
      await doRename(this.hyperKey, record, newpath)
    } catch (e) {
      console.error(e)
      toast.create(`Failed to rename record: ${e.toString()}`, 'error')
      return
    }
    emit(this, 'navigate-to', {detail: {url: QP.genFull({path: newpath})}})
  }

  async doClonePopup (record) {
    const newpath = await GeneralPopup.create({
      render () {
        const onSubmit = e => {
          e.preventDefault()
          const newpath = e.currentTarget.path.value
          if (!newpath) {
            return toast.create('Path can not be empty', 'error')
          }
          if (newpath === record.path) {
            return toast.create('Must choose a new path', 'error')
          }
          this.dispatchEvent(new CustomEvent('resolve', {detail: newpath}))
        }
        return html`
          <form class="bg-default px-6 py-4 rounded" @submit=${onSubmit}>
            <h2 class="text-2xl mb-2 font-medium">Clone record</h2>
            <div>Clone:</div>
            <input
              type="text"
              disabled
              class="block border rounded px-5 py-4 w-full shadow-inner mb-4"
              value=${record.path}
            >
            <div>To:</div>
            <input
              type="text"
              name="path"
              class="block border rounded px-5 py-4 w-full shadow-inner mb-4"
              value=${record.path}
            >
            <div class="flex justify-between">
              <app-button label="Cancel" @click=${this.onReject}></app-button>
              <app-button primary label="Save" btn-type="submit"></app-button>
            </div>
          </form>
        `
      }
    })
    try {
      await doClone(this.hyperKey, record, newpath)
    } catch (e) {
      console.error(e)
      toast.create('Failed to create new record', 'error')
      return
    }
    emit(this, 'navigate-to', {detail: {url: QP.genFull({path: newpath})}})
  }

  async doImportPopup () {
    const currentPath = `/${this.currentDBPath.join('/')}`
    const {path, file} = await GeneralPopup.create({
      render () {
        const onSubmit = e => {
          e.preventDefault()
          const file = e.currentTarget.file.files[0]
          const path = e.currentTarget.path.value.trim()
          if (!path) {
            return toast.create('Path can not be empty', 'error')
          }
          this.dispatchEvent(new CustomEvent('resolve', {detail: {path, file}}))
        }
        return html`
          <form class="bg-default px-6 py-4 rounded" @submit=${onSubmit}>
            <h2 class="text-2xl mb-2 font-medium">Import records</h2>
            <label for="file">Source file</label>
            <input class="block border border-default mb-3 px-5 py-4 rounded w-full" type="file" name="file" required>
            <label for="path">Target path</label>
            <input
              type="text"
              name="path"
              class="block border rounded px-5 py-4 w-full shadow-inner mb-4"
              value=${currentPath}
            >
            <div class="text-sm text-default-3 mb-4">Note: records may be overwritten.</div>
            <div class="flex justify-between">
              <app-button label="Cancel" @click=${this.onReject}></app-button>
              <app-button primary label="Import" btn-type="submit"></app-button>
            </div>
          </form>
        `
      }
    })
    try {
      toast.create('Importing, please wait...')
      const n = await doImport(this.hyperKey, path, file)
      toast.create(`Imported ${n} ${pluralize(n, 'record')}`, 'success')
    } catch (e) {
      console.error(e)
      toast.create(`Failed to import records: ${e.toString()}`, 'error')
      return
    }
    this.load()
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
      <a class="px-2 py-1 hover:text-primary" href=${QP.genFull({path: '/', new: false})}>Root</a>
    `)
    if (this.currentDBPath?.length) {
      const acc = []
      for (const seg of this.currentDBPath) {
        htmlAcc.push(html`
          <div class="relative" style="width: 20px">
            <div class="absolute border-t border-r border-default pointer-events-none" style="transform: rotate(45deg); width: 24px; height: 24px; left: -10px; top: 4px;"></div>
          </div>
        `)
        htmlAcc.push(html`
          <a class="block px-2 py-1 hover:text-primary" href=${QP.genFull({path: joinPath(...acc, seg), container: true, new: false})}">${seg}</a>
        `)
        acc.push(seg)
      }
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
          <div class="px-3 py-2" style="flex: 0 0 20px" @click=${this.onToggleAllChecked}>
            <span class="far fa-fw ${this.selectedRecordKeys.length === this.records.length ? `fa-check-square` : `fa-square`}"></span>
          </div>
          <div class="flex-1 px-2 py-2">
            <app-button label="New record" class="mr-1" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickNew}></app-button>
            ${this.selectedRecordKeys.length > 1 ? html`
              <app-button label="Delete" class="mr-1" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickDeleteSelected}></app-button>
              <app-button label="Export" class="mr-1" btn-class="px-2 py-0" @click=${this.onClickExportSelected}></app-button>
            ` : this.selectedRecordKeys.length === 1 ? html`
              <app-button-group class="inline-flex mr-1">
                <app-button label="Rename" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickRenameSelected}></app-button>
                <app-button label="Clone" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickCloneSelected}></app-button>
                <app-button label="Delete" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickDeleteSelected}></app-button>
              </app-button-group>
              <app-button label="Export" class="mr-1" btn-class="px-2 py-0" @click=${this.onClickExportSelected}></app-button>
            </div>
            ` : html`
              <app-button label="Import" class="mr-1" btn-class="px-2 py-0" ?disabled=${!this.dbDesc.writable} @click=${this.onClickImport}></app-button>
            `}
          </div>
          <div class="px-2 py-2">
            ${this.renderEncodingControl()}
          </div>
        </div>
        ${repeat(this.records, r => r.key, (record, i) => html`
          <a
            class="
              flex border border-t-0 border-default items-center
              ${this.selectedRecordKeys.includes(record.key) ? 'bg-yellow-100 hover:bg-yellow-50' : 'bg-default hover:bg-default-2'}
              cursor-pointer ${i === this.records.length - 1 ? 'rounded-b' : ''} tabular-nums"
            href=${QP.genFull({path: joinPath(...this.currentDBPath, record.key), container: record.isContainer})}
          >
            <div class="px-3 py-2" style="flex: 0 0 20px" @click=${e => this.onToggleCheckmark(e, record.key)}>
              <span class="far fa-fw ${this.selectedRecordKeys.includes(record.key) ? `fa-check-square` : `fa-square`}"></span>
            </div>
            <div class="px-3 py-2 text-sm border-l border-default truncate" style="flex: 0 0 250px">${record.key}</div>
            <div class="flex-1 px-3 py-2 text-sm border-l border-default truncate">
              ${record.isContainer ? html`<span class="fas fa-fw fa-angle-right"></span>` : this.renderRecordValue(record)}
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
          <div class="flex border rounded-t border-default items-center">
            <div class="px-3 py-2 flex-1">
              <app-button btn-class="px-2 py-0" ?primary=${this.hasChanges} label="Save changes" icon="fas fa-save" ?disabled=${!this.dbDesc.writable || !this.hasChanges} @click=${this.onClickSave}></app-button>
              <app-button btn-class="px-2 py-0" transparent label="Delete" ?disabled=${!this.dbDesc.writable} @click=${this.onClickDelete}></app-button>
            </div>
            <div class="px-3 py-2">
              <app-button btn-class="px-2 py-0" transparent label="Rename" ?disabled=${!this.dbDesc.writable} @click=${this.onClickRename}></app-button>
              <app-button btn-class="px-2 py-0" transparent label="Clone" ?disabled=${!this.dbDesc.writable} @click=${this.onClickClone}></app-button>
              <app-button btn-class="px-2 py-0" transparent label="Export" @click=${this.onClickExport}></app-button>
            </div>
          </div>
          <app-code-textarea
            id="buffer"
            textarea-class="w-full px-4 py-3 font-mono rounded-b border border-default border-t-0 text-sm bg-default shadow-inner"
            textarea-style="min-height: calc(100vh - 160px)"
            ?disabled=${!this.dbDesc.writable}
            value=${this.initialRecordValue}
            @keyup=${this.onRecordKeyup}
          ></app-code-textarea>
        </div>
        <div style="flex: 0 0 25vw">
          <div class="border border-default rounded mb-1">
            <div class="py-1 px-1">
              ${this.renderEncodingControl(true)}
            </div>
            <div class="flex items-center border-t border-default-2">
              <div class="px-2 py-1.5 text-sm text-default-3" style="flex: 0 0 55px">Key</div>
              <div class="px-2 py-1.5 text-sm text-default-2 border-l border-default-2 flex-1 break-words">${this.record.key}</div>
            </div>
            <div class="flex items-center border-t border-default-2">
              <div class="px-2 py-1.5 text-sm text-default-3" style="flex: 0 0 55px">Path</div>
              <div class="px-2 py-1.5 text-sm text-default-2 border-l border-default-2 flex-1 break-words">${this.record.path}</div>
            </div>
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
            </div>
          </div>
          <div class="flex w-full px-4 py-3 font-mono border border-default border-t-0 text-sm bg-default shadow-inner">
            <span>/${this.isEditingNew.path.join('/')}${this.isEditingNew.path.length > 0 ? '/' : ''}</span>
            <input
              type="text"
              id="path"
              placeholder="key"
              class="flex-1 ml-2"
              required
            >
          </div>
          <app-code-textarea
            id="buffer"
            textarea-class="w-full px-4 py-3 font-mono rounded-b border border-default border-t-0 text-sm bg-default shadow-inner"
            textarea-style="min-height: calc(100vh - 160px)"
            value=${this.encoding === 'json' ? '{}' : ''}
          ></app-code-textarea>
        </div>
        <div style="flex: 0 0 25vw">
          <div class="border border-default rounded mb-1">
            <div class="py-1 px-1">
              <div class="inline-flex items-center px-2 py-1">
                <select id="encoding" class="flex-1 appearance-none outline-none bg-transparent text-sm">
                  <option value="json" ?selected=${this.encoding === 'json'}>Encoding: json</div>
                  <option value="utf-8" ?selected=${this.encoding === 'utf-8'}>Encoding: utf-8</div>
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

  renderRecordValue (record, noHtml = false) {
    if (this.encoding === 'json') {
      try {
        JSON.parse(record.value)
      } catch (e) {
        if (!noHtml) {
          return html`<span class="text-error"><span class="fas fa-exclamation-triangle fa-fw"></span> Invalid JSON</span> ${record.value}`
        }
      }
    }
    if (this.encoding === 'binary') {
      return record.value.replace(/.{4}(?=.)/g, '$& ')
    }
    return record.value
  }

  renderEncodingControl (noBorder = false) {
    const items = ['binary', 'utf-8', 'json']
    const renderEncoding = (enc) => {
      return html`
        <option value=${enc} ?selected=${this.encoding === enc}>Encoding: ${enc}</option>
      `
    }
    return html`
      <div class="inline-flex items-center ${noBorder ? '' : 'border border-default rounded'} px-2 py-1">
        <select id="encoding" class="flex-1 appearance-none outline-none bg-transparent text-sm" @change=${this.onEncodingChange}>
          ${repeat(items, renderEncoding)}
        </select>
        ${selectorSvg('w-4 h-4')}
      </div>
    `
  }

  // events
  // =

  onRecordKeyup (e) {
    this.hasChanges = e.target.value !== this.initialRecordValue
  }

  onEncodingChange (e) {
    if (this.hasChanges) {
      if (!confirm('This will lose your current changes. Continue?')) {
        e.currentTarget.value = this.encoding
        return
      }
    }
    emit(this, 'navigate-to', {detail: {url: QP.genFull({encoding: e.currentTarget.value})}})
  }
  
  onToggleAllChecked (e) {
    e.preventDefault()
    if (this.selectedRecordKeys.length === this.records.length) {
      this.selectedRecordKeys = []
    } else {
      this.selectedRecordKeys = this.records.map(r => r.key)
    }
  }

  onToggleCheckmark (e, key) {
    e.preventDefault()
    e.stopPropagation()
    if (!this.selectedRecordKeys.includes(key)) {
      this.selectedRecordKeys = [...this.selectedRecordKeys, key]
    } else {
      this.selectedRecordKeys = [...this.selectedRecordKeys.filter(k => k !== key)]
    }
  }

  onClickNew () {
    const url = QP.genFull({new: true, path: `/${this.currentDBPath.join('/')}`})
    emit(this, 'navigate-to', {detail: {url}})
  }

  onClickImport (e) {
    e.preventDefault()
    this.doImportPopup()
  }

  async onClickSave () {
    const encoding = this.querySelector('#encoding').value
    let value = this.querySelector('#buffer textarea').value
    if (encoding === 'json') {
      try {
        JSON.parse(value)
      } catch (e) {
        console.error(e)
        toast.create(e.toString(), 'error')
        return
      }
    } else if (encoding === 'binary') {
      value = value.replace(/\s/g, '')
      if (/[^0-9a-f]/.test(value)) {
        toast.create('Binary must be encoded in hex. Non-hex values are present.', 'error')
        return
      }
    }
    try {
      await api.http('PUT', `/_api/bee/${joinPath(this.hyperKey, this.record.path)}?encoding=${encoding}`, value, 'text/plain')
    } catch (e) {
      console.error(e)
      toast.create(e.toString(), 'error')
      return
    }
    this.initialRecordValue = value
    this.hasChanges = false
    toast.create('Record saved', 'success')
    this.load()
  }

  async onClickSaveNew () {
    const path = this.querySelector('#path').value
    const encoding = this.querySelector('#encoding').value
    let value = this.querySelector('#buffer textarea').value
    if (!path) {
      return toast.create('Key is required', 'error')
    }
    if (encoding === 'json') {
      try {
        JSON.parse(value)
      } catch (e) {
        console.error(e)
        toast.create(e.toString(), 'error')
        return
      }
    } else if (encoding === 'binary') {
      value = value.replace(/\s/g, '')
      if (/[^0-9a-f]/.test(value)) {
        toast.create('Binary must be encoded in hex. Non-hex values are present.', 'error')
        return
      }
    }
    try {
      await api.http('PUT', `/_api/bee/${joinPath(this.hyperKey, ...this.isEditingNew.path, path)}?encoding=${encoding}`, value, 'text/plain')
    } catch (e) {
      console.error(e)
      toast.create(e.toString(), 'error')
      return
    }
    this.initialRecordValue = value
    this.hasChanges = false
    toast.create('Record saved', 'success')
    emit(this, 'navigate-to', {detail: {url: QP.genFull({path: joinPath(...this.isEditingNew.path, path), new: false})}})
  }

  onClickRename () {
    this.doRenamePopup(this.record)
  }

  onClickRenameSelected () {
    const record = this.records.find(r => r.key === this.selectedRecordKeys[0])
    this.doRenamePopup(record)
  }

  onClickClone () {
    this.doClonePopup(this.record)
  }

  onClickCloneSelected () {
    const record = this.records.find(r => r.key === this.selectedRecordKeys[0])
    this.doClonePopup(record)
  }

  async onClickDelete () {
    await ConfirmPopup.create({message: 'Delete this record?'})
    try {
      await doDelete(this.hyperKey, this.record)
    } catch (e) {
      toast.create(e.toString(), 'error')
      console.error(e)
      return
    }
    toast.create('Record deleted')
    const url = QP.genFull({path: `/${this.currentDBPath.slice(0, -1).join('/')}`})
    emit(this, 'navigate-to', {detail: {url}})
  }

  async onClickDeleteSelected () {
    await ConfirmPopup.create({message: 'Delete the selected records?'})
    try {
      for (const key of this.selectedRecordKeys) {
        const record = this.records.find(r => r.key === key)
        if (record) await doDelete(this.hyperKey, record)
      }
    } catch (e) {
      toast.create(e.toString(), 'error')
      console.error(e)
      return
    }
    toast.create('Records deleted')
    this.load()
  }

  onClickExportSelected () {
    const records = this.records.filter(r => this.selectedRecordKeys.includes(r.key))
    doExport(this.hyperKey, records)
  }

  onClickExport () {
    doExport(this.hyperKey, [this.record])
  }
}

customElements.define('app-struct-bee', StructBee)

async function doRename (hyperKey, record, newpath) {
  toast.create('Renaming, please wait...')
  let n = 0
  if (record.isContainer) {
    const children = (await api.http('GET', `/_api/bee/${joinPath(hyperKey, record.path)}?list=1`)).records
    const oldpathParts = record.path.split('/').filter(Boolean)
    const newpathParts = newpath.split('/').filter(Boolean)
    for (const child of children) {
      const pathParts = child.path.split('/').filter(Boolean)
      const newchildpath = [...newpathParts, ...pathParts.slice(oldpathParts.length)].join('/')
      n++
      await api.http('PUT', `/_api/bee/${joinPath(hyperKey, newchildpath)}`, child.value, 'text/plain')
      await api.http('DELETE', `/_api/bee/${joinPath(hyperKey, child.path)}`)
    }
  } else {
    n++
    await api.http('PUT', `/_api/bee/${joinPath(hyperKey, newpath)}`, record.value, 'text/plain')
    await api.http('DELETE', `/_api/bee/${joinPath(hyperKey, record.path)}`)
  }
  toast.create(`Renamed ${n} ${pluralize(n, 'record')}`, 'success')
}

async function doClone (hyperKey, record, newpath) {
  toast.create('Cloning, please wait...')
  let n = 0
  if (record.isContainer) {
    const children = (await api.http('GET', `/_api/bee/${joinPath(hyperKey, record.path)}?list=1`)).records
    const oldpathParts = record.path.split('/').filter(Boolean)
    const newpathParts = newpath.split('/').filter(Boolean)
    for (const child of children) {
      const pathParts = child.path.split('/').filter(Boolean)
      const newchildpath = [...newpathParts, ...pathParts.slice(oldpathParts.length)].join('/')
      n++
      await api.http('PUT', `/_api/bee/${joinPath(hyperKey, newchildpath)}`, child.value, 'text/plain')
    }
  } else {
    n++
    await api.http('PUT', `/_api/bee/${joinPath(hyperKey, newpath)}`, record.value, 'text/plain')
  }
  toast.create(`Cloned ${n} ${pluralize(n, 'record')}`, 'success')
}

async function doDelete (hyperKey, record) {
  toast.create('Deleting, please wait...')
  let n = 0
  if (record.isContainer) {
    const records = (await api.http('GET', `/_api/bee/${joinPath(hyperKey, record.path)}?list=1`)).records
    for (const record of records) {
      n++
      await api.http('DELETE', `/_api/bee/${joinPath(hyperKey, record.path)}`)
    }
  } else {
    n++
    await api.http('DELETE', `/_api/bee/${joinPath(hyperKey, record.path)}`)
  }
  toast.create(`Deleted ${n} ${pluralize(n, 'record')}`, 'success')
}

async function doImport (hyperKey, path, file) {
  const fileStr = await readTextFile(file)
  const records = importFromJson(fileStr)
  for (const record of records) {
    await api.http('PUT', `/_api/bee/${joinPath(hyperKey, path, record.path)}`, JSON.stringify(record.value), 'text/plain')
  }
  return records.length
}

async function doExport (hyperKey, records) {
  let finalArr = []
  for (const record of records) {
    if (record.isContainer) {
      const children = (await api.http('GET', `/_api/bee/${joinPath(hyperKey, record.path)}?list=1`)).records
      finalArr = finalArr.concat(children)
    } else {
      finalArr.push(record)
    }
  }
  exportAsJson(finalArr)
}

function toShallow (currentPath, records) {
  const containers = new Set()
  const shallow = []
  for (const record of records) {
    const keyParts = record.key.split('/')
    if (keyParts.length === 1) {
      shallow.push(record)
    } else {
      containers.add(keyParts[0])
    }
  }
  return [
    ...Array.from(containers, key => ({
      key,
      path: `/${joinPath(...currentPath, key)}`,
      isContainer: true
    })),
    ...shallow
  ]
}