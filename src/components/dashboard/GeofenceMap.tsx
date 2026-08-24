'use client';

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin } from 'lucide-react';

const createCustomIcon = () => {
  const html = renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      <MapPin className="w-8 h-8 text-indigo-600 fill-indigo-100" />
      <div className="absolute top-8 w-2 h-2 bg-indigo-600/30 rounded-full animate-ping" />
    </div>
  );

  return L.divIcon({
    html,
    className: 'bg-transparent border-none',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function MapController({ position, setPosition, radius }: { position: [number, number], setPosition: (pos: [number, number]) => void, radius: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <>
      <Marker 
        position={position} 
        draggable={true}
        icon={createCustomIcon()}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const pos = marker.getLatLng();
            setPosition([pos.lat, pos.lng]);
          },
        }}
      >
        <Popup>Dispatch Location</Popup>
      </Marker>
      <Circle center={position} radius={radius} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.2 }} />
    </>
  );
}

interface GeofenceMapProps {
  lat: number;
  lon: number;
  radius: number;
  onPositionChange: (pos: [number, number]) => void;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Invalidate size after modal render to fix grey map issue
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function GeofenceMap({ lat, lon, radius, onPositionChange }: GeofenceMapProps) {
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer 
        center={[lat, lon]} 
        zoom={16} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
      <MapResizer />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController 
        position={[lat, lon]}
        setPosition={onPositionChange}
        radius={radius}
      />
      </MapContainer>
    </div>
  );
}
