/* globals beaker */
import { html } from '../../../vendor/lit/lit.min.js'
import { BasePopup } from './base.js'
import '../button.js'

// exported api
// =

export class PromptPopup extends BasePopup {
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

  firstUpdated () {
    this.querySelector('input')?.focus()
  }

  // management
  //

  static async create (opts) {
    return BasePopup.create(PromptPopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('app-prompt-popup')
  }

  // rendering
  // =

  renderBody () {
    return html`
      <div class="bg-default px-5 py-4">
        <h2 class="font-medium mb-2 text-lg">${this.message || 'Please enter your answer:'}</h2>
        ${this.help ? html`
          <div class="mb-4 text-default-3 text-sm">${this.help}</div>
        ` : ''}
        <form @submit=${this.onSubmit}>
          <input type="text" class="w-full border rounded px-4 py-2 mb-4" name="uservalue">
          <div class="flex justify-between items-center">
            <app-button @click=${this.onReject} label="Cancel"></app-button>
            <app-button btn-type="submit" primary label="Okay"></app-button>
          </div>
        </form>
      </div>
    `
  }

  onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('resolve', {detail: e.currentTarget.uservalue.value}))
  }
}

customElements.define('app-prompt-popup', PromptPopup)