"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { Search, Loader2, Maximize2, Minimize2, MapPin } from "lucide-react"

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
  const [isClosing, setIsClosing] = useState(false)
  const [isAnimatingIn, setIsAnimatingIn] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const enterFullscreen = () => {
    setIsFullscreen(true)
    setIsAnimatingIn(true)
    setTimeout(() => {
      setIsAnimatingIn(false)
    }, 20)
  }

  const exitFullscreen = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsFullscreen(false)
      setIsClosing(false)
    }, 200)
  }
  
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
    const queryStr = searchQuery.trim()
    if (!queryStr) return

    setIsSearching(true)
    setSearchError(null)

    // Helper to update location and exit loader
    const updateCoords = (lat: number, lng: number) => {
      onLocationChange(lat, lng)
      setIsSearching(false)
      return true
    }

    // 1. Direct Coordinates Parsing (e.g. "14.3392, 121.0597")
    const coordsRegex = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/
    const coordsMatch = queryStr.match(coordsRegex)
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1])
      const lng = parseFloat(coordsMatch[2])
      return updateCoords(lat, lng)
    }

    // 2. Maps URL Parsing (Extract coordinates from Google / Bing Maps URLs)
    // Works with: ...@14.3392,121.0597... or ...point=14.3392%2C121.0597... or ...query=14.3392,121.0597...
    const urlCoordsRegex = /[@=](-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/
    const urlMatch = queryStr.match(urlCoordsRegex)
    if (urlMatch) {
      const lat = parseFloat(urlMatch[1])
      const lng = parseFloat(urlMatch[2])
      return updateCoords(lat, lng)
    }

    const fetchGeocode = async (query: string) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&q=${encodeURIComponent(query)}`
        )
        return await res.json()
      } catch (err) {
        console.error("Geocoding fetch error:", err)
        return []
      }
    }

    try {
      // 3. Primary search scoped to Philippines
      let data = await fetchGeocode(queryStr)

      // Fallback 1: Remove leading street/building indicators if comma separated
      if ((!data || data.length === 0) && queryStr.includes(",")) {
        const parts = queryStr.split(",")
        if (parts.length > 1) {
          const fallbackQuery = parts.slice(1).join(",").trim()
          data = await fetchGeocode(fallbackQuery)
        }
      }

      // Fallback 2: Remove leading house numbers
      if (!data || data.length === 0) {
        const fallbackQuery = queryStr.replace(/^\d+[A-Za-z]?\s+/, "")
        if (fallbackQuery !== queryStr) {
          data = await fetchGeocode(fallbackQuery)
        }
      }

      if (data && data.length > 0) {
        const firstResult = data[0]
        const lat = parseFloat(firstResult.lat)
        const lng = parseFloat(firstResult.lon)
        onLocationChange(lat, lng)
      } else {
        setSearchError("Location not found. Try pasting Google/Bing Maps coordinates (e.g. 14.3392, 121.0597) or a Maps link directly.")
      }
    } catch (err) {
      console.error("Geocoding error:", err)
      setSearchError("Search service unavailable. Please drag the pin or click on the map to set location coordinates.")
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
    <div 
      className={isFullscreen ? "fixed inset-0 z-[9999] bg-zinc-50 flex flex-col p-4 md:p-6 space-y-4 overflow-hidden" : "space-y-3"}
      style={isFullscreen ? {
        transition: "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: isClosing ? 0 : (isAnimatingIn ? 0 : 1),
        transform: isClosing ? "scale(0.97)" : (isAnimatingIn ? "scale(0.97)" : "scale(1)")
      } : undefined}
    >
      {/* Full Screen Mode Combined Header */}
      {isFullscreen ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Geofence Editor</h3>
              <p className="text-[10px] text-zinc-500">Search location or adjust pin coordinates.</p>
            </div>
          </div>

          {/* Search bar inside header */}
          <div className="flex gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search address or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-1.5 border border-zinc-200 bg-zinc-50 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
          </div>

          <button
            type="button"
            onClick={exitFullscreen}
            className="bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit Full Screen
          </button>
        </div>
      ) : (
        /* Inline Search Bar */
        <div className="flex gap-2">
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
      )}

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
          onClick={isFullscreen ? exitFullscreen : enterFullscreen}
          className="absolute top-3 right-3 z-[1000] bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 p-2 rounded-lg shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Centered Instructions text at the bottom */}
      <div className="flex items-center justify-center gap-1 shrink-0">
        <span className="text-[10px] text-zinc-400 italic text-center">
          💡 Drag the pin or click on the map to set geofence coordinates.
        </span>
      </div>
    </div>
  )
}
