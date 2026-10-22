import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'
import type { JSX } from 'solid-js'

export interface GrandFireworksProps extends JSX.HTMLAttributes<HTMLDivElement> {
  options?: GrandFireworksOptions
  /** Starts the show after mount. The engine default is false. */
  autoStart?: boolean
  ref?: (instance: Engine | null) => void
}

export function GrandFireworks(props: GrandFireworksProps): JSX.Element
export default GrandFireworks
export type { GrandFireworksOptions }
