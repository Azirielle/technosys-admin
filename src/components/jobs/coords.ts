// coords: reads map coordinates pasted into the job's Address box, e.g. "14.3439, 121.0617" (what Google Maps
// shows when you long-press a spot). Returns [lat, lon], or null when the text isn't coordinates.
export function parseCoords(text: string): [number, number] | null {
  // Both numbers need a decimal point, so a street number like "15 2" never counts
  const m = text.trim().match(/^(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)$/)
  if (!m) return null
  const lat = Number(m[1]), lon = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null
}
