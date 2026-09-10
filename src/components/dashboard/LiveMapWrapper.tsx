"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, Phone, ShieldCheck, Zap } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface LiveMapWrapperProps {
  locations: any[];
  selectedTechId?: string | null;
}

// Helper component to auto-fit bounds when markers initial load
function BoundsFitter({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

// Helper component to fly & spotlight a selected technician when clicked
function MapSpotlighter({ selectedTech }: { selectedTech: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedTech && typeof selectedTech.lat === 'number' && typeof selectedTech.lon === 'number') {
      map.flyTo([selectedTech.lat, selectedTech.lon], 16, {
        duration: 1.5
      });
    }
  }, [map, selectedTech]);
  return null;
}

export default function LiveMapWrapper({ locations, selectedTechId }: LiveMapWrapperProps) {
  useEffect(() => {
    // Fix default marker icon issues with webpack/leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const selectedTech = locations.find(l => l.id === selectedTechId);

  const createCustomIcon = (tech: any) => {
    const isOnline = tech.isOnline;
    const isSelected = tech.id === selectedTechId;
    const initial = tech.name.charAt(0).toUpperCase();
    const colorClass = isOnline ? 'bg-emerald-500' : tech.status === 'stale' ? 'bg-amber-500' : 'bg-slate-400';
    const borderClass = isSelected ? 'border-4 border-indigo-600 shadow-2xl scale-125 z-30 ring-4 ring-indigo-300' : 'border-2 border-white shadow-lg';
    
    const html = renderToStaticMarkup(
      <div className={`relative group flex flex-col items-center transition-all duration-300 ${isSelected ? 'scale-110 z-30' : ''}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass} text-white font-black text-lg transition-transform ${borderClass}`}>
          {initial}
        </div>
        {(isOnline || isSelected) && (
          <div className={`absolute top-0 w-10 h-10 ${isSelected ? 'bg-indigo-500' : 'bg-emerald-500'} rounded-full animate-ping opacity-60 z-0`} />
        )}
        <div className={`mt-1 ${isSelected ? 'bg-indigo-900 text-white border-indigo-700 font-black scale-110 shadow-md' : 'bg-white/95 text-slate-900 font-bold border-slate-200'} text-[10px] px-2 py-0.5 rounded backdrop-blur-sm border whitespace-nowrap z-10 transition-all flex items-center gap-1`}>
          <span>{tech.name}</span>
          {isOnline && tech.shiftDuration && (
            <span className="text-[9px] text-emerald-600 font-black">({tech.shiftDuration})</span>
          )}
        </div>
      </div>
    );

    return L.divIcon({
      html,
      className: 'custom-leaflet-marker bg-transparent border-none',
      iconSize: [80, 60],
      iconAnchor: [40, 20],
      popupAnchor: [0, -20],
    });
  };

  // Default center if no locations: Metro Manila coordinates
  const defaultCenter: [number, number] = [14.5995, 120.9842];
  
  // Calculate bounds to fit all markers if locations exist
  const bounds = locations.length > 0 && !selectedTechId
    ? L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]))
    : null;

  return (
    <div className="absolute inset-0 z-0">
      {locations.length === 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200 shadow-lg flex items-center gap-2.5 text-xs font-semibold text-gray-600 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>No technicians currently on active duty</span>
        </div>
      )}

      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        {bounds && <BoundsFitter bounds={bounds} />}
        {selectedTech && <MapSpotlighter selectedTech={selectedTech} />}
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ZoomControl position="bottomright" />

        {locations.map((tech) => (
          <Marker 
            key={tech.id} 
            position={[tech.lat, tech.lon]}
            icon={createCustomIcon(tech)}
          >
            <Popup>
              <div className="p-1 min-w-[170px]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-extrabold text-slate-900 text-sm">{tech.name}</p>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                    tech.isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {tech.isOnline ? 'On Duty' : 'Offline'}
                  </span>
                </div>

                {tech.isOnline && tech.shiftDuration && (
                  <p className="text-[11px] font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-500" />
                    Elapsed Shift: {tech.shiftDuration}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Last GPS Ping: {tech.time}</span>
                </div>

                {tech.phone && (
                  <a 
                    href={`tel:${tech.phone}`}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors no-underline"
                  >
                    <Phone className="w-3 h-3" />
                    Call ({tech.phone})
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
