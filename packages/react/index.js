'use client'

import React, { useEffect, useImperativeHandle, useRef } from 'react'

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

const GrandFireworksView = React.forwardRef(function GrandFireworksView(props, ref) {
  const { options, autoStart = false, children, ...rest } = props
  const container = useRef(null)
  const fireworks = useRef(null)
  const optionsRef = useRef(options)
  const autoStartRef = useRef(autoStart)
  const skipOptions = useRef(true)
  optionsRef.current = options
  autoStartRef.current = autoStart

  useImperativeHandle(ref, () => ({
    get instance() {
      return fireworks.current
    },
  }))

  useEffect(() => {
    if (!browserDocument() || !container.current) return undefined
    let disposed = false
    let instance = null
    import('grand-fireworks-js').then((mod) => {
      if (disposed || !container.current) return
      const Engine = engineFrom(mod)
      instance = new Engine({
        ...libraryOptions(optionsRef.current),
        container: container.current,
        autoStart: false,
      })
      fireworks.current = instance
      if (autoStartRef.current) instance.start()
    })
    return () => {
      disposed = true
      if (instance) instance.destroy()
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
