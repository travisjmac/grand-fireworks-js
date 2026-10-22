import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core'
import GrandFireworksEngine from 'grand-fireworks-js'
import type { GrandFireworksOptions } from 'grand-fireworks-js'

function libraryOptions(options: GrandFireworksOptions | undefined) {
  const next: GrandFireworksOptions = { ...(options || {}) }
  delete next.container
  delete next.autoStart
  return next
}

@Component({
  selector: 'grand-fireworks',
  standalone: true,
  template: '<div #host><ng-content></ng-content></div>',
})
export class GrandFireworksComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() options: GrandFireworksOptions = {}
  @Input() autoStart = false
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>

  private fireworks: InstanceType<typeof GrandFireworksEngine> | null = null

  ngAfterViewInit() {
    if (typeof window === 'undefined') return
    this.fireworks = new GrandFireworksEngine({
      ...libraryOptions(this.options),
      container: this.host.nativeElement,
      autoStart: false,
    })
    if (this.autoStart) this.fireworks.start()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.fireworks || !changes['options'] || changes['options'].firstChange) return
    this.fireworks.setOptions(libraryOptions(this.options))
  }

  ngOnDestroy() {
    if (this.fireworks) this.fireworks.destroy()
    this.fireworks = null
  }

  get instance() {
    return this.fireworks
  }
}
