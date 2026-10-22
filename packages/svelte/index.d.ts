import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'

export interface GrandFireworksProps {
  options?: GrandFireworksOptions
  /** Starts the show after mount. The engine default is false. */
  autoStart?: boolean
}

declare const GrandFireworks: {
  new (options: { target: Element; props?: GrandFireworksProps }): {
    $set(props: Partial<GrandFireworksProps>): void
    $destroy(): void
    instance(): Engine | undefined
  }
}

export default GrandFireworks
export type { GrandFireworksOptions }
