<script>
  import { onDestroy, onMount } from 'svelte'

  export let options = {}
  export let autoStart = false

  let container
  let fireworks = null
  let applied = options
  let disposed = false

  function libraryOptions(value) {
    const next = { ...(value || {}) }
    delete next.container
    delete next.autoStart
    return next
  }

  function browserDocument() {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }

  function engineFrom(mod) {
    const candidate = mod && mod.default ? mod.default : mod
    return typeof candidate === 'function' ? candidate : candidate.default
  }

  onMount(() => {
    if (!browserDocument() || !container) return
    import('grand-fireworks-js').then((mod) => {
      if (disposed || !container) return
      const Engine = engineFrom(mod)
      fireworks = new Engine({
        ...libraryOptions(options),
        container,
        autoStart: false,
      })
      applied = options
      if (autoStart) fireworks.start()
    })
  })

  $: if (fireworks && options !== applied) {
    applied = options
    fireworks.setOptions(libraryOptions(options))
  }

  onDestroy(() => {
    disposed = true
    if (fireworks) fireworks.destroy()
    fireworks = null
  })

  export function instance() {
    return fireworks
  }
</script>

<div bind:this={container}><slot /></div>
