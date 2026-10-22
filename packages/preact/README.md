# @grand-fireworks/preact

Preact lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Preact is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/preact
```

This package is source in the repository and is not published to npm yet.

```jsx
import { GrandFireworks } from '@grand-fireworks/preact'

export function Show() {
  return <GrandFireworks autoStart options={{ baseStyle: 'cinematic' }} />
}
```

`ref.current.instance` is the engine. The component calls `destroy()` on unmount and `setOptions()` when `options` changes.
