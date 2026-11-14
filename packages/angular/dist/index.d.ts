import { AfterViewInit, ElementRef, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import GrandFireworksEngine from 'grand-fireworks-js';
import type { GrandFireworksOptions } from 'grand-fireworks-js';
import * as i0 from "@angular/core";
export declare class GrandFireworksComponent implements AfterViewInit, OnChanges, OnDestroy {
    options: GrandFireworksOptions;
    autoStart: boolean;
    host: ElementRef<HTMLElement>;
    private fireworks;
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngOnDestroy(): void;
    get instance(): GrandFireworksEngine | null;
    static ɵfac: i0.ɵɵFactoryDeclaration<GrandFireworksComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GrandFireworksComponent, "grand-fireworks", never, { "options": { "alias": "options"; "required": false; }; "autoStart": { "alias": "autoStart"; "required": false; }; }, {}, never, ["*"], true, never>;
}
