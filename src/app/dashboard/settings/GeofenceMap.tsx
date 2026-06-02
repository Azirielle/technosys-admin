"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { Search, Loader2, Maximize2, Minimize2 } from "lucide-react"

// Subcomponent to trigger leaflet size recalculation when resizing or toggling fullscreen
function MapResizeHandler({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)
    return () => clearTimeout(timer)
  }, [isFullscreen, map])
  return null
}

// Fix default Leaflet icon paths
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface GeofenceMapProps {
  latitude: number
  longitude: number
  radius: number
  onLocationChange: (lat: number, lng: number) => void
}

// Subcomponent to update map view when props change
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

// Subcomponent to handle clicking on the map to place the marker
function MapEventsHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function GeofenceMap({ latitude, longitude, radius, onLocationChange }: GeofenceMapProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  const markerRef = useRef<L.Marker>(null)

  const position = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude])

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const latLng = marker.getLatLng()
          onLocationChange(latLng.lat, latLng.lng)
        }
      },
    }),
    [onLocationChange]
  )

  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)

    try {
      // Nominatim Search (OpenStreetMap Geocoding API)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const firstResult = data[0]
        const lat = parseFloat(firstResult.lat)
        const lng = parseFloat(firstResult.lon)
        onLocationChange(lat, lng)
      } else {
        setSearchError("Location not found. Try entering a more specific name or address.")
      }
    } catch (err) {
      console.error("Geocoding error:", err)
      setSearchError("Search service unavailable. Please drag the pin or click on the map.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      handleSearch()
    }
  }

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[9999] bg-white flex flex-col p-4 md:p-6 space-y-3 overflow-hidden animate-in fade-in duration-200" : "space-y-3"}>
      {/* Header for Full Screen Mode */}
      {isFullscreen && (
        <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200 rounded-xl p-3 shadow-sm shrink-0">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Geofence Interactive Map (Full Screen)</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Search location, drag the marker pin, or double click the map to position coordinates.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit Full Screen
          </button>
        </div>
      )}

      {/* Map Search input overlay */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search address or branch (e.g. Pacita Branch)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-3 py-1.5 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={isSearching}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors animate-none"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
      </div>

      {searchError && (
        <p className="text-[10px] text-red-600 font-medium shrink-0">{searchError}</p>
      )}

      {/* Actual Map Panel */}
      <div className={`w-full rounded-lg border border-zinc-200 overflow-hidden relative z-10 ${isFullscreen ? "flex-1 min-h-0" : "h-[280px]"}`}>
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeMapView center={position} />
          <MapResizeHandler isFullscreen={isFullscreen} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventsHandler onMapClick={onLocationChange} />
          <Marker
            position={position}
            draggable={true}
            eventHandlers={eventHandlers}
            ref={markerRef}
            icon={markerIcon}
          />
          <Circle
            center={position}
            radius={radius}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
        </MapContainer>

        {/* Toggle Full Screen Button Overlay on Map */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-3 right-3 z-[1000] bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 p-2 rounded-lg shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-zinc-400 italic text-center shrink-0">
        💡 Drag the pin or click on the map to set geofence coordinates.
      </p>
    </div>
  )
}
