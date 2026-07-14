"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2, Maximize2, Minimize2 } from "lucide-react";

// Dynamically import Leaflet components so it doesn't break during Next.js SSR
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const LocationMarkerInner = dynamic(() => import("./LocationMarkerInner"), { ssr: false });

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface MapAutocompleteProps {
  location: string;
  setLocation: (loc: string) => void;
  lat: number | null;
  setLat: (lat: number) => void;
  lng: number | null;
  setLng: (lng: number) => void;
  radius: number;
  setRadius: (radius: number) => void;
}

export default function MapAutocomplete({ location, setLocation, lat, setLat, lng, setLng, radius, setRadius }: MapAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fix leaflet default icons on client-side only
  useEffect(() => {
    (async function initLeaflet() {
      const L = await import("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/marker-icon-2x.png",
        iconUrl: "/marker-icon.png",
        shadowUrl: "/marker-shadow.png",
      });
    })();
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`, {
        headers: { 'User-Agent': 'TechnoSys HRIS Admin/1.0' }
      });
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocation(val);
    setShowDropdown(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 500);
  };

  const handleSelect = (s: Suggestion) => {
    setLocation(s.display_name);
    setLat(parseFloat(s.lat));
    setLng(parseFloat(s.lon));
    setShowDropdown(false);
  };

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
          Location / Site Address
        </label>
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3" />
          <input
            required
            type="text"
            value={location}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="w-full pl-9 pr-3.5 py-2 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:bg-zinc-50/20 text-zinc-900 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-900 transition-all placeholder:text-zinc-400 placeholder:font-medium"
            placeholder="Search address (e.g. San Pedro, Laguna)"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-400 absolute right-3 animate-spin" />}
        </div>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
            {suggestions.map((s) => (
              <div
                key={s.place_id}
                onMouseDown={() => handleSelect(s)}
                className="px-3 py-2 cursor-pointer hover:bg-zinc-50 border-b border-zinc-100 last:border-0 text-xs text-zinc-700 font-medium truncate"
              >
                {s.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`w-full rounded-xl overflow-hidden border border-zinc-200 shadow-inner z-10 relative transition-all duration-300 ease-in-out ${isExpanded ? 'h-96' : 'h-40'}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow border border-zinc-200 hover:bg-zinc-50 transition-colors"
          title={isExpanded ? "Collapse Map" : "Expand Map"}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4 text-zinc-600" /> : <Maximize2 className="w-4 h-4 text-zinc-600" />}
        </button>
        <MapContainer
          center={[14.3585, 121.0583]} // Default to Laguna area
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarkerInner lat={lat} lng={lng} setLat={setLat} setLng={setLng} radius={radius} />
        </MapContainer>
      </div>

      <div className="bg-zinc-50 px-3 py-2.5 rounded-xl border border-zinc-100 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
          <MapPin className="w-3 h-3 text-zinc-400" />
          Click on the map to fine-tune the exact geofence pin location.
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider whitespace-nowrap">
            Radius: {radius}m
          </label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
          />
        </div>
      </div>
    </div>
  );
}
