import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'
import type { ForwardRefExoticComponent, HTMLAttributes, ReactNode, RefAttributes } from 'react'

export interface GrandFireworksProps extends HTMLAttributes<HTMLDivElement> {
  options?: GrandFireworksOptions
  /** Starts the show after mount. The engine default is false. */
  autoStart?: boolean
  children?: ReactNode
}

export interface GrandFireworksHandle {
  readonly instance: Engine | null
}

export const GrandFireworks: ForwardRefExoticComponent<
  GrandFireworksProps & RefAttributes<GrandFireworksHandle>
>
export default GrandFireworks
export type { GrandFireworksOptions }
