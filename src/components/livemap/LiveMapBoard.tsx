// LiveMapBoard: the Coordinator's Live map page — the map fills the page, the crew list floats on top.
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { CrewPanel } from './CrewPanel'
import { useCrewLocations } from './useCrewLocations'

// Leaflet needs the browser's window, so the map loads only in the browser.
const CrewMap = dynamic(() => import('./CrewMap'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-small text-ink-3">Loading map…</div>,
})

export function LiveMapBoard() {
  const { crew, loading, reload } = useCrewLocations()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="h-full px-page py-page-y">
      <div className="relative h-full overflow-hidden rounded-card bg-surface-soft shadow-card">
        <CrewMap crew={crew} selectedId={selectedId} />
        <CrewPanel crew={crew} loading={loading} selectedId={selectedId} onSelect={setSelectedId} onRefresh={reload} />
      </div>
    </div>
  )
}
