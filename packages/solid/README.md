# @grand-fireworks/solid

Solid lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Solid is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/solid
```

This package is source in the repository and is not published to npm yet.

```jsx
import { GrandFireworks } from '@grand-fireworks/solid'

export function Show() {
  return <GrandFireworks autoStart options={{ baseStyle: 'cinematic' }} />
}
```

Pass `ref` to receive the engine. The component calls `destroy()` on cleanup and `setOptions()` when `options` changes.
