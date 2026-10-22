# @grand-fireworks/vue

Vue 3 lifecycle wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). Vue is a peer dependency. The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/vue
```

This package is source in the repository and is not published to npm yet.

```vue
<script setup>
import { GrandFireworks } from '@grand-fireworks/vue'
</script>

<template>
  <GrandFireworks :auto-start="true" :options="{ baseStyle: 'cinematic' }" />
</template>
```

A template ref's `instance` is the engine. The component calls `destroy()` on unmount and `setOptions()` when `options` changes.

The engine is loaded inside `onMounted`, after `window` and `document` exist. Nuxt can render the component on the server.
