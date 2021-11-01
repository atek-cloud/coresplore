/* globals beaker */
import { html } from '../../../vendor/lit/lit.min.js'
import { BasePopup } from './base.js'
import * as api from '../../lib/api.js'
import * as QP from '../../lib/qp.js'
import { emit } from '../../lib/dom.js'
import selectorSvg from '../../icons/selector.js'
import '../button.js'

// exported api
// =

export class ConfigdbPopup extends BasePopup {
  static get properties () {
    return {
      currentError: {type: String},
      type: {type: String},
      access: {type: String}
    }
  }

  constructor (opts) {
    super()
    this.currentError = undefined
    this.isNew = !opts?.key
    this.type = 'bee'
    this.key = opts?.key
    this.alias = opts?.alias
    this.access = opts?.access || 'public'
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
    return BasePopup.create(ConfigdbPopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('app-configdb-popup')
  }

  // rendering
  // =

  renderBody () {
    return html`
      <form class="bg-default px-6 py-5" @submit=${this.onSubmit}>
        <h2 class="text-2xl mb-2 font-medium">${this.isNew ? 'New' : 'Edit'} Database</h2>
        ${this.isNew ? html`
          <div>
            <label class="block" for="alias">Type</label>
            <div class="flex items-center border border-default mb-1 px-4 py-3 rounded">
              <select class="flex-1 appearance-none outline-none" name="type" @change=${this.onTypeChange}>
                <option value="bee" ?selected=${this.access === 'bee'}>Hyperbee</option>
                <option value="core" ?selected=${this.access === 'core'}>Hypercore</option>
              </select>
              ${selectorSvg()}
            </div>
            <div class="text-default-3 text-sm mb-4">
              ${this.type === 'bee' ? 'A key/value database.' : ''}
              ${this.type === 'core' ? 'An append-only log.' : ''}
            </div>
          </div>
        ` : ''}
        <div>
          <label class="block" for="alias">Database Name</label>
          <input class="block border border-default mb-3 px-4 py-3 rounded w-full" type="text" name="alias" value=${this.alias || ''} required autocomplete="off">
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
        <div class="flex justify-between mt-6">
          <app-button label="Cancel" @click=${this.onReject}></app-button>
          <app-button primary btn-type="submit" label=${this.isNew ? 'Create' : 'Save'}></app-button>
        </div>
      </form>
    `
  }

  // events
  // =

  onAccessChange (e) {
    this.access = e.currentTarget.value
  }

  onTypeChange (e) {
    this.type = e.currentTarget.value
  }

  async onSubmit (e) {
    e.preventDefault()
    this.currentError = undefined
    const type = e.currentTarget.type.value
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
    if (this.isNew) {
      const dbInfo = await api.http('POST', '/_api/dbs', {
        type,
        alias,
        access
      })
      emit(this, 'navigate-to', {detail: {url: `/db${QP.gen({key: dbInfo.key})}`}})
    } else {
      await api.http('PATCH', `/_api/dbs/${this.key}`, {alias, access})
    }
    this.onResolve()
  }
}

customElements.define('app-configdb-popup', ConfigdbPopup)

async function isAliasAvailable (alias) {
  const dbs = (await api.http('GET', '/_api/dbs')).dbs
  return !dbs.find(db => db.alias === alias)
}