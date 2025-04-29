import { getLatLngFromGeocode, fetchNearbyPlaces } from './locationHelpers';
import { Activity } from './activityUtils';

export async function fetchGeocode(searchText: string, apiKey: string) {
  const address = encodeURIComponent(searchText.trim());
  const geoRes = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`
  );
  const geoData = await geoRes.json();
  return geoData;
}

export async function fetchNearbyActivities(apiKey: string, lat: number, lng: number) {
  const [skiRes, surfRes] = await Promise.all([
    fetchNearbyPlaces(apiKey, lat, lng, 'ski_resort'),
    fetchNearbyPlaces(apiKey, lat, lng, 'beach'),
  ]);
  return { skiRes, surfRes };
}

export async function fetchWeather(lat: number, lng: number) {
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,windspeed_10m_max,weathercode&forecast_days=7&timezone=auto`
  );
  const weatherData = await weatherRes.json();
  return weatherData;
}
