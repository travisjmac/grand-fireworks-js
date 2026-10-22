import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'

export interface GrandFireworksElementOptions extends GrandFireworksOptions {
  /** Starts the show when the element connects. The engine default is false. */
  autoStart?: boolean
}

export declare class GrandFireworksElement extends HTMLElement {
  options: GrandFireworksElementOptions
  readonly fireworks: Engine | null
  setOptions(options: GrandFireworksOptions): void
}

export { GrandFireworksElement as GrandFireworks }
export default GrandFireworksElement
export type { GrandFireworksOptions }
