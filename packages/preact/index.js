import { h } from 'preact'
import { forwardRef } from 'preact/compat'
import { useEffect, useImperativeHandle, useRef } from 'preact/hooks'
import GrandFireworksEngine from 'grand-fireworks-js'

function libraryOptions(options) {
  const next = { ...(options || {}) }
  delete next.container
  delete next.autoStart
  return next
}

const GrandFireworksView = forwardRef(function GrandFireworksView(props, ref) {
  const { options, autoStart = false, children, ...rest } = props
  const container = useRef(null)
  const fireworks = useRef(null)
  const skipOptions = useRef(true)

  useImperativeHandle(ref, () => ({
    get instance() {
      return fireworks.current
    },
  }))

  useEffect(() => {
    const instance = new GrandFireworksEngine({
      ...libraryOptions(options),
      container: container.current,
      autoStart: false,
    })
    fireworks.current = instance
    if (autoStart) instance.start()
    return () => {
      instance.destroy()
      fireworks.current = null
    }
  }, [])

  useEffect(() => {
    if (skipOptions.current) {
      skipOptions.current = false
      return
    }
    if (fireworks.current) fireworks.current.setOptions(libraryOptions(options))
  }, [options])

  return h('div', { ...rest, ref: container }, children)
})

export { GrandFireworksView as GrandFireworks }
export default GrandFireworksView
