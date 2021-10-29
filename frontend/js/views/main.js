import { LitElement, html } from '../../vendor/lit/lit.min.js'
import { repeat } from '../../vendor/lit/directives/repeat.js'
import * as api from '../lib/api.js'
import { emit } from '../lib/dom.js'
import { shortenHash } from '../lib/strings.js'
import { writeToClipboard } from '../lib/clipboard.js'
import { exportAsJson } from '../lib/import-export.js'
import { ConfirmPopup } from '../com/popups/confirm.js'
import { ConfigdbPopup } from '../com/popups/configdb.js'
import { ImportdbPopup } from '../com/popups/importdb.js'
import * as toast from '../com/toast.js'
import '../com/button.js'

class MainView extends LitElement {
  static get properties () {
    return {
      currentPath: {type: String, attribute: 'current-path'},
      dbs: {type: Object}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()
    this.bucketId = 'root'
  }

  async load () {
    document.title = `Coresplore`

    this.dbs = (await api.http('GET', '/_api/dbs')).dbs
    console.log(this.dbs)
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
        <div class="flex-1">
          <div class="flex items-center px-4 py-2 text-md bg-default border-b border-default-2">
            <div class="flex-1">
              <a class="font-bold hover:underline" href="/">Coresplore</a>
              <span class="text-sm">by <a class="hover:underline" href="https://atek.cloud" target="_blank">Atek Cloud</a></span>
            </div>
            <div class="w-64">
              <input type="text" placeholder="Enter a hypercore key" class="border border-default rounded-full w-full px-3 py-1 text-sm" @keyup=${this.onKeyupKeyInput}>
            </div>
          </div>
          <div class="mx-2 my-2 border border-default rounded bg-default">
            <div class="flex px-4 py-2 text-xs font-bold border-default-2">
              <div style="flex: 0 0 120px">ID</div>
              <div class="flex-1">Alias</div>
              <div style="flex: 0 0 140px">Writable</div>
              <div style="flex: 0 0 140px">Access</div>
              <div style="flex: 0 0 140px">Actions</div>
            </div>
            ${this.dbs && this.dbs.length === 0 ? html`
              <div class="border-t border-default-2 px-4 py-2">
                Click "New Database" or enter the key of a Hypercore in the top right to get started.
              </div>
            ` : ''}
            ${this.dbs ? html`
              ${repeat(this.dbs, db=>db.key, (db, i) => html`
                <a class="flex items-center px-4 py-2 hover:bg-default-2 text-sm border-t border-default-2" href=${`/p/db/${db.key}`}>
                  <div style="flex: 0 0 120px">${shortenHash(db.key)}</div>
                  <div class="flex-1">${db.alias}</div>
                  <div style="flex: 0 0 140px">${db.writable ? 'writable' : 'read-only'}</div>
                  <div style="flex: 0 0 140px">${db.access}</div>
                  <div style="flex: 0 0 140px">
                    <app-button transparent data-tooltip="Settings" icon="fas fa-cogs" @click=${e => this.onClickEditDatabaseSettings(e, db)}></app-button>
                    <app-button transparent data-tooltip="Copy key" icon="fas fa-link" @click=${e => this.onClickCopyDatabaseLink(e, db)}></app-button>
                    <app-button transparent data-tooltip="Export as File" icon="fas fa-file-download" @click=${e => this.onClickExportDatabase(e, db)}></app-button>
                    <app-button transparent data-tooltip="Delete" icon="far fa-trash-alt" @click=${e => this.onClickDeleteDatabase(e, db)}></app-button>
                  </div>
                </a>
              `)}
            ` : html`
              <div class="spinner"></div>
            `}
          </div>
        </div>
        <div class="px-4 py-3 border-default-2 border-l" style="flex: 0 0 250px">
          <app-button btn-class="block w-full py-1.5 px-3 mb-2 font-medium" color="green" label="New Database" @click=${this.onClickNewDatabase}></app-button>
          <app-button btn-class="block w-full py-1.5 px-3 mb-2" label="Import Database" @click=${this.onClickImportDatabase}></app-button>
        </div>
      </main>
    `
  }

  // events
  // =

  onKeyupKeyInput (e) {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      emit(this, 'navigate-to', {detail: {url: `/p/db/${e.currentTarget.value.trim().toLowerCase()}`}})
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

  async onClickEditDatabaseSettings (e, db) {
    e.preventDefault()
    e.stopPropagation()
    await ConfigdbPopup.create(db)
    this.load()
  }

  async onClickExportDatabase (e, db) {
    e.preventDefault()
    e.stopPropagation()
    const records = await api.http('GET', `/_api/bee/${db.key}?list=1`)
    exportAsJson(records)
  }

  onClickCopyDatabaseLink (e, db) {
    e.preventDefault()
    e.stopPropagation()
    writeToClipboard(db.key)
    toast.create('Key copied to clipboard')
  }

  async onClickDeleteDatabase (e, db) {
    e.preventDefault()
    e.stopPropagation()
    await ConfirmPopup.create({
      message: 'Are you sure you want to delete this database?',
      help: 'This will remove it from your Coresplore listing'
    })
    try {
      await api.http('DELETE', `/_api/dbs/${db.key}`)
    } catch (e) {
      toast.create(`Failed to delete: ${e.toString()}`, 'error')
      console.error(e)
      return
    }
    toast.create('Database deleted from Coresplore')
    this.load()
  }
}

customElements.define('app-main-view', MainView)

