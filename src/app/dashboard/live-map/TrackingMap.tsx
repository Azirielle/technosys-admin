"use client"
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { ActiveTechnician } from '@/app/actions/tracking'

// Fix missing marker icons in leaflet with next/image or standard URLs
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle "fly to" animation when a technician is selected
function MapController({ selectedTech }: { selectedTech: ActiveTechnician | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedTech && selectedTech.latitude && selectedTech.longitude) {
      map.flyTo([selectedTech.latitude, selectedTech.longitude], 15, {
        animate: true,
        duration: 1.5 // 1.5 seconds animation
      });
    }
  }, [selectedTech, map]);

  return null;
}

interface TrackingMapProps {
  technicians: ActiveTechnician[];
  selectedTechId: string | null;
  onSelectTech: (id: string) => void;
}

export default function TrackingMap({ technicians, selectedTechId, onSelectTech }: TrackingMapProps) {
  // Find selected technician to pass to MapController
  const selectedTech = selectedTechId ? technicians.find(t => t.technician_id === selectedTechId) || null : null;

  // Default center (Manila)
  const defaultCenter: [number, number] = [14.5995, 120.9842]

  // Filter technicians that actually have coordinates
  const validTechnicians = technicians.filter(t => t.latitude !== null && t.longitude !== null);

  return (
    <MapContainer 
      center={validTechnicians.length > 0 ? [validTechnicians[0].latitude!, validTechnicians[0].longitude!] : defaultCenter} 
      zoom={12} 
      className="w-full h-full z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController selectedTech={selectedTech} />

      {validTechnicians.map((tech) => (
        <Marker 
          key={tech.technician_id} 
          position={[tech.latitude!, tech.longitude!]}
          icon={customIcon}
          eventHandlers={{
            click: () => onSelectTech(tech.technician_id)
          }}
        >
          <Popup>
            <div className="text-sm font-medium">
              <p className="font-bold text-slate-900">{tech.full_name}</p>
              <p className="text-slate-500 capitalize">{tech.status}</p>
              <p className="text-xs text-slate-400 mt-1">
                Updated: {tech.last_updated ? new Date(tech.last_updated).toLocaleTimeString() : 'Unknown'}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
