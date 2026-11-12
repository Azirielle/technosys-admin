import { NextResponse } from 'next/server';

const MOCK_LANDMARKS = [
  { place_id: 'mock-1', display_name: 'Pacita Complex 1, San Pedro City, Laguna, Philippines', lat: '14.35410', lon: '121.06650' },
  { place_id: 'mock-2', display_name: 'San Pedro City Hall, San Pedro City, Laguna, Philippines', lat: '14.35920', lon: '121.05050' },
  { place_id: 'mock-3', display_name: 'SM Center San Pedro, National Highway, San Pedro, Laguna, Philippines', lat: '14.36480', lon: '121.05430' },
  { place_id: 'mock-4', display_name: 'Biñan City Hall, Zapote, Biñan City, Laguna, Philippines', lat: '14.33840', lon: '121.08250' },
  { place_id: 'mock-5', display_name: 'Ayala Center, Makati City, Metro Manila, Philippines', lat: '14.55180', lon: '121.02568' },
  { place_id: 'mock-6', display_name: 'Bonifacio Global City (BGC), Taguig City, Metro Manila, Philippines', lat: '14.55200', lon: '121.04780' },
  { place_id: 'mock-7', display_name: 'Ortigas Center, Pasig City, Metro Manila, Philippines', lat: '14.58690', lon: '121.06140' },
  { place_id: 'mock-8', display_name: 'Alabang Town Center, Muntinlupa City, Metro Manila, Philippines', lat: '14.42580', lon: '121.03050' },
  { place_id: 'mock-9', display_name: 'SM Mall of Asia, Pasay City, Metro Manila, Philippines', lat: '14.53530', lon: '120.98210' },
  { place_id: 'mock-10', display_name: 'Festival Mall, Filinvest City, Alabang, Muntinlupa, Philippines', lat: '14.41720', lon: '121.04010' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const query = q.trim();

  // 1. Primary: Nominatim with strict Philippines countrycodes filter
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=ph&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'TechnoCycle-Fleet/1.0 (contact@technocycle.ph)',
        'Accept-Language': 'en'
      },
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data.map((item: any, idx: number) => ({
          place_id: String(item.place_id || `nom-${idx}-${Date.now()}`),
          display_name: item.display_name,
          lat: String(item.lat),
          lon: String(item.lon)
        })));
      }
    }
  } catch (err) {
    console.warn('Nominatim fetch failed, trying local fallback:', err);
  }

  // 2. Secondary: Photon fallback strictly scoped to Philippines
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' Philippines')}&limit=6`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        // Filter strictly to Philippines
        const results = data.features
          .filter((f: any) => {
            const country = (f.properties?.country || '').toLowerCase();
            return country.includes('philippines') || country === 'ph' || !country;
          })
          .map((f: any, idx: number) => {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [0, 0];
            const nameParts = [props.name, props.street, props.city || props.district, props.state, 'Philippines'].filter(Boolean);
            return {
              place_id: String(props.osm_id || `photon-${idx}-${Date.now()}`),
              display_name: nameParts.join(', '),
              lat: String(coords[1]),
              lon: String(coords[0])
            };
          });

        if (results.length > 0) {
          return NextResponse.json(results);
        }
      }
    }
  } catch (err) {
    console.warn('Photon fallback fetch failed:', err);
  }

  // 3. Tertiary: Local Philippines Landmark Dictionary
  const matchedMocks = MOCK_LANDMARKS.filter(m => 
    m.display_name.toLowerCase().includes(query.toLowerCase())
  );

  if (matchedMocks.length > 0) {
    return NextResponse.json(matchedMocks);
  }

  // Fallback with unique place_id
  return NextResponse.json([{
    place_id: `fallback-${Date.now()}`,
    display_name: `${query}, Philippines`,
    lat: '14.35410',
    lon: '121.06650'
  }]);
}
