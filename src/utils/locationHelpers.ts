import { SEARCH_RADIUS_METERS } from './constants';

export const getLatLngFromGeocode = (geoData: any, fallback: string) => {
  if (!geoData.results || geoData.results.length === 0) return null;
  const loc = geoData.results[0].geometry.location;
  const lat = typeof loc.lat === 'string' ? parseFloat(loc.lat) : loc.lat;
  const lng = typeof loc.lng === 'string' ? parseFloat(loc.lng) : loc.lng;
  const name = geoData.results[0].address_components?.[0]?.long_name || fallback;
  const countryComp = geoData.results[0].address_components?.find((c: any) => c.types.includes('country'));
  const country = countryComp ? countryComp.long_name : '';
  return { lat, lng, name, country };
};

export const fetchNearbyPlaces = async (
  apiKey: string,
  lat: number,
  lng: number,
  type: 'ski_resort' | 'beach'
) => {
  const url = `https://places.googleapis.com/v1/places:searchNearby?key=${apiKey}`;
  const body = {
    includedTypes: [type],
    maxResultCount: 10,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: SEARCH_RADIUS_METERS,
      },
    },
  };
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.name,places.types',
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
};
