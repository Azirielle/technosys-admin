"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock } from 'lucide-react';
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
    const colorClass = isOnline ? 'bg-emerald-500' : 'bg-slate-400';
    const borderClass = isSelected ? 'border-4 border-indigo-600 shadow-2xl scale-125 z-30 ring-4 ring-indigo-300' : 'border-2 border-white shadow-lg';
    
    const html = renderToStaticMarkup(
      <div className={`relative group flex flex-col items-center transition-all duration-300 ${isSelected ? 'scale-110 z-30' : ''}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass} text-white font-black text-lg transition-transform ${borderClass}`}>
          {initial}
        </div>
        {(isOnline || isSelected) && (
          <div className={`absolute top-0 w-10 h-10 ${isSelected ? 'bg-indigo-500' : 'bg-emerald-500'} rounded-full animate-ping opacity-60 z-0`} />
        )}
        <div className={`mt-1 ${isSelected ? 'bg-indigo-900 text-white border-indigo-700 font-black scale-110 shadow-md' : 'bg-white/90 text-slate-900 font-bold border-slate-200'} text-[10px] px-2 py-0.5 rounded backdrop-blur-sm border whitespace-nowrap z-10 transition-all`}>
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
  const bounds = locations.length > 0 && !selectedTechId
    ? L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]))
    : null;

  return (
    <div className="absolute inset-0 z-0">
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
