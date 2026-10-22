import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'
import type { JSX } from 'preact'
import type { ForwardedRef, ReactNode } from 'preact/compat'

export interface GrandFireworksProps extends JSX.HTMLAttributes<HTMLDivElement> {
  options?: GrandFireworksOptions
  /** Starts the show after mount. The engine default is false. */
  autoStart?: boolean
  children?: ReactNode
  ref?: ForwardedRef<GrandFireworksHandle>
}

export interface GrandFireworksHandle {
  readonly instance: Engine | null
}

export const GrandFireworks: (props: GrandFireworksProps) => JSX.Element
export default GrandFireworks
export type { GrandFireworksOptions }
