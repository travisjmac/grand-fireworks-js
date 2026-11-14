# @grand-fireworks/solid

Solid lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Solid is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/solid
```

Source and TypeScript declarations are maintained in this repository.

```jsx
import { GrandFireworks } from '@grand-fireworks/solid'

export function Show() {
  return <GrandFireworks autoStart options={{ baseStyle: 'cinematic' }} />
}
```

Pass `ref` to receive the engine. The component calls `destroy()` on cleanup and `setOptions()` when `options` changes.

The package includes compiled browser and server builds. Browser bundlers resolve dist/client.js and Node resolves dist/server.js; Solid-aware tooling can use the solid export condition for the original JSX. Maintainers can rebuild both outputs with npm run build:solid from the repository root.
