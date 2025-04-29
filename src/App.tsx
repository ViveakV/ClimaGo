import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import background from './assets/images/background.png';
import { getActivityRankings, getBestDaysForActivity } from './logic/getActivityRankings';
import GoogleMapPicker from './components/GoogleMapPicker';
import MoreTime from './components/MoreTime';
import { activityMeta, formatDay, Activity } from './utils/activityUtils';
import { getLatLngFromGeocode, fetchNearbyPlaces } from './utils/locationHelpers';
import { ACTIVITIES, SEARCH_RADIUS_KM } from './utils/constants';

// --- Types ---
interface Ranking {
  activity: Activity;
  score: number;
  reason: string;
}

const App: React.FC = () => {
  // --- State ---
  const [inputMode, setInputMode] = useState<'city' | 'map'>('city');
  const [searchText, setSearchText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState<Ranking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bestDays, setBestDays] = useState<Record<Activity, number[]>>({
    Skiing: [],
    Surfing: [],
    "Outdoor sightseeing": [],
    "Indoor sightseeing": [],
  });
  const [dailyTimes, setDailyTimes] = useState<string[]>([]);
  const [popupActivity, setPopupActivity] = useState<Activity | null>(null);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSkiing, setHasSkiing] = useState<boolean | null>(null);
  const [hasSurfing, setHasSurfing] = useState<boolean | null>(null);
  const [showMapOverlay, setShowMapOverlay] = useState(true);

  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY as string;

  // --- Effects ---
  // Fetch suggestions as user types
  useEffect(() => {
    if (searchText.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchText)}&count=5`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (data.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    fetchSuggestions();
    return () => controller.abort();
  }, [searchText]);

  // --- Handlers ---
  const handleSuggestionClick = (suggestion: any) => {
    setSearchText(suggestion.name + (suggestion.country ? `, ${suggestion.country}` : ''));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (showTooltip) setShowTooltip(false);
    setShowSuggestions(true);
  };

  const handleSearch = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    if (inputMode === 'city' && !searchText.trim()) {
      setShowTooltip(true);
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = setTimeout(() => setShowTooltip(false), 2000);
      return;
    }
    if (inputMode === 'map' && !pickedLocation) return;

    setLoading(true);
    setRankings(null);
    setHasSkiing(null);
    setHasSurfing(null);

    let lat: number, lng: number, cityName: string, country: string;
    let placesApiFailed = false;

    try {
      // Get coordinates
      if (inputMode === 'map' && pickedLocation) {
        lat = pickedLocation.lat;
        lng = pickedLocation.lng;
        cityName = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        country = '';
      } else {
        const address = encodeURIComponent(searchText.trim());
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`
        );
        const geoData = await geoRes.json();
        const geo = getLatLngFromGeocode(geoData, searchText);
        if (!geo) {
          setError('City not found.');
          setLoading(false);
          return;
        }
        ({ lat, lng, name: cityName, country } = geo);
      }

      // Check for nearby skiing and surfing
      try {
        const [skiRes, surfRes] = await Promise.all([
          fetchNearbyPlaces(GOOGLE_API_KEY, lat, lng, 'ski_resort'),
          fetchNearbyPlaces(GOOGLE_API_KEY, lat, lng, 'beach'),
        ]);
        setHasSkiing(!!(skiRes && skiRes.places && skiRes.places.length > 0));
        setHasSurfing(!!(surfRes && surfRes.places && surfRes.places.length > 0));
      } catch {
        setHasSkiing(null);
        setHasSurfing(null);
        placesApiFailed = true;
      }

      // Fetch weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,windspeed_10m_max,weathercode&forecast_days=7&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      if (!weatherData.daily) {
        setError('Weather data not available.');
        setLoading(false);
        return;
      }
      setDailyTimes(weatherData.daily.time || []);

      // Rank activities and find best days
      const newRankings = getActivityRankings(weatherData.daily, country, cityName);
      setRankings(newRankings);

      // Fix: initialize bestDaysObj with all activities
      const bestDaysObj: Record<Activity, number[]> = {
        Skiing: [],
        Surfing: [],
        "Outdoor sightseeing": [],
        "Indoor sightseeing": [],
      };
      ACTIVITIES.forEach((activity: Activity) => {
        bestDaysObj[activity] = getBestDaysForActivity(weatherData.daily, activity, country, cityName);
      });
      setBestDays(bestDaysObj);

      setLoading(false);
      if (inputMode === 'map') setShowMapOverlay(false);
      if (placesApiFailed) setError('Unable to get info on surfing and skiing availability');
    } catch {
      setError('Failed to fetch data.');
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <div
      className="App app-background"
    >
      {/* MoreTime */}
      <MoreTime />
      {/* Background overlay */}
      <div className="background-overlay" />
      <div className="main-content">
        <div className="input-toggle-container">
          {/* City input toggle */}
          <label
            className={`input-toggle ${inputMode === 'city' ? 'active-city' : ''}`}
            htmlFor="type-city-radio"
          >
            <span className="input-toggle-icon city">{/* ... */}🏙️</span>
            Type city
            <input
              id="type-city-radio"
              type="radio"
              checked={inputMode === 'city'}
              onChange={() => { setInputMode('city'); setShowMapOverlay(true); }}
              style={{ display: 'none' }}
            />
          </label>
          {/* Map input toggle */}
          <label
            className={`input-toggle ${inputMode === 'map' ? 'active-map' : ''}`}
            htmlFor="show-map-radio"
          >
            <span className="input-toggle-icon map">{/* ... */}🗺️</span>
            Show map
            <input
              id="show-map-radio"
              type="radio"
              checked={inputMode === 'map'}
              onChange={() => { setInputMode('map'); setShowMapOverlay(true); }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {/* City input or map picker */}
        {inputMode === 'city' ? (
          <div className="city-input-container">
            <form className="city-input-form" onSubmit={e => e.preventDefault()} autoComplete="off">
              <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={handleInputChange}
                className="city-input"
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              <button
                type="submit"
                onClick={handleSearch}
                className="search-btn"
                aria-label="Search"
                disabled={loading}
              >
                {/* Magnifying glass SVG */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {showTooltip && (
                  <span className="tooltip">
                    Please enter a search term
                  </span>
                )}
              </button>
            </form>
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-dropdown">
                {suggestions.map((s, i) => (
                  <li
                    key={s.id || s.name + s.country + i}
                    onMouseDown={() => handleSuggestionClick(s)}
                    className="suggestion-item"
                    tabIndex={0}
                  >
                    {s.name}
                    {s.admin1 ? `, ${s.admin1}` : ''}
                    {s.country ? `, ${s.country}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {/* Show map overlay if enabled, else show "Pick another location" button */}
            {showMapOverlay ? (
              <div style={{ width: '75%', maxWidth: 600, marginBottom: 32 }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                  padding: '1rem',
                  marginBottom: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  <div style={{ marginBottom: 8, color: '#333', fontWeight: 500 }}>
                    Click on the map to pick a location
                  </div>
                  <GoogleMapPicker
                    pickedLocation={pickedLocation}
                    setPickedLocation={setPickedLocation}
                    apiKey={GOOGLE_API_KEY}
                  />
                  {pickedLocation && (
                    <div style={{ marginTop: 10, color: '#222', fontSize: '1.05rem' }}>
                      Picked: <b>{pickedLocation.lat.toFixed(4)}, {pickedLocation.lng.toFixed(4)}</b>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSearch}
                    style={{
                      marginTop: 16,
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0.7em 1.5em',
                      fontWeight: 600,
                      fontSize: '1.08rem',
                      cursor: pickedLocation && !loading ? 'pointer' : 'not-allowed',
                      opacity: pickedLocation && !loading ? 1 : 0.6,
                      boxShadow: '0 2px 8px #1976d233',
                      transition: 'background 0.2s',
                    }}
                    disabled={!pickedLocation || loading}
                  >
                    Search this location
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: '75%', maxWidth: 600, marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowMapOverlay(true)}
                  style={{
                    background: '#fff',
                    color: '#1976d2',
                    border: '2px solid #1976d2',
                    borderRadius: 8,
                    padding: '0.7em 1.5em',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #1976d233',
                    transition: 'background 0.2s',
                  }}
                >
                  Pick another location
                </button>
              </div>
            )}
          </>
        )}
        {/* Results */}
        <div className="results-container">
          {loading && (
            <div className="loading-text">
              Loading...
            </div>
          )}
          {error && error !== 'Unable to get info on surfing and skiing availability' && (
            <div className="error-text">
              {error}
            </div>
          )}
          {/* Show places API fallback message separately, less prominent */}
          {error === 'Unable to get info on surfing and skiing availability' && (
            <div className="places-api-warning">
              Unable to get info on surfing and skiing availability
            </div>
          )}
          {rankings && (
            <div className="rankings-card">
              <h2 className="rankings-title">
                Activity Rankings (next 7 days)
              </h2>
              <div className="rankings-info">
                <div style={{
                  color: '#666',
                  fontSize: '1.01rem',
                  marginBottom: 10,
                  textAlign: 'center',
                  width: '100%',
                  letterSpacing: 0.1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" style={{marginRight: 2, verticalAlign: 'middle'}}>
                    <circle cx="10" cy="10" r="9" fill="#bdbdbd" fillOpacity="0.18" />
                    <text x="10" y="15" textAnchor="middle" fontSize="13" fill="#888" fontWeight="bold">i</text>
                  </svg>
                  <span>Click an activity to see more info</span>
                </div>
              </div>
              {/* Show ski/surf capability info */}
              <div className="capability-info">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  color: hasSkiing === null ? '#aaa' : hasSkiing ? '#4fc3f7' : '#bbb',
                  fontWeight: 600,
                  fontSize: '1.03rem',
                }}>
                  <span style={{fontSize: 22}}>🎿</span>
                  {hasSkiing === null
                    ? `Checking skiing within ${SEARCH_RADIUS_KM}km...`
                    : hasSkiing
                      ? `Skiing nearby (within ${SEARCH_RADIUS_KM}km)`
                      : `No skiing nearby (within ${SEARCH_RADIUS_KM}km)`
                  }
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  color: hasSurfing === null ? '#aaa' : hasSurfing ? '#00bfae' : '#bbb',
                  fontWeight: 600,
                  fontSize: '1.03rem',
                }}>
                  <span style={{fontSize: 22}}>🏄‍♂️</span>
                  {hasSurfing === null
                    ? `Checking surfing within ${SEARCH_RADIUS_KM}km...`
                    : hasSurfing
                      ? `Surfing nearby (within ${SEARCH_RADIUS_KM}km)`
                      : `No surfing nearby (within ${SEARCH_RADIUS_KM}km)`
                  }
                </div>
              </div>
              <div className="activity-rankings-list">
                {rankings.map((r, idx) => {
                  const meta = activityMeta[r.activity];
                  // Grey out if skiing/surfing is not available nearby
                  const isSkiingUnavailable = r.activity === 'Skiing' && hasSkiing === false;
                  const isSurfingUnavailable = r.activity === 'Surfing' && hasSurfing === false;
                  const isUnavailable = isSkiingUnavailable || isSurfingUnavailable;
                  return (
                    <div
                      key={r.activity}
                      className={`activity-ranking-card${isUnavailable ? ' unavailable' : ''}`}
                      style={{
                        animationDelay: `${idx * 0.12}s`,
                        border: `2.5px solid ${meta.color}`,
                        boxShadow: `0 2px 12px ${meta.color}33`,
                      }}
                      onClick={() => {
                        if (!isUnavailable) setPopupActivity(r.activity);
                      }}
                      tabIndex={isUnavailable ? -1 : 0}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isUnavailable) setPopupActivity(r.activity);
                      }}
                    >
                      <div className="activity-icon">{meta.icon}</div>
                      <div className="activity-title" style={{ color: meta.color }}>
                        {r.activity}
                      </div>
                      <div className="activity-score-bar">
                        <div className="score-bar-bg">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${r.score * 10}%`,
                              background: `linear-gradient(90deg, ${meta.color} 60%, #fff0 100%)`,
                            }}
                          />
                        </div>
                        <span className="activity-score" style={{ color: meta.color }}>
                          {(isSkiingUnavailable || isSurfingUnavailable) ? 'N/A' : `${r.score}/10`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Popup overlay for best days */}
              {popupActivity && bestDays[popupActivity] && bestDays[popupActivity].length > 0 && (
                <div className="popup-overlay" onClick={() => setPopupActivity(null)}>
                  <div
                    className="popup-card"
                    style={{
                      border: `2.5px solid ${activityMeta[popupActivity].color}`,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button className="popup-close-btn" onClick={() => setPopupActivity(null)} aria-label="Close">
                      ×
                    </button>
                    <div className="popup-title" style={{ color: activityMeta[popupActivity].color }}>
                      <span className="popup-icon">{activityMeta[popupActivity].icon}</span>
                      {popupActivity}
                    </div>
                    <div className="popup-bestdays-title" style={{ color: activityMeta[popupActivity].color }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" style={{marginRight: 3, verticalAlign: 'middle'}}>
                        <circle cx="10" cy="10" r="9" fill={activityMeta[popupActivity].color} fillOpacity="0.18" />
                        <path d="M6.5 10.5l2 2 5-5" stroke={activityMeta[popupActivity].color} strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                      Best day{bestDays[popupActivity].length > 1 ? 's' : ''}
                    </div>
                    <div className="popup-bestdays-list">
                      {(() => {
                        // Sort best days by their actual score for this activity, descending
                        const dayIndices = bestDays[popupActivity];
                        // Remove unused 'scores' and 'dayData'
                        const sorted = [...dayIndices].sort((a, b) => a - b);
                        return sorted.map(i =>
                          dailyTimes && dailyTimes[i] ? (
                            <div
                              key={i}
                              style={{
                                background: `linear-gradient(90deg, ${activityMeta[popupActivity].color}22 60%, #fff0 100%)`,
                                border: `1.5px solid ${activityMeta[popupActivity].color}`,
                                borderRadius: 8,
                                padding: '0.45em 1.1em',
                                fontWeight: 500,
                                color: '#222',
                                fontSize: '1.01rem',
                                boxShadow: `0 2px 8px ${activityMeta[popupActivity].color}18`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'background 0.2s',
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 20 20" style={{marginRight: 2}}>
                                <circle cx="10" cy="10" r="8" fill={activityMeta[popupActivity].color} fillOpacity="0.22" />
                              </svg>
                              {formatDay(dailyTimes[i])}
                            </div>
                          ) : (
                            <div
                              key={i}
                              style={{
                                background: '#eee',
                                borderRadius: 8,
                                padding: '0.45em 1.1em',
                                fontWeight: 500,
                                color: '#888',
                                fontSize: '1.01rem',
                              }}
                            >
                              Day {i + 1}
                            </div>
                          )
                        );
                      })()}
                    </div>
                    {/* Show the reason for the selected activity in the popup */}
                    <div style={{
                      color: '#444',
                      fontSize: '1.01rem',
                      textAlign: 'center',
                      marginTop: 10,
                      animation: 'fadeIn 1s',
                      fontWeight: 500,
                    }}>
                      {rankings.find(r => r.activity === popupActivity)?.reason}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Animations */}
    </div>
  );
};

export default App;
