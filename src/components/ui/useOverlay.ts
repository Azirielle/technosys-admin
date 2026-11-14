// useOverlay: shared behaviour for Modal and Drawer (close on Escape, stop the page scrolling behind).
'use client'
import { useEffect, useState } from 'react'

/** Returns true once the page is in the browser, so overlays can be put in document.body. */
export function useOverlay(isOpen: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  return mounted
}
