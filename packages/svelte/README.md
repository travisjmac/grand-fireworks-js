# @grand-fireworks/svelte

Svelte lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Svelte is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/svelte
```

This package is source in the repository and is not published to npm yet.

```svelte
<script>
  import GrandFireworks from '@grand-fireworks/svelte'
</script>

<GrandFireworks autoStart options={{ baseStyle: 'cinematic' }} />
```

Bind the component and call `instance()` for the engine. The component calls `destroy()` on destroy and `setOptions()` when `options` changes.
