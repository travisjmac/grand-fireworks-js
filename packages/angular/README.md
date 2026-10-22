# @grand-fireworks/angular

Angular lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Angular is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/angular
```

This package is source in the repository and is not published to npm yet.

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
