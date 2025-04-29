import { Activity } from '../utils/activityUtils';
import {
  getActivityRankings,
  getLocationActivityScore,
} from './getActivityRankings';

describe('getActivityRankings', () => {
  const daily = {
    temperature_2m_max: [2, 3, 4, 5, 6, 7, 8],
    temperature_2m_min: [0, 1, 2, 3, 4, 5, 6],
    precipitation_sum: [0, 1, 2, 3, 4, 5, 6],
    snowfall_sum: [12, 11, 10, 9, 8, 7, 6],
    windspeed_10m_max: [10, 15, 20, 25, 30, 35, 40],
    humidity_2m_max: [60, 65, 70, 75, 80, 85, 90],
    uv_index_max: [3, 4, 5, 6, 7, 8, 9],
    daylight_hours: [8, 8, 8, 8, 8, 8, 8],
    pollen_count: [10, 20, 30, 40, 50, 60, 70],
  };

  it('returns sorted rankings', () => {
    const rankings = getActivityRankings(daily, 'Country', 'City');
    expect(rankings.length).toBe(4);
    expect(rankings[0].score).toBeGreaterThanOrEqual(rankings[1].score);
  });

  it('returns default scores for unknown country/city', () => {
    const rankings = getActivityRankings(daily, 'UnknownCountry', 'UnknownCity');
    expect(rankings.length).toBeGreaterThan(0);
    expect(rankings.every(r => typeof r.score === 'number')).toBe(true);
  });

  it('returns default scores for missing country/city', () => {
    const rankings = getActivityRankings(daily);
    expect(rankings.length).toBeGreaterThan(0);
    expect(rankings.every(r => typeof r.score === 'number')).toBe(true);
  });

  it('handles missing daily data', () => {
    const rankings = getActivityRankings(null);
    expect(rankings.every(r => r.score === 0)).toBe(true);
  });

  it('returns empty array if daily is undefined', () => {
    // This is similar to null, but covers undefined
    const rankings = getActivityRankings(undefined as any);
    expect(rankings.every(r => r.score === 0)).toBe(true);
  });
});

describe('getLocationActivityScore', () => {
  const daily = {
    temperature_2m_max: [25, 26, 27, 28, 29, 30, 31],
    temperature_2m_min: [15, 16, 17, 18, 19, 20, 21],
    precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
    snowfall_sum: [0, 0, 0, 0, 0, 0, 0],
    windspeed_10m_max: [20, 21, 22, 23, 24, 25, 26],
    humidity_2m_max: [50, 51, 52, 53, 54, 55, 56],
    uv_index_max: [5, 6, 7, 8, 9, 10, 11],
    daylight_hours: [10, 10, 10, 10, 10, 10, 10],
    pollen_count: [10, 10, 10, 10, 10, 10, 10],
  };

  it('returns the highest score', () => {
    const score = getLocationActivityScore(daily);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThan(0);
  });

  it('returns the score for a specific activity', () => {
    const score = getLocationActivityScore(daily, undefined, undefined, 'Surfing');
    expect(typeof score).toBe('number');
  });

  it('returns 0 for unknown activity', () => {
    const score = getLocationActivityScore(daily, undefined, undefined, 'UnknownActivity' as any as Activity);
    expect(score).toBe(0);
  });

  it('returns 0 for missing activity and missing daily', () => {
    const score = getLocationActivityScore(undefined as any, undefined, undefined, undefined);
    expect(score).toBe(0);
  });

  it('returns 0 for empty daily object', () => {
    const score = getLocationActivityScore({} as any);
    expect(score).toBe(0);
  });

  it('returns 0 for missing daily', () => {
    expect(getLocationActivityScore(null)).toBe(0);
  });
});
