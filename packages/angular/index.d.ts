import type { AfterViewInit, OnChanges, OnDestroy } from '@angular/core'
import type { GrandFireworks as Engine, GrandFireworksOptions } from 'grand-fireworks-js'

export declare class GrandFireworksComponent implements AfterViewInit, OnChanges, OnDestroy {
  options: GrandFireworksOptions
  /** Starts the show after the view is ready. The engine default is false. */
  autoStart: boolean
  readonly instance: Engine | null
  ngAfterViewInit(): void
  ngOnChanges(): void
  ngOnDestroy(): void
}
