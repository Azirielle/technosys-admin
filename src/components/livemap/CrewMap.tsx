// CrewMap: the Leaflet map with one marker per field worker. Fits everyone in view; flies to the one you pick.
'use client'

import { useEffect } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { formatAgo } from '@/lib/format'
import { cx } from '@/components/ui'
import { STATUS, timeOnShift, type CrewLocation } from './useCrewLocations'

/** Pacita HQ, the only site (see PROJECT_STATE §4). */
const HQ: [number, number] = [14.3439, 121.0617]

// OpenStreetMap is the only tile host the site's security policy allows; in dark mode a CSS filter
// (DARK_TILES) darkens the same tiles instead of loading a second map style.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_TILES = 'dark:[filter:invert(1)_hue-rotate(180deg)_brightness(0.85)_contrast(0.9)]'

const DOT: Record<CrewLocation['status'], string> = {
  on_duty: 'bg-success text-on-action',
  no_signal: 'bg-warning text-on-action',
  off_duty: 'bg-surface-soft text-ink-2',
}

function FitAll({ crew }: { crew: CrewLocation[] }) {
  const map = useMap()
  useEffect(() => {
    if (crew.length) map.fitBounds(L.latLngBounds(crew.map((c) => [c.lat, c.lon])), { padding: [60, 60], maxZoom: 15 })
    // Fit once per change in who is shown, not on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, crew.map((c) => c.id).join()])
  return null
}

function FlyTo({ target }: { target: CrewLocation | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 16, { duration: 1.2 })
  }, [map, target])
  return null
}

function markerIcon(c: CrewLocation, selected: boolean) {
  const initials = c.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const html = renderToStaticMarkup(
    <div className="flex flex-col items-center">
      <div className={cx('flex size-10 items-center justify-center overflow-hidden rounded-pill text-small font-semibold shadow-raised ring-2', DOT[c.status], selected ? 'ring-action scale-110' : 'ring-surface')}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a marker is plain HTML; the photo is from Supabase storage */}
        {c.avatar ? <img src={c.avatar} alt="" className="size-full object-cover" /> : initials}
      </div>
      <div className="mt-1 rounded-pill bg-surface px-2 py-0.5 text-micro font-medium whitespace-nowrap text-ink shadow-card">{c.name.split(' ')[0]}</div>
    </div>,
  )
  return L.divIcon({ html, className: 'bg-transparent border-none', iconSize: [80, 64], iconAnchor: [40, 20], popupAnchor: [0, -18] })
}

export default function CrewMap({ crew, selectedId }: { crew: CrewLocation[]; selectedId: string | null }) {
  return (
    <MapContainer center={HQ} zoom={13} zoomControl={false} scrollWheelZoom className="h-full w-full">
      <TileLayer url={TILE_URL} attribution="&copy; OpenStreetMap contributors" className={DARK_TILES} />
      <ZoomControl position="bottomright" />
      {!selectedId && <FitAll crew={crew} />}
      <FlyTo target={crew.find((c) => c.id === selectedId)} />
      {crew.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lon]} icon={markerIcon(c, c.id === selectedId)}>
          <Popup>
            <div className="min-w-44 font-sans">
              <p className="text-small font-semibold">{c.name}</p>
              <p className="text-caption">{STATUS[c.status].label}{c.status === 'on_duty' && c.timeIn ? ` · ${timeOnShift(c.timeIn)} on shift` : ''}</p>
              <p className="text-caption">Last GPS {formatAgo(c.updatedAt)}</p>
              {c.phone && <a href={`tel:${c.phone}`} className="mt-1 inline-block text-caption font-medium">Call {c.phone}</a>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
