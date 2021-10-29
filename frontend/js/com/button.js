import { LitElement, html } from '../../vendor/lit/lit.min.js'
import { ifDefined } from '../../vendor/lit/directives/if-defined.js'

export class Button extends LitElement {
  static get properties () {
    return {
      label: {type: String},
      icon: {type: String},
      iconSize: {type: Number, attribute: 'icon-size'},
      href: {type: String},
      newWindow: {type: Boolean, attribute: 'new-window'},
      btnClass: {type: String, attribute: 'btn-class'},
      btnStyle: {type: String, attribute: 'btn-style'},
      disabled: {type: Boolean},
      download: {type: String},
      isDropdown: {type: Boolean, attribute: 'is-dropdown'},
      spinner: {type: Boolean},
      groupPos: {type: String, attribute: 'group-pos'}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()
    this.btnClass = ''
    this.btnStyle = undefined
    this.isDropdown = false
    this.groupPos = undefined
  }

  getClass () {
    let parentClass = this.btnClass || this.className || ''
    let colors = 'bg-default hover:bg-default-2'
    if (this.hasAttribute('primary')) {
      colors = 'bg-primary text-white hover:bg-primary-2'
      if (this.disabled) {
        colors = 'bg-primary-2 text-inverse-3'
      }
    } else if (this.hasAttribute('transparent')) {
      colors = 'hover:bg-default-2'
      if (this.disabled) {
        colors = 'text-default-3'
      }
    } else if (this.disabled) {
      colors = 'bg-default-2 text-default-3'
    } else if (this.hasAttribute('color')) {
      colors = `bg-${this.getAttribute('color')}-600 hover:bg-${this.getAttribute('color')}-500 text-white`
    }
    
    let paddings = ''
    if (!/p(x|l|r)?-/.test(parentClass)) paddings += 'px-2 '
    if (!/p(y|t|b)?-/.test(parentClass)) paddings += 'py-1'

    let rounding = 'rounded'
    let borderpos = 'border'
    if (this.groupPos === 'start') { rounding = 'rounded-l'; borderpos += ' border-r-0' }
    if (this.groupPos === 'end') rounding = 'rounded-r'
    if (this.groupPos === 'mid') { rounding = ''; borderpos += ' border-r-0' }

    let shadow = 'shadow-sm'
    let borders = `${borderpos} border-gray-300`
    if (/border/.test(parentClass)) borders = ''
    else if (this.hasAttribute('primary')) borders = `${borderpos} border-blue-800`
    else if (this.hasAttribute('transparent')) { borders = ''; shadow = '' }
    else if (this.hasAttribute('color')) borders = `${borderpos} border-${this.getAttribute('color')}-800`
    return `${rounding} ${colors} ${paddings} ${borders} ${shadow} ${parentClass} ${this.disabled ? 'cursor-default' : ''}`
  }

  renderSpinner () {
    let colors = 'text-default-3'
    if (this.hasAttribute('primary')) {
      colors = 'text-primary-1'
    }
    return html`<span class="spinner ${colors}"></span>`
  }

  renderLabel () {
    return html`${this.renderIcon()}${this.label}${this.renderDropdownCaret()}`
  }

  renderIcon () {
    if (!this.icon) return ''
    return html`<span class=${this.icon}></span> `
  }

  renderDropdownCaret () {
    if (!this.isDropdown) return ''
    return html`<span class="fas fa-fw fa-caret-down"></span> `
  }

  render () {
    if (this.href) {
      return html`
        <a
          href=${this.href}
          target=${this.newWindow ? '_blank' : ''}
          class="inline-block ${this.getClass()}"
          ?disabled=${this.disabled}
          download=${ifDefined(this.download)}
          style=${ifDefined(this.btnStyle)}
        >${this.spinner ? this.renderSpinner() : this.renderLabel()}</a>
      `
    }
    return html`
      <button
        type=${this.getAttribute('btn-type') || 'button'}
        tabindex=${this.getAttribute('tabindex')}
        class=${this.getClass()}
        ?disabled=${this.disabled}
        style=${ifDefined(this.btnStyle)}
      >${this.spinner ? this.renderSpinner() : this.renderLabel()}</button>
    `
  }
}

customElements.define('app-button', Button)

export class ButtonGroup extends LitElement {
  render () {
    return html`
      <slot @slotchange=${this.onSlotChange}></slot>
    `
  }

  onSlotChange (e) {
    const childNodes = Array.from(e.target.assignedNodes({flatten: true})).filter(el => el.tagName === 'APP-BUTTON')
    if (childNodes.length === 1) {
      childNodes[0].groupPos = undefined
      return
    }
    for (let i = 0; i < childNodes.length; i++) {
      if (i === 0) childNodes[i].groupPos = 'start'
      else if (i === childNodes.length - 1) childNodes[i].groupPos = 'end'
      else childNodes[i].groupPos = 'mid'
    }
  }
}

customElements.define('app-button-group', ButtonGroup)
