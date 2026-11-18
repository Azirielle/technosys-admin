// coords: reads map coordinates typed or pasted into the job's Address box. Returns [lat, lon], or null when the text
// isn't coordinates. Understands the three ways maps write them:
//   14.3439, 121.0617                  (Google Maps, long-press a spot)
//   14.334444° N, 121.029167° E        (degrees with N/S/E/W)
//   14°20′04″N 121°01′45″E             (degrees, minutes, seconds; ' and " work too)
const PART = String.raw`(-?\d{1,3}(?:\.\d+)?)\s*(°)?\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:["″]|'')\s*)?([NSEW])?`
const BOTH = new RegExp(String.raw`^${PART}\s*[,;]?\s*${PART}$`, 'i')

/** One number of the pair, or null. A bare whole number ("15") never counts, so a street number isn't a place. */
function part(deg: string, sign?: string, min?: string, sec?: string, hemi?: string) {
  if (!sign && !min && !sec && !hemi && !deg.includes('.')) return null
  const value = Math.abs(Number(deg)) + Number(min ?? 0) / 60 + Number(sec ?? 0) / 3600
  return deg.startsWith('-') || /[SW]/i.test(hemi ?? '') ? -value : value
}

export function parseCoords(text: string): [number, number] | null {
  const m = text.trim().match(BOTH)
  if (!m) return null
  if (/[EW]/i.test(m[5] ?? '') || /[NS]/i.test(m[10] ?? '')) return null // the first is north/south, the second east/west
  const lat = part(m[1], m[2], m[3], m[4], m[5]), lon = part(m[6], m[7], m[8], m[9], m[10])
  if (lat === null || lon === null) return null
  const round = (n: number) => Math.round(n * 1e6) / 1e6
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [round(lat), round(lon)] : null
}
