# @grand-fireworks/web

Custom element wrapper for [`grand-fireworks-js`](https://github.com/travisjmac/grand-fireworks-js). The engine stays in the core package.

```sh
npm install grand-fireworks-js @grand-fireworks/web
```

This package is source in the repository and is not published to npm yet.

```html
<script type="module">
  import '@grand-fireworks/web'
  const show = document.querySelector('grand-fireworks')
  show.options = { baseStyle: 'cinematic', autoStart: true }
</script>

<grand-fireworks auto-start></grand-fireworks>
```

`element.fireworks` is the engine. Removing the element calls `destroy()`. `setOptions()` updates a connected element.
