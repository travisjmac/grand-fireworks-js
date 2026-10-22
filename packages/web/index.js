import GrandFireworksEngine from 'grand-fireworks-js'

function libraryOptions(options) {
  const next = { ...(options || {}) }
  delete next.container
  delete next.autoStart
  return next
}

class GrandFireworksElement extends HTMLElement {
  constructor() {
    super()
    this._options = {}
    this.fireworks = null
  }

  get options() {
    return this._options
  }

  set options(value) {
    this._options = value || {}
    if (this.fireworks) this.fireworks.setOptions(libraryOptions(this._options))
  }

  connectedCallback() {
    if (this.fireworks) return
    const instance = new GrandFireworksEngine({
      ...libraryOptions(this._options),
      container: this,
      autoStart: false,
    })
    this.fireworks = instance
    if (this._options.autoStart || this.hasAttribute('auto-start')) instance.start()
  }

  disconnectedCallback() {
    if (this.fireworks) this.fireworks.destroy()
    this.fireworks = null
  }

  setOptions(options) {
    this.options = { ...this._options, ...libraryOptions(options) }
  }
}

const tag = 'grand-fireworks'
if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
  customElements.define(tag, GrandFireworksElement)
}

export { GrandFireworksElement, GrandFireworksElement as GrandFireworks }
export default GrandFireworksElement
