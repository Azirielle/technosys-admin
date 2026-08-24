import { NextResponse } from 'next/server';

const MOCK_LANDMARKS = [
  { display_name: 'Ayala Center, Makati City, Metro Manila', lat: '14.55180', lon: '121.02568' },
  { display_name: 'Bonifacio Global City (BGC), Taguig City, Metro Manila', lat: '14.55200', lon: '121.04780' },
  { display_name: 'Ortigas Center, Pasig City, Metro Manila', lat: '14.58690', lon: '121.06140' },
  { display_name: 'SM Mall of Asia, Pasay City, Metro Manila', lat: '14.53530', lon: '120.98210' },
  { display_name: 'Quezon City Hall, Elliptical Road, Quezon City', lat: '14.64710', lon: '121.04940' },
  { display_name: 'Alabang Town Center, Muntinlupa City, Metro Manila', lat: '14.42580', lon: '121.03050' },
  { display_name: 'IT Park, Lahug, Cebu City, Cebu', lat: '10.32750', lon: '123.90640' },
  { display_name: 'Davao City Hall, Poblacion District, Davao City', lat: '7.06470', lon: '125.60780' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const query = q.trim();

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ph`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'TechnoSys-Admin/1.0 (contact@technosys.com)',
        'Accept-Language': 'en'
      },
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data.map((item: any) => ({
          display_name: item.display_name,
          lat: String(item.lat),
          lon: String(item.lon)
        })));
      }
    }
  } catch (err) {
    console.warn('Nominatim backend fetch failed, trying Photon fallback:', err);
  }

  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const results = data.features.map((f: any) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0];
          const nameParts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
          return {
            display_name: nameParts.join(', '),
            lat: String(coords[1]),
            lon: String(coords[0])
          };
        });
        return NextResponse.json(results);
      }
    }
  } catch (err) {
    console.warn('Photon fallback fetch failed:', err);
  }

  const matchedMocks = MOCK_LANDMARKS.filter(m => 
    m.display_name.toLowerCase().includes(query.toLowerCase())
  );

  if (matchedMocks.length > 0) {
    return NextResponse.json(matchedMocks);
  }

  return NextResponse.json([{
    display_name: query,
    lat: '14.55180',
    lon: '121.02568'
  }]);
}
