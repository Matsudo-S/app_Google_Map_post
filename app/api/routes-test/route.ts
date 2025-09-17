import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_ROUTES_MAP_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key env: NEXT_PUBLIC_GOOGLE_ROUTES_MAP_API_KEY' }), { status: 500 });
  }

  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  const departureTime = now.toISOString();

  const body = {
    origin: { location: { latLng: { latitude: 35.681236, longitude: 139.767125 } } },
    destination: { location: { latLng: { latitude: 35.689487, longitude: 139.691706 } } },
    travelMode: 'TRANSIT',
    computeAlternativeRoutes: false,
    departureTime,
  };

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'fetch failed' }), { status: 500 });
  }
}


