import { Component, Input, ViewChild, } from '@angular/core';
import GrandFireworksEngine from 'grand-fireworks-js';
import * as i0 from "@angular/core";
function libraryOptions(options) {
    const next = { ...(options || {}) };
    delete next.container;
    delete next.autoStart;
    return next;
}
export class GrandFireworksComponent {
    options = {};
    autoStart = false;
    host;
    fireworks = null;
    ngAfterViewInit() {
        if (typeof window === 'undefined')
            return;
        this.fireworks = new GrandFireworksEngine({
            ...libraryOptions(this.options),
            container: this.host.nativeElement,
            autoStart: false,
        });
        if (this.autoStart)
            this.fireworks.start();
    }
    ngOnChanges(changes) {
        if (!this.fireworks || !changes['options'] || changes['options'].firstChange)
            return;
        this.fireworks.setOptions(libraryOptions(this.options));
    }
    ngOnDestroy() {
        if (this.fireworks)
            this.fireworks.destroy();
        this.fireworks = null;
    }
    get instance() {
        return this.fireworks;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.2.25", ngImport: i0, type: GrandFireworksComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "19.2.25", type: GrandFireworksComponent, isStandalone: true, selector: "grand-fireworks", inputs: { options: "options", autoStart: "autoStart" }, viewQueries: [{ propertyName: "host", first: true, predicate: ["host"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: '<div #host><ng-content></ng-content></div>', isInline: true });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.2.25", ngImport: i0, type: GrandFireworksComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'grand-fireworks',
                    standalone: true,
                    template: '<div #host><ng-content></ng-content></div>',
                }]
        }], propDecorators: { options: [{
                type: Input
            }], autoStart: [{
                type: Input
            }], host: [{
                type: ViewChild,
                args: ['host', { static: true }]
            }] } });
