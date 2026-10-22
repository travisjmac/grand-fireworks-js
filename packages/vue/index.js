import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import GrandFireworksEngine from 'grand-fireworks-js'

function libraryOptions(options) {
  const next = { ...(options || {}) }
  delete next.container
  delete next.autoStart
  return next
}

export const GrandFireworks = defineComponent({
  name: 'GrandFireworks',
  props: {
    options: { type: Object, default: () => ({}) },
    autoStart: { type: Boolean, default: false },
  },
  setup(props, { expose, slots }) {
    const container = ref(null)
    const fireworks = ref(null)

    expose({
      get instance() {
        return fireworks.value
      },
    })

    onMounted(() => {
      const instance = new GrandFireworksEngine({
        ...libraryOptions(props.options),
        container: container.value,
        autoStart: false,
      })
      fireworks.value = instance
      if (props.autoStart) instance.start()
    })

    watch(
      () => props.options,
      (options) => {
        if (fireworks.value) fireworks.value.setOptions(libraryOptions(options))
      },
    )

    onBeforeUnmount(() => {
      if (fireworks.value) fireworks.value.destroy()
      fireworks.value = null
    })

    return () => h('div', { ref: container }, slots.default ? slots.default() : [])
  },
})

export default GrandFireworks
