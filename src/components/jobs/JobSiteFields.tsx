// JobSiteFields: the "where" part of the job form: client, address search, the pin on the map and the
// time-in circle the crew must be inside. Uses the admin's address search (/api/geocode) and pin map.
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search } from 'lucide-react'
import { Field, Input, Skeleton } from '@/components/ui'

const GeofenceMap = dynamic(() => import('@/components/dashboard/GeofenceMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full rounded-control" />,
})

export type SiteValue = { client_name: string; project_name: string; address: string; site_lat: number; site_lon: number; site_radius_m: number }
type Found = { place_id?: string | number; display_name: string; lat: string; lon: string }

export function JobSiteFields({ value, onChange, pinned }: { value: SiteValue; onChange: (patch: Partial<SiteValue>) => void; pinned: boolean }) {
  const [found, setFound] = useState<Found[]>([])

  async function search(q: string) {
    onChange({ address: q })
    if (q.trim().length < 3) return setFound([])
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setFound(Array.isArray(data) ? data.slice(0, 6) : [])
    } catch {
      setFound([])
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <div className="grid grid-cols-1 gap-stack sm:grid-cols-2">
        <Field label="Client" htmlFor="job-client" required>
          <Input id="job-client" value={value.client_name} onChange={(e) => onChange({ client_name: e.target.value })} placeholder="Toyota Sta. Rosa" />
        </Field>
        <Field label="Project (optional)" htmlFor="job-project">
          <Input id="job-project" value={value.project_name} onChange={(e) => onChange({ project_name: e.target.value })} placeholder="Chiller room PM" />
        </Field>
      </div>

      <Field label="Address" htmlFor="job-address" required hint="Pick a suggestion, then drag the pin if it landed in the wrong spot.">
        <div className="relative">
          <Input id="job-address" icon={Search} value={value.address} onChange={(e) => search(e.target.value)} placeholder="Search an address or building" autoComplete="off" />
          {found.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-control bg-surface p-1 shadow-raised">
              {found.map((r, i) => (
                <li key={`${r.place_id ?? i}-${i}`}>
                  <button type="button"
                    onClick={() => { onChange({ address: r.display_name, site_lat: parseFloat(r.lat), site_lon: parseFloat(r.lon) }); setFound([]) }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-chip px-3 py-2 text-left text-small text-ink hover:bg-surface-soft">
                    <MapPin className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                    <span className="truncate">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <div className="relative h-56 overflow-hidden rounded-control">
          <GeofenceMap lat={value.site_lat} lon={value.site_lon} radius={value.site_radius_m}
            onPositionChange={([lat, lon]) => onChange({ site_lat: lat, site_lon: lon })} />
        </div>
        {!pinned && <p className="text-caption text-warning">Search the address or click the map to place the pin.</p>}
        <label className="flex items-center gap-3 text-small text-ink-2" htmlFor="job-radius">
          <span className="shrink-0">Time-in circle</span>
          <input id="job-radius" type="range" min={50} max={1000} step={25} value={value.site_radius_m}
            onChange={(e) => onChange({ site_radius_m: Number(e.target.value) })} className="w-full cursor-pointer accent-[var(--tc-action)]" />
          <span className="w-16 shrink-0 text-right font-medium text-ink tabular-nums">{value.site_radius_m} m</span>
        </label>
      </div>
    </div>
  )
}
