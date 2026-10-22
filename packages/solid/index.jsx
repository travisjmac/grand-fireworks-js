import { createEffect, onCleanup, onMount } from 'solid-js'
import GrandFireworksEngine from 'grand-fireworks-js'

function libraryOptions(options) {
  const next = { ...(options || {}) }
  delete next.container
  delete next.autoStart
  return next
}

export default function GrandFireworks(props) {
  let container
  let fireworks = null

  onMount(() => {
    fireworks = new GrandFireworksEngine({
      ...libraryOptions(props.options),
      container,
      autoStart: false,
    })
    if (props.autoStart) fireworks.start()
    if (typeof props.ref === 'function') props.ref(fireworks)
  })

  createEffect(() => {
    const options = props.options
    if (!fireworks) return
    fireworks.setOptions(libraryOptions(options))
  })

  onCleanup(() => {
    if (typeof props.ref === 'function') props.ref(null)
    if (fireworks) fireworks.destroy()
    fireworks = null
  })

  return (
    <div ref={container} id={props.id} class={props.class} style={props.style}>
      {props.children}
    </div>
  )
}

export { GrandFireworks }
