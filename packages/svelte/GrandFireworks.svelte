<script>
  import { onDestroy, onMount } from 'svelte'
  import GrandFireworksEngine from 'grand-fireworks-js'

  export let options = {}
  export let autoStart = false

  let container
  let fireworks = null
  let applied = options

  function libraryOptions(value) {
    const next = { ...(value || {}) }
    delete next.container
    delete next.autoStart
    return next
  }

  onMount(() => {
    fireworks = new GrandFireworksEngine({
      ...libraryOptions(options),
      container,
      autoStart: false,
    })
    if (autoStart) fireworks.start()
  })

  $: if (fireworks && options !== applied) {
    applied = options
    fireworks.setOptions(libraryOptions(options))
  }

  onDestroy(() => {
    if (fireworks) fireworks.destroy()
    fireworks = null
  })

  export function instance() {
    return fireworks
  }
</script>

<div bind:this={container}><slot /></div>
