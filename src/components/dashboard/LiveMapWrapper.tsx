"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface LiveMapWrapperProps {
  locations: any[];
}

// Helper component to auto-fit bounds when markers load
function BoundsFitter({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

export default function LiveMapWrapper({ locations }: LiveMapWrapperProps) {
  useEffect(() => {
    // Fix default marker icon issues with webpack/leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const createCustomIcon = (tech: any) => {
    const isOnline = tech.isOnline;
    const initial = tech.name.charAt(0).toUpperCase();
    const colorClass = isOnline ? 'bg-emerald-500' : 'bg-slate-400';
    
    const html = renderToStaticMarkup(
      <div className="relative group flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${colorClass} text-white font-black text-lg z-10`}>
          {initial}
        </div>
        {isOnline && (
          <div className="absolute top-0 w-10 h-10 bg-emerald-500 rounded-full animate-ping opacity-50 z-0" />
        )}
        <div className="mt-1 bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-slate-200 whitespace-nowrap z-10">
          {tech.name}
        </div>
      </div>
    );

    return L.divIcon({
      html,
      className: 'custom-leaflet-marker bg-transparent border-none', // Remove default background
      iconSize: [60, 60], // Make room for the label below
      iconAnchor: [30, 20],
      popupAnchor: [0, -20],
    });
  };

  // Default center if no locations
  const defaultCenter: [number, number] = [14.5995, 120.9842]; // Manila
  
  // Calculate bounds to fit all markers if locations exist
  const bounds = locations.length > 0 
    ? L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]))
    : null;

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false} // Disable default to move it later if needed
      >
        {bounds && <BoundsFitter bounds={bounds} />}
        
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
              <div className="p-0.5 min-w-[120px]">
                <p className="font-bold text-slate-900 text-sm mb-1">{tech.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {tech.time}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">
                  {tech.status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
