import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'
import type { Component } from 'vue'

export interface GrandFireworksProps {
  options?: GrandFireworksOptions
  /** Starts the show after mount. The engine default is false. */
  autoStart?: boolean
}

export interface GrandFireworksExpose {
  readonly instance: Engine | null
}

export const GrandFireworks: Component<GrandFireworksProps>
export default GrandFireworks
export type { GrandFireworksOptions, GrandFireworksExpose }
