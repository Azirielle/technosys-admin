"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icons if necessary, but we are using a custom SVG icon now
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom SVG Pin for high-res screens
const customSvgIcon = L.divIcon({
  html: `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
          </svg>
         </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32], // Anchor at bottom center
});

interface DynamicLeafletMapProps {
  lat: number;
  lng: number;
  radius: number;
}

// MapUpdater safely triggers flyTo when coordinates change
function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

export default function DynamicLeafletMap({ lat, lng, radius }: DynamicLeafletMapProps) {
  useEffect(() => {
    // Force a re-render or resize when mounted inside a modal
    window.dispatchEvent(new Event('resize'));
  }, []);

  return (
    <MapContainer 
      center={[lat, lng]} 
      zoom={15} 
      scrollWheelZoom={true} 
      style={{ height: '100%', width: '100%', borderRadius: '0.375rem', zIndex: 10 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        detectRetina={true}
      />
      <MapUpdater lat={lat} lng={lng} />
      <Marker position={[lat, lng]} icon={customSvgIcon} />
      <Circle 
        center={[lat, lng]} 
        radius={radius} 
        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }} 
      />
    </MapContainer>
  );
}
