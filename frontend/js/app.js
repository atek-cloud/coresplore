import { LitElement, html } from '../vendor/lit/lit.min.js'
import { emit } from './lib/dom.js'
import * as theme from './lib/theme.js'
import * as contextMenu from './com/context-menu.js'
import { BasePopup } from './com/popups/base.js'
import './views/db.js'
import './views/main.js'

class AppRoot extends LitElement {
  static get properties () {
    return {
      currentPath: {type: String},
      currentQP: {type: Object},
      isLoading: {type: Boolean}
    }
  }

  createRenderRoot() {
    return this // dont use shadow dom
  }

  constructor () {
    super()

    document.body.classList.add(`theme-${theme.get()}`)

    this.isLoading = true
    this.pageHasChanges = false
    this.currentPath = window.location.pathname
    this.currentQP = (new URLSearchParams(window.location.search))
    
    document.body.addEventListener('click', this.onGlobalClick.bind(this))
    document.body.addEventListener('navigate-to', this.onNavigateTo.bind(this))
    window.addEventListener('popstate', this.onHistoryPopstate.bind(this))
    window.addEventListener('beforeunload', this.onBeforeUnload.bind(this))

    this.load()
  }

  async load () {
    this.isLoading = false
    await this.updateComplete
    this.querySelector('#view')?.load?.()
  }

  async updated (changedProperties) {
    if (changedProperties.has('currentPath') || changedProperties.has('currentQP')) {
      await this.updateComplete
      this.querySelector('#view')?.load?.()
    }
  }

  navigateTo (pathname, replace = false) {
    if (this.pageHasChanges) {
      if (!confirm('Lose unsaved changes?')) {
        return
      }
    }
    this.pageHasChanges = false

    if (pathname.startsWith('http:') || pathname.startsWith('https:')) {
      window.location = pathname
      return
    }

    contextMenu.destroy()
    BasePopup.destroy()

    if (replace) {
      window.history.replaceState({}, null, pathname)
    } else {
      window.history.replaceState({scrollY: window.scrollY}, null)
      window.history.pushState({}, null, pathname)
    }
    this.currentPath = pathname.split('?')[0]
    this.currentQP = (new URLSearchParams(pathname.split('?')[1] || ''))
    this.requestUpdate()
  }

  reloadView () {
    try {
      let view = this.querySelector('#view')
      view.load()
    } catch (e) {
      console.log('Failed to reload view', e)
    }
  }

  // rendering
  // =

  render () {
    if (this.isLoading) {
      return html`
        <div class="max-w-4xl mx-auto">
          <div class="py-32 text-center text-gray-400">
            <span class="spinner h-7 w-7"></span>
          </div>
        </div>
      `
    }

    switch (this.currentPath) {
      case '/':
        return html`<app-main-view id="view" current-path=${this.currentPath} current-qp=${this.currentQP}></app-main-view>`
      case '/db':
        return html`<app-db-view id="view" current-path=${this.currentPath} current-qp=${this.currentQP}></app-db-view>`
    }
    return html`
      <div class="bg-gray-100 min-h-screen wide">
        <div class="text-center py-48">
          <h2 class="text-5xl text-gray-600 font-semibold mb-4">404 Not Found</h2>
          <div class="text-lg text-gray-600 mb-4">No page exists at this URL.</div>
          <div class="text-lg text-gray-600">
            <a class="text-blue-600 hov:hover:underline" href="/" title="Back to home">
              <span class="fas fa-angle-left fa-fw"></span> Home</div>
            </a>
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  onGlobalClick (e) {
    if (e.defaultPrevented) {
      return
    }

    let anchor
    for (let el of e.composedPath()) {
      if (el.tagName === 'A') {
        anchor = el
      }
    }
    if (!anchor || anchor.download) return

    const href = anchor.getAttribute('href')
    if (href === null) return
    
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) {
      e.preventDefault()
      this.navigateTo(url.pathname + url.search)
    }
  }

  onNavigateTo (e) {
    this.navigateTo(e.detail.url, e.detail.replace)
  }

  onHistoryPopstate (e) {
    emit(document, 'close-all-popups')
    this.currentPath = window.location.pathname
  }

  onBeforeUnload (e) {
    if (this.pageHasChanges) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
}

customElements.define('app-root', AppRoot)