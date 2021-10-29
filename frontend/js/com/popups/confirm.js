/* globals beaker */
import { html } from '../../../vendor/lit/lit.min.js'
import { BasePopup } from './base.js'
import '../button.js'

// exported api
// =

export class ConfirmPopup extends BasePopup {
  static get properties () {
    return {
    }
  }

  constructor (opts) {
    super()
    this.message = opts?.message
    this.help = opts?.help
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

  // management
  //

  static async create (opts) {
    return BasePopup.create(ConfirmPopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('app-confirm-popup')
  }

  // rendering
  // =

  renderBody () {
    return html`
      <div class="bg-default px-5 py-4">
        <h2 class="font-medium mb-2 text-lg">${this.message || 'Are you sure?'}</h2>
        ${this.help ? html`
          <div class="mb-4 text-default-3 text-sm">${this.help}</div>
        ` : ''}
        <div class="flex justify-between items-center">
          <app-button @click=${this.onReject} label="Cancel"></app-button>
          <app-button primary @click=${this.onResolve} label="Okay"></app-button>
        </div>
      </div>
    `
  }
}

customElements.define('app-confirm-popup', ConfirmPopup)