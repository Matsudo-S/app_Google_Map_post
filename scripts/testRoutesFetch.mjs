import { setTimeout as delay } from 'node:timers/promises';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_ROUTES_MAP_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.ROUTES_API_KEY_SERVER;

if (!apiKey) {
  console.error('Missing API key. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or ROUTES_API_KEY_SERVER in your shell.');
  process.exit(1);
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

async function main() {
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('HTTP', res.status, res.statusText);
    console.log(text);
  } catch (e) {
    console.error('Fetch error:', e);
    process.exit(2);
  }
}

main();


