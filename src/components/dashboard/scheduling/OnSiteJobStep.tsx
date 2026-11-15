// OnSiteJobStep: step 1 of a new on-site job — the job name, the address, and how close the crew must be to check in.
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { Button, Field, Input, Skeleton } from '@/components/ui'

const GeofenceMap = dynamic(() => import('../GeofenceMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-44 w-full rounded-control" />,
})

export interface JobPlace {
  clientName: string
  location: string
  lat: number
  lon: number
  radius: number
}

type GeocodeResult = { place_id?: string | number; display_name: string; lat: string; lon: string }

export function OnSiteJobStep({ value, onChange }: { value: JobPlace; onChange: (next: JobPlace) => void }) {
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [showArea, setShowArea] = useState(false)
  const set = (patch: Partial<JobPlace>) => onChange({ ...value, ...patch })

  async function searchAddress(query: string) {
    set({ location: query })
    if (query.trim().length < 2) return setResults([])
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <Field label="Job or customer name" htmlFor="job-name" required>
        <Input id="job-name" value={value.clientName} onChange={(e) => set({ clientName: e.target.value })} placeholder="Aircon cleaning, SM Southmall" />
      </Field>

      <Field label="Address" htmlFor="job-address" hint="Pick a suggestion so the check-in area is at the right place. Left empty, the job is at Pacita HQ.">
        <div className="relative">
          <Input id="job-address" icon={Search} value={value.location} onChange={(e) => searchAddress(e.target.value)} placeholder="Search an address or building" autoComplete="off" />
          {results.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-control bg-surface p-1 shadow-raised">
              {results.map((r, i) => (
                <li key={`${r.place_id ?? i}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      set({ location: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) })
                      setResults([])
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-chip px-3 py-2 text-left text-small text-ink hover:bg-surface-soft"
                  >
                    <MapPin className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                    <span className="truncate">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      <div className="rounded-control bg-surface-soft p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-small text-ink-2">
            Crew can check in within <span className="font-medium text-ink">{value.radius} m</span> of the job.
          </p>
          <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setShowArea((s) => !s)}>
            {showArea ? 'Done' : 'Change'}
          </Button>
        </div>
        {showArea && (
          <div className="mt-3 flex flex-col gap-3">
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={value.radius}
              onChange={(e) => set({ radius: Number(e.target.value) })}
              aria-label="Check-in distance in metres"
              className="w-full cursor-pointer accent-[var(--tc-action)]"
            />
            <div className="relative h-44 overflow-hidden rounded-control">
              <GeofenceMap lat={value.lat} lon={value.lon} radius={value.radius} onPositionChange={([lat, lon]) => set({ lat, lon })} />
            </div>
            <p className="text-caption text-ink-3">Drag the pin if the address landed in the wrong spot.</p>
          </div>
        )}
      </div>
    </div>
  )
}
