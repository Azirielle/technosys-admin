// useFitRows: how many table rows fit on the screen, so tables page instead of scrolling (Andrew, 28 Nov).
'use client'

import { useEffect, useRef, useState } from 'react'

const PAGER = 57 // the page buttons' height, kept free even when one page is enough

/** How many table rows fit in a TableContainer on this screen (laptops), so pages replace scrolling. Use it as the
 *  page size: `const [tableRef, perPage] = useFitRows()`, then `<TableContainer ref={tableRef}>`. */
export function useFitRows(fallback = 8) {
  const ref = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState(fallback)
  useEffect(() => {
    const box = ref.current
    if (!box) return
    let size = 0 // the box height the page size was worked out for
    const measure = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) return setRows(fallback) // phones: the page scrolls
      const heights = [...box.querySelectorAll<HTMLElement>('tbody tr')].map((r) => r.offsetHeight).filter(Boolean)
      if (!heights.length) return // still loading: measured again when the rows come
      const head = box.querySelector<HTMLElement>('thead')?.offsetHeight ?? 0
      const free = box.clientHeight - head - PAGER
      // Count the rows shown now (one with wrapped text is taller), then fill what is left with typical rows
      let used = 0, fit = 0
      for (const h of heights) { if (used + h > free) break; used += h; fit++ }
      if (fit === heights.length) fit += Math.floor((free - used) / [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)])
      // Same window size: the page size only gets smaller, so moving to another page never skips anyone
      const sameSize = size === box.clientHeight
      size = box.clientHeight
      setRows((now) => (sameSize ? Math.min(now, Math.max(3, fit)) : Math.max(3, fit)))
    }
    const resized = new ResizeObserver(measure)
    resized.observe(box)
    const changed = new MutationObserver(measure) // rows arriving after loading
    changed.observe(box, { childList: true, subtree: true })
    measure()
    return () => { resized.disconnect(); changed.disconnect() }
  }, [fallback])
  return [ref, rows] as const
}
