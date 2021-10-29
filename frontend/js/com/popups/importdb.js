/* globals beaker */
import { html } from '../../../vendor/lit/lit.min.js'
import { repeat } from '../../../vendor/lit/directives/repeat.js'
import { BasePopup } from './base.js'
import * as api from '../../lib/api.js'
import { emit, readTextFile } from '../../lib/dom.js'
import selectorSvg from '../../icons/selector.js'
import { toKeyStr } from '../../lib/strings.js'
import { importFromJson } from '../../lib/import-export.js'
import '../button.js'

// exported api
// =

export class ImportdbPopup extends BasePopup {
  static get properties () {
    return {
      sourceType: {type: String},
      currentError: {type: String},
      currentStatus: {type: String}
    }
  }

  constructor (opts) {
    super()
    this.currentError = undefined
    this.currentStatus = undefined
    this.sourceType = 'file'
  }

  get shouldShowHead () {
    return false
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  get maxWidth () {
    return '500px'
  }

  firstUpdated () {
    this.querySelector('input[name=alias]')?.focus()
  }

  // management
  //

  static async create (opts) {
    return BasePopup.create(ImportdbPopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('app-importdb-popup')
  }

  // rendering
  // =

  renderBody () {
    const sourceTypeNav = (id, label) => {
      let style = ''
      if (id === this.sourceType) {
        style = 'border-bottom-color: transparent;'
      } else {
        style = 'border-left-color: transparent; border-top-color: transparent; border-right-color: transparent;'
      }
      return html`
        <div class="border border-default rounded-t hover:bg-default-2 cursor-pointer pl-4 pr-5 py-2 font-medium" style=${style} @click=${e => {this.sourceType = id}}>${label}</div>
      `
    }
    return html`
      <form class="bg-default px-6 py-5" @submit=${this.onSubmit}>
        <div class="flex mb-4">
          ${sourceTypeNav('file', 'Import from File')}
          ${''/* TODO disabled for now sourceTypeNav('url', 'Import from URL')*/}
          <div class="flex-1 border-b border-default"></div>
        </div>
        <div>
          ${this.sourceType === 'file' ? html`
            <label class="block" for="alias">Source File</label>
            <input class="block border border-default mb-3 px-4 py-3 rounded w-full" type="file" name="file" required>
          ` : html`
            <label class="block" for="alias">Source URL</label>
            <input class="block border border-default mb-3 px-4 py-3 rounded w-full" type="text" name="url" placeholder="hyper://" required>
          `}
        </div>
        <div>
          <label class="block" for="alias">Database Name</label>
          <input class="block border border-default mb-3 px-4 py-3 rounded w-full" type="text" name="alias" value=${this.alias || ''} required>
        </div>
        <div>
          <label class="block" for="alias">Access</label>
          <div class="flex items-center border border-default mb-1 px-4 py-3 rounded">
            <select class="flex-1 appearance-none outline-none" name="access" @change=${this.onAccessChange}>
              <option value="public" ?selected=${this.access === 'public'}>Public</option>
              <option value="private" ?selected=${this.access === 'private'}>Private</option>
            </select>
            ${selectorSvg()}
          </div>
          <div class="text-default-3 text-sm mb-4">
            ${this.access === 'public' ? 'Other users can access the database over the network.' : ''}
            ${this.access === 'private' ? 'Only you can access the database.' : ''}
          </div>
        </div>
        ${this.currentError ? html`
          <div class="bg-error text-error px-4 py-3 mb-4">${this.currentError}</div>
        ` : ''}
        ${this.currentStatus ? html`
          <div class="bg-default-3 px-4 py-3 mb-4">${this.currentStatus}</div>
        ` : ''}
        <div class="flex justify-between mt-6">
          <app-button label="Cancel" @click=${this.onClickCancel}></app-button>
          <app-button primary btn-type="submit" label=${this.isNew ? 'Create' : 'Save'} ?disabled=${!!this.currentStatus} ?spinner=${!!this.currentStatus}></app-button>
        </div>
      </form>
    `
  }

  // events
  // =

  onClickCancel (e) {
    if (this.currentStatus) {
      window.location.reload() // reload the page to force an abort. It's lazy but it works
    } else {
      this.onReject()
    }
  }

  async onSubmit (e) {
    e.preventDefault()
    this.currentError = undefined
    const sourceUrl = e.currentTarget.url?.value
    const sourceFile = e.currentTarget.file?.files?.[0]
    const alias = e.currentTarget.alias.value.trim()
    const access = e.currentTarget.access.value
    
    if (!alias) {
      this.currentError = 'Please specify a name for your database'
      return this.requestUpdate()
    }
    if (alias !== this.alias && !(await isAliasAvailable(alias))) {
      this.currentError = `A database named ${alias} already exists`
      return this.requestUpdate()
    }

    let records
    if (this.sourceType === 'file') {
      this.currentStatus = 'Reading file...'
      const fileStr = await readTextFile(sourceFile)
      try {
        records = importFromJson(fileStr)
      } catch (e) {
        this.currentStatus = undefined
        this.currentError = e.toString()
        return
      }
    } else if (this.sourceType === 'url') {
      const key = toKeyStr(sourceUrl)
      if (!key) {
        this.currentStatus = undefined
        this.currentError = `Invalid URL. Must give a hypercore public key.`
        return
      }
      this.currentStatus = 'Reading target database, this may take a moment...'
      records = (await api.http('GET', `/_api/bee/${key}?list=1`)).records
    }

    this.currentStatus = 'Populating new database...'
    const dbInfo = await api.http('POST', '/_api/dbs', {
      type: 'bee',
      alias,
      access
    })
    for (const record of records) {
      await api.http('PUT', `/_api/bee/${dbInfo.key}${record.path}`, record.value)
    }
    emit(this, 'navigate-to', {detail: {url: `/p/db/${dbInfo.key}`}})
  }
}

customElements.define('app-importdb-popup', ImportdbPopup)

async function isAliasAvailable (alias) {
  const dbs = (await api.http('GET', '/_api/dbs')).dbs
  return !dbs.find(db => db.alias === alias)
}