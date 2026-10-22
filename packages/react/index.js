import React, { useEffect, useImperativeHandle, useRef } from 'react'
import GrandFireworksEngine from 'grand-fireworks-js'

function libraryOptions(options) {
  const next = { ...(options || {}) }
  delete next.container
  delete next.autoStart
  return next
}

const GrandFireworksView = React.forwardRef(function GrandFireworksView(props, ref) {
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

  return React.createElement('div', { ...rest, ref: container }, children)
})

export { GrandFireworksView as GrandFireworks }
export default GrandFireworksView
