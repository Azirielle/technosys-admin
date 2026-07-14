import { useEffect } from "react";
import { Marker, Circle, useMapEvents, useMap } from "react-leaflet";

export default function LocationMarkerInner({ lat, lng, setLat, setLng, radius }: { lat: number | null, lng: number | null, setLat: (lat: number) => void, setLng: (lng: number) => void, radius: number }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    },
  });

  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 16); // Zoom in closer when coordinates change
    }
  }, [lat, lng, map]);

  return lat && lng ? (
    <>
      <Marker position={[lat, lng]} />
      <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }} />
    </>
  ) : null;
}
