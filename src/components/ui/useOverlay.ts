// useOverlay: shared behaviour for Modal and Drawer (close on Escape, stop the page scrolling behind).
'use client'
import { useEffect, useRef, useState } from 'react'

// Open overlays, newest last: Escape closes only the top one (a map window over the job form, not both)
const openOverlays: object[] = []

/** Returns true once the page is in the browser, so overlays can be put in document.body. */
export function useOverlay(isOpen: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(false)
  const close = useRef(onClose)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    close.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const me = {}
    openOverlays.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openOverlays[openOverlays.length - 1] === me) close.current()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openOverlays.splice(openOverlays.indexOf(me), 1)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  return mounted
}
