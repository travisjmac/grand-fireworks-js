import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'

function libraryOptions(options) {
  const next = { ...(options || {}) }
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

export const GrandFireworks = defineComponent({
  name: 'GrandFireworks',
  props: {
    options: { type: Object, default: () => ({}) },
    autoStart: { type: Boolean, default: false },
  },
  setup(props, { expose, slots }) {
    const container = ref(null)
    const fireworks = ref(null)
    const optionsRef = ref(props.options)
    let disposed = false

    expose({
      get instance() {
        return fireworks.value
      },
    })

    watch(
      () => props.options,
      (options) => {
        optionsRef.value = options
        if (fireworks.value) fireworks.value.setOptions(libraryOptions(options))
      },
    )

    onMounted(() => {
      if (!browserDocument() || !container.value) return
      import('grand-fireworks-js').then((mod) => {
        if (disposed || !container.value) return
        const Engine = engineFrom(mod)
        const instance = new Engine({
          ...libraryOptions(optionsRef.value),
          container: container.value,
          autoStart: false,
        })
        fireworks.value = instance
        if (props.autoStart) instance.start()
      })
    })

    onBeforeUnmount(() => {
      disposed = true
      if (fireworks.value) fireworks.value.destroy()
      fireworks.value = null
    })

    return () => h('div', { ref: container }, slots.default ? slots.default() : [])
  },
})

export default GrandFireworks
