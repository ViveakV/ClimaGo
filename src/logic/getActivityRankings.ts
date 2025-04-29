type Activity = 'Skiing' | 'Surfing' | 'Outdoor sightseeing' | 'Indoor sightseeing';

export interface Ranking {
  activity: Activity;
  score: number;
  reason: string;
}

export function getActivityRankings(daily: any, country?: string, city?: string): Ranking[] {
  // Defensive: check daily exists and is an object
  if (!daily || typeof daily !== 'object') {
    return [
      { activity: 'Skiing', score: 0, reason: 'No weather data.' },
      { activity: 'Surfing', score: 0, reason: 'No weather data.' },
      { activity: 'Outdoor sightseeing', score: 0, reason: 'No weather data.' },
      { activity: 'Indoor sightseeing', score: 0, reason: 'No weather data.' },
    ];
  }

  // Defensive: ensure arrays exist and have length 7, else fill with defaults
  const safeArr = (arr: any, def: number) =>
    Array.isArray(arr) && arr.length === 7 ? arr : Array(7).fill(def);

  const tmax = (() => {
    const arr = safeArr(daily.temperature_2m_max, 15);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const precip = (() => {
    const arr = safeArr(daily.precipitation_sum, 2);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const snow = (() => {
    const arr = safeArr(daily.snowfall_sum, 0);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const wind = (() => {
    const arr = safeArr(daily.windspeed_10m_max, 10);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const humidity = (() => {
    const arr = safeArr(daily.humidity_2m_max, 50);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const uv = (() => {
    const arr = safeArr(daily.uv_index_max, 5);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const daylight = (() => {
    const arr = safeArr(daily.daylight_hours, 12);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const pollen = (() => {
    const arr = safeArr(daily.pollen_count, 0);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();

  // Skiing: prefer cold, snowy, not rainy, good snow depth, recent snowfall
  let skiScore = 0;
  let skiReason = '';
  // Multi-factor: snow, temp, wind, humidity, daylight
  if (snow > 10 && tmax < 3 && wind < 30 && humidity < 80 && daylight > 7) {
    skiScore = 10;
    skiReason = 'Excellent snow depth, cold temps, and good daylight.';
  } else if (snow > 5 && tmax < 5 && wind < 40 && daylight > 6) {
    skiScore = 8;
    skiReason = 'Good snow and cold temperatures.';
  } else if (snow > 2 && tmax < 8 && wind < 50) {
    skiScore = 6;
    skiReason = 'Some snow and cool temperatures.';
  } else if (snow > 0.5 && tmax < 10) {
    skiScore = 4;
    skiReason = 'Marginal snow or a bit warm.';
  } else {
    skiScore = 1;
    skiReason = 'Not enough snow or too warm.';
  }

  // Surfing: prefer warm, windy, high waves, must be a surf city, low pollen, good daylight
  let surfScore = 0;
  let surfReason = '';
  // Multi-factor: temp, wind, daylight, humidity, pollen
  if (tmax > 20 && wind > 15 && wind < 40 && daylight > 8 && humidity < 85 && pollen < 50) {
    surfScore = 10;
    surfReason = 'Warm, breezy, good daylight, and low pollen.';
  } else if (tmax > 17 && wind > 10 && daylight > 7) {
    surfScore = 8;
    surfReason = 'Decent wind and mild weather.';
  } else if (tmax > 14 && wind > 7) {
    surfScore = 6;
    surfReason = 'Cool but surfable conditions.';
  } else {
    surfScore = 3;
    surfReason = 'Too cold, calm, or short days for good surfing.';
  }

  // Outdoor sightseeing: prefer mild, dry, good daylight, moderate UV, low pollen
  let outScore = 0;
  let outReason = '';
  if (precip < 2 && tmax > 15 && tmax < 28 && uv < 8 && daylight > 8 && pollen < 80) {
    outScore = 10;
    outReason = 'Mild, dry, good daylight, and low pollen.';
  } else if (precip < 5 && tmax > 10 && tmax < 32 && daylight > 7) {
    outScore = 8;
    outReason = 'Okay weather, some rain or pollen possible.';
  } else if (precip < 8 && tmax > 5 && tmax < 35) {
    outScore = 5;
    outReason = 'Somewhat rainy or less ideal temperatures.';
  } else {
    outScore = 2;
    outReason = 'Likely rainy, uncomfortable, or high pollen.';
  }

  // Indoor sightseeing: prefer bad outdoor weather, high pollen, low daylight
  let inScore = 0;
  let inReason = '';
  if (precip > 8 || tmax < 5 || tmax > 32 || pollen > 120 || daylight < 6) {
    inScore = 10;
    inReason = 'Best to stay indoors due to weather or pollen.';
  } else if (precip > 4 || tmax < 10 || tmax > 28 || pollen > 80 || daylight < 7) {
    inScore = 8;
    inReason = 'Indoor activities are a good option.';
  } else {
    inScore = 4;
    inReason = 'Outdoor activities are more appealing.';
  }

  return [
    { activity: 'Skiing' as Activity, score: skiScore, reason: skiReason },
    { activity: 'Surfing' as Activity, score: surfScore, reason: surfReason },
    { activity: 'Outdoor sightseeing' as Activity, score: outScore, reason: outReason },
    { activity: 'Indoor sightseeing' as Activity, score: inScore, reason: inReason },
  ].sort((a, b) => b.score - a.score);
}

/**
 * Returns the highest activity score for a location, for use in map overlays.
 * Optionally, you can specify which activity to get the score for.
 */
export function getLocationActivityScore(
  daily: any,
  country?: string,
  city?: string,
  activity?: Activity
): number {
  if (!daily || typeof daily !== 'object' || Object.keys(daily).length === 0) {
    return 0;
  }
  const rankings = getActivityRankings(daily, country, city);
  if (activity) {
    const found = rankings.find(r => r.activity === activity);
    return found ? found.score : 0;
  }
  // Return the highest score among all activities
  return rankings.length > 0 ? rankings[0].score : 0;
}
