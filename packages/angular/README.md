# @grand-fireworks/angular

Angular lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Angular is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/angular
```

Source and TypeScript declarations are maintained in this repository.

```ts
import { GrandFireworksComponent } from '@grand-fireworks/angular'

@Component({
  selector: 'app-show',
  standalone: true,
  imports: [GrandFireworksComponent],
  template: '<grand-fireworks [autoStart]="true" [options]="{ baseStyle: \'cinematic\' }" />',
})
export class ShowComponent {}
```

`instance` is the engine. The component calls `destroy()` on destroy and `setOptions()` when `options` changes.

## Building the package

Run npm run build:angular from the repository root before packing or publishing this adapter. The isolated build compiles index.ts to partial Angular JavaScript and generated Angular declarations in dist/. Consumers install the compiled package; they do not compile the adapter TypeScript source themselves.
