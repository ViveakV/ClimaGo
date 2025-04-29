import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import background from './assets/images/background.png';
import { getActivityRankings, getBestDaysForActivity } from './logic/getActivityRankings';
import GoogleMapPicker from './components/GoogleMapPicker';
import MoreTimeModal from './components/MoreTimeModal';
import { activityMeta, formatDay, Activity } from './utils/activityUtils';

interface Ranking {
  activity: Activity;
  score: number;
  reason: string;
}

const activities: Activity[] = [
  'Skiing',
  'Surfing',
  'Outdoor sightseeing',
  'Indoor sightseeing',
];

const App: React.FC = () => {
  const [useMapInput, setUseMapInput] = useState(false); // Add state to toggle map input
  const [search, setSearch] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState<Ranking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bestDays, setBestDays] = useState<Record<Activity, number[]>>({} as any);
  const [dailyTimes, setDailyTimes] = useState<string[]>([]); // <-- add this state
  const [popupActivity, setPopupActivity] = useState<Activity | null>(null);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSkiing, setHasSkiing] = useState<boolean | null>(null);
  const [hasSurfing, setHasSurfing] = useState<boolean | null>(null);
  const [showMapOverlay, setShowMapOverlay] = useState(true); // controls map overlay visibility
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);


  const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY as string;
  const SEARCH_RADIUS_KM = 50;
  const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000;

  // Fetch suggestions as user types
  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=5`,
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
  }, [search]);

  const handleSuggestionClick = (suggestion: any) => {
    setSearch(suggestion.name + (suggestion.country ? `, ${suggestion.country}` : ''));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleButtonClick = async (e: React.MouseEvent) => {
    // Only require search input if not using map
    if (!useMapInput && !search.trim()) {
      e.preventDefault();
      setShowTooltip(true);
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = setTimeout(() => setShowTooltip(false), 2000);
      return;
    }
    // In map mode, require a picked location
    if (useMapInput && !pickedLocation) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRankings(null);
    setHasSkiing(null);
    setHasSurfing(null);
    let placesApiFailed = false;
    try {
      let lat: number, lng: number, name: string, country: string;
      if (useMapInput && pickedLocation) {
        lat = pickedLocation.lat;
        lng = pickedLocation.lng;
        name = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        country = '';
      } else {
        // 1. Geocode city name to lat/lon using Google Geocoding API
        const address = encodeURIComponent(search.trim());
        if (!address) {
          setError('Please enter a valid city name.');
          setLoading(false);
          return;
        }
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`
        );
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          setError('City not found.');
          setLoading(false);
          return;
        }
        lat = typeof geoData.results[0].geometry.location.lat === 'string'
          ? parseFloat(geoData.results[0].geometry.location.lat)
          : geoData.results[0].geometry.location.lat;
        lng = typeof geoData.results[0].geometry.location.lng === 'string'
          ? parseFloat(geoData.results[0].geometry.location.lng)
          : geoData.results[0].geometry.location.lng;
        name = geoData.results[0].address_components?.[0]?.long_name || search;
        const countryComp = geoData.results[0].address_components?.find((c: any) => c.types.includes('country'));
        country = countryComp ? countryComp.long_name : '';
      }

      // 2. Google Places Nearby Search for ski_resort and beach using correct POST API and headers
      try {
        const latitude = lat;
        const longitude = lng;
        const skiUrl = `https://places.googleapis.com/v1/places:searchNearby?key=${GOOGLE_API_KEY}`;
        const surfUrl = `https://places.googleapis.com/v1/places:searchNearby?key=${GOOGLE_API_KEY}`;
        const skiBody = {
          includedTypes: ['ski_resort'],
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: SEARCH_RADIUS_METERS
            }
          }
        };
        const surfBody = {
          includedTypes: ['beach'],
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: SEARCH_RADIUS_METERS
            }
          }
        };
        const commonHeaders = {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.name,places.types'
        };
        const [skiRes, surfRes] = await Promise.all([
          fetch(skiUrl, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify(skiBody)
          }).then(r => r.ok ? r.json() : null),
          fetch(surfUrl, {
            method: 'POST',
            headers: commonHeaders,
            body: JSON.stringify(surfBody)
          }).then(r => r.ok ? r.json() : null)
        ]);
        // Defensive: check for null/undefined responses
        setHasSkiing(skiRes && skiRes.places && skiRes.places.length > 0);
        setHasSurfing(surfRes && surfRes.places && surfRes.places.length > 0);
      } catch (placesErr) {
        setHasSkiing(null);
        setHasSurfing(null);
        placesApiFailed = true;
      }

      // 3. Fetch 7-day weather forecast (still use Open-Meteo)
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

      // 4. Rank activities based on weather
      const rankings = getActivityRankings(weatherData.daily, country, name);

      // 5. Find best days for each activity
      const bestDaysObj: Record<Activity, number[]> = {} as any;
      activities.forEach(activity => {
        bestDaysObj[activity] = getBestDaysForActivity(weatherData.daily, activity, country, name);
      });
      setBestDays(bestDaysObj);
      setRankings(rankings);
      setLoading(false);
      if (useMapInput) setShowMapOverlay(false);
      if (placesApiFailed) {
        setError('Unable to get info on surfing and skiing availability');
      }
    } catch (err) {
      setError('Failed to fetch data.');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (showTooltip) setShowTooltip(false);
    setShowSuggestions(true);
  };

  const [showMoreTimePrompt, setShowMoreTimePrompt] = useState(false);
  const [showMoreTimeOverlay, setShowMoreTimeOverlay] = useState(false);
  const [moreTimePassword, setMoreTimePassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);

  return (
    <div
      className="App"
      style={{
        position: 'relative',
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      {/* "If I had more time" icon in top right */}
      <MoreTimeModal
        showPrompt={showMoreTimePrompt}
        setShowPrompt={setShowMoreTimePrompt}
        showOverlay={showMoreTimeOverlay}
        setShowOverlay={setShowMoreTimeOverlay}
        password={moreTimePassword}
        setPassword={setMoreTimePassword}
        wrongPassword={wrongPassword}
        setWrongPassword={setWrongPassword}
      />
      {/* Password prompt popup */}
      {showMoreTimePrompt && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.32)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s',
          }}
          onClick={() => setShowMoreTimePrompt(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 8px 32px #0002',
              padding: '2em 2.5em 1.5em 2.5em',
              minWidth: 260,
              minHeight: 80,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeInUp 0.25s',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMoreTimePrompt(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 20,
                color: '#888',
                cursor: 'pointer',
                zIndex: 10,
                padding: 0,
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div style={{ fontWeight: 700, fontSize: '1.13rem', marginBottom: 12, color: '#ffd600', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#fffde7" stroke="#ffd600" strokeWidth="2"/>
                <path d="M9 17h6M10 20h4" stroke="#ffd600" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 6a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z" stroke="#ffd600" strokeWidth="1.5" fill="#fffde7"/>
              </svg>
              If I had more time...
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (moreTimePassword === 'Viveak') {
                  setShowMoreTimePrompt(false);
                  setShowMoreTimeOverlay(true);
                  setWrongPassword(false);
                } else {
                  setWrongPassword(true);
                  setTimeout(() => setShowMoreTimePrompt(false), 1200);
                }
              }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <input
                type="password"
                placeholder="Enter password"
                value={moreTimePassword}
                onChange={e => { setMoreTimePassword(e.target.value); setWrongPassword(false); }}
                style={{
                  padding: '0.7em 1em',
                  borderRadius: 8,
                  border: wrongPassword ? '2px solid #e53935' : '1.5px solid #ffd600',
                  fontSize: '1.07rem',
                  marginBottom: 10,
                  outline: 'none',
                  width: 180,
                  transition: 'border 0.2s',
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{
                  background: '#ffd600',
                  color: '#222',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.6em 1.3em',
                  fontWeight: 600,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #ffd60033',
                  transition: 'background 0.2s',
                }}
              >
                Submit
              </button>
            </form>
            {wrongPassword && (
              <div style={{ color: '#e53935', marginTop: 8, fontWeight: 500, fontSize: '1.01rem' }}>
                Wrong password
              </div>
            )}
          </div>
        </div>
      )}
      {/* Overlay with additional ideas */}
      {showMoreTimeOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.32)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s',
          }}
          onClick={() => setShowMoreTimeOverlay(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 32px #0002',
              padding: '2.5em 2.7em 2em 2.7em',
              minWidth: 320,
              minHeight: 120,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeInUp 0.25s',
              maxWidth: '90vw',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMoreTimeOverlay(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#888',
                cursor: 'pointer',
                zIndex: 10,
                padding: 0,
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div style={{ fontWeight: 700, color: '#ffd600', fontSize: '1.22rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#fffde7" stroke="#ffd600" strokeWidth="2"/>
                <path d="M9 17h6M10 20h4" stroke="#ffd600" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 6a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z" stroke="#ffd600" strokeWidth="1.5" fill="#fffde7"/>
              </svg>
              If I had more time...
            </div>
            <div style={{ color: '#444', fontSize: '1.09rem', marginBottom: 12, textAlign: 'center', fontWeight: 500 }}>
              Here are some additional features and improvements I would add:
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                maxWidth: 420,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {[
                { icon: '🌍', text: 'Multi-day trip planner with route and weather optimization' },
                { icon: '📱', text: 'Mobile-friendly PWA with offline support' },
                { icon: '🔔', text: 'Push/email notifications for best activity days' },
                { icon: '🗺️', text: 'More detailed map overlays (ski slopes, surf spots, POIs)' },
                { icon: '🧑‍🤝‍🧑', text: 'Social sharing and trip collaboration' },
                { icon: '🧠', text: 'AI-powered personalized recommendations' },
                { icon: '🌦️', text: 'Hourly weather and real-time updates' },
                { icon: '🗣️', text: 'Multi-language support' },
                { icon: '💬', text: 'User reviews and tips for each activity/location' },
                { icon: '🎨', text: 'More themes and accessibility options' },
              ].map(({ icon, text }, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, #fffde7 60%, #ffd60018 100%)',
                    borderRadius: 10,
                    boxShadow: '0 1px 6px #ffd60022',
                    padding: '0.7em 1.1em',
                    fontWeight: 500,
                    color: '#222',
                    fontSize: '1.05rem',
                    gap: 14,
                    borderLeft: '4px solid #ffd600',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    fontSize: 22,
                    marginRight: 6,
                    filter: 'drop-shadow(0 2px 2px #ffd60033)'
                  }}>{icon}</span>
                  <span style={{ flex: 1 }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', // 50% overlay
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
        }}
      >
        {/* Animated, themed toggle */}
        <div
          style={{
            marginBottom: 28,
            display: 'flex',
            gap: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.13)',
            borderRadius: 18,
            boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            padding: 4,
            position: 'relative',
            width: 340,
          }}
        >
          {/* Type city option */}
          <label
            style={{
              flex: 1,
              cursor: 'pointer',
              padding: '1.1em 0.5em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '1.13rem',
              color: !useMapInput ? '#1976d2' : '#555',
              background: !useMapInput ? 'rgba(255,255,255,0.95)' : 'transparent',
              borderRadius: 14,
              boxShadow: !useMapInput ? '0 2px 12px #1976d233' : 'none',
              transition: 'all 0.25s cubic-bezier(.4,2,.6,1)',
              transform: !useMapInput ? 'scale(1.06)' : 'scale(1)',
              marginRight: 2,
              position: 'relative',
              zIndex: 2,
              outline: !useMapInput ? '2.5px solid #1976d2' : 'none',
            }}
            htmlFor="type-city-radio"
          >
            <span style={{ fontSize: 26, marginBottom: 2, transition: 'filter 0.2s', filter: !useMapInput ? 'drop-shadow(0 2px 2px #1976d2aa)' : 'none' }}>🏙️</span>
            Type city
            <input
              id="type-city-radio"
              type="radio"
              checked={!useMapInput}
              onChange={() => { setUseMapInput(false); setShowMapOverlay(true); }}
              style={{ display: 'none' }}
            />
          </label>
          {/* Show map option */}
          <label
            style={{
              flex: 1,
              cursor: 'pointer',
              padding: '1.1em 0.5em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '1.13rem',
              color: useMapInput ? '#00bfae' : '#555',
              background: useMapInput ? 'rgba(255,255,255,0.95)' : 'transparent',
              borderRadius: 14,
              boxShadow: useMapInput ? '0 2px 12px #00bfae33' : 'none',
              transition: 'all 0.25s cubic-bezier(.4,2,.6,1)',
              transform: useMapInput ? 'scale(1.06)' : 'scale(1)',
              marginLeft: 2,
              position: 'relative',
              zIndex: 2,
              outline: useMapInput ? '2.5px solid #00bfae' : 'none',
            }}
            htmlFor="show-map-radio"
          >
            <span style={{ fontSize: 26, marginBottom: 2, transition: 'filter 0.2s', filter: useMapInput ? 'drop-shadow(0 2px 2px #00bfaeaa)' : 'none' }}>🗺️</span>
            Show map
            <input
              id="show-map-radio"
              type="radio"
              checked={useMapInput}
              onChange={() => { setUseMapInput(true); setShowMapOverlay(true); }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {/* City input or map picker */}
        {!useMapInput ? (
          <div style={{ width: '75%', maxWidth: 600, position: 'relative', marginBottom: 32 }}>
            <form
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                borderRadius: 32,
                boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                padding: '0.5rem 1rem',
              }}
              onSubmit={e => e.preventDefault()}
              autoComplete="off"
            >
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={handleInputChange}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '1.25rem',
                  background: 'transparent',
                  padding: '0.75rem 1rem',
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              <button
                type="submit"
                onClick={handleButtonClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: 8,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
                aria-label="Search"
                disabled={loading}
              >
                {/* Magnifying glass SVG */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {showTooltip && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2.2rem',
                      right: 0,
                      background: '#222',
                      color: '#fff',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 6,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      zIndex: 10,
                    }}
                  >
                    Please enter a search term
                  </span>
                )}
              </button>
            </form>
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  borderRadius: '0 0 12px 12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  zIndex: 20,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.id || s.name + s.country + i}
                    onMouseDown={() => handleSuggestionClick(s)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      cursor: 'pointer',
                      borderBottom: i !== suggestions.length - 1 ? '1px solid #eee' : 'none',
                      background: '#fff',
                    }}
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
                    onClick={handleButtonClick}
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
        <div style={{ width: '75%', maxWidth: 600 }}>
          {loading && (
            <div style={{ color: '#fff', textAlign: 'center', marginTop: 24 }}>
              Loading...
            </div>
          )}
          {error && error !== 'Unable to get info on surfing and skiing availability' && (
            <div style={{ color: '#ffb3b3', textAlign: 'center', marginTop: 24 }}>
              {error}
            </div>
          )}
          {/* Show places API fallback message separately, less prominent */}
          {error === 'Unable to get info on surfing and skiing availability' && (
            <div style={{ color: '#fbc02d', textAlign: 'center', marginTop: 12, fontWeight: 500 }}>
              Unable to get info on surfing and skiing availability
            </div>
          )}
          {rankings && (
            <div
              style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                alignItems: 'center',
                animation: 'fadeIn 0.7s',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 16, color: '#222', textAlign: 'center' }}>
                Activity Rankings (next 7 days)
              </h2>
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
              {/* Show ski/surf capability info */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                gap: 24,
                marginBottom: 8,
                marginTop: 2,
              }}>
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
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                justifyContent: 'center',
                width: '100%',
              }}>
                {rankings.map((r, idx) => {
                  const meta = activityMeta[r.activity];
                  // Grey out if skiing/surfing is not available nearby
                  const isSkiingUnavailable = r.activity === 'Skiing' && hasSkiing === false;
                  const isSurfingUnavailable = r.activity === 'Surfing' && hasSurfing === false;
                  const isUnavailable = isSkiingUnavailable || isSurfingUnavailable;
                  return (
                    <div
                      key={r.activity}
                      style={{
                        flex: '1 1 220px',
                        minWidth: 200,
                        maxWidth: 260,
                        background: '#fff',
                        borderRadius: 18,
                        boxShadow: `0 2px 12px ${meta.color}33`,
                        padding: '1.2rem 1rem 1.5rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        animation: 'fadeInUp 0.5s',
                        animationDelay: `${idx * 0.12}s`,
                        animationFillMode: 'both',
                        border: `2.5px solid ${meta.color}`,
                        transition: 'transform 0.2s',
                        opacity: isUnavailable ? 0.5 : 1,
                        filter: isUnavailable ? 'grayscale(0.7)' : undefined,
                        cursor: isUnavailable ? 'not-allowed' : 'pointer',
                        pointerEvents: isUnavailable ? 'none' : 'auto',
                        userSelect: isUnavailable ? 'none' : 'auto',
                      }}
                      onClick={() => {
                        if (!isUnavailable) setPopupActivity(r.activity);
                      }}
                      tabIndex={isUnavailable ? -1 : 0}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isUnavailable) setPopupActivity(r.activity);
                      }}
                    >
                      <div style={{
                        fontSize: 44,
                        marginBottom: 8,
                        filter: 'drop-shadow(0 2px 2px #0001)'
                      }}>
                        {meta.icon}
                      </div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '1.15rem',
                        color: meta.color,
                        marginBottom: 6,
                        textAlign: 'center',
                        letterSpacing: 0.2,
                      }}>
                        {r.activity}
                      </div>
                      <div style={{
                        width: '100%',
                        margin: '10px 0 16px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <div style={{
                          flex: 1,
                          height: 10,
                          background: '#eee',
                          borderRadius: 8,
                          overflow: 'hidden',
                          position: 'relative',
                        }}>
                          <div style={{
                            width: `${r.score * 10}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${meta.color} 60%, #fff0 100%)`,
                            borderRadius: 8,
                            transition: 'width 0.7s cubic-bezier(.4,2,.6,1)',
                          }} />
                        </div>
                        <span style={{
                          fontWeight: 600,
                          color: meta.color,
                          fontSize: '1.1rem',
                          minWidth: 32,
                          textAlign: 'right',
                        }}>
                          {(isSkiingUnavailable || isSurfingUnavailable) ? 'N/A' : `${r.score}/10`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Popup overlay for best days */}
              {popupActivity && bestDays[popupActivity] && bestDays[popupActivity].length > 0 && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.32)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s',
                  }}
                  onClick={() => setPopupActivity(null)}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      boxShadow: '0 8px 32px #0002',
                      padding: '2.2em 2.5em 2em 2.5em',
                      minWidth: 260,
                      minHeight: 120,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      border: `2.5px solid ${activityMeta[popupActivity].color}`,
                      animation: 'fadeInUp 0.25s',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setPopupActivity(null)}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 14,
                        background: 'none',
                        border: 'none',
                        fontSize: 22,
                        color: '#888',
                        cursor: 'pointer',
                        zIndex: 10,
                        padding: 0,
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                    <div style={{
                      fontWeight: 700,
                      color: activityMeta[popupActivity].color,
                      fontSize: '1.18rem',
                      marginBottom: 10,
                      letterSpacing: 0.2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <span style={{fontSize: 28}}>{activityMeta[popupActivity].icon}</span>
                      {popupActivity}
                    </div>
                    <div style={{
                      fontWeight: 600,
                      color: activityMeta[popupActivity].color,
                      fontSize: '1.08rem',
                      marginBottom: 8,
                      letterSpacing: 0.2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" style={{marginRight: 3, verticalAlign: 'middle'}}>
                        <circle cx="10" cy="10" r="9" fill={activityMeta[popupActivity].color} fillOpacity="0.18" />
                        <path d="M6.5 10.5l2 2 5-5" stroke={activityMeta[popupActivity].color} strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                      Best day{bestDays[popupActivity].length > 1 ? 's' : ''}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      justifyContent: 'center',
                      marginBottom: 6,
                    }}>
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
      <style>
        {`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px);}
          to { opacity: 1; transform: translateY(0);}
        }
        @keyframes fadeIn {
          from { opacity: 0;}
          to { opacity: 1;}
        }
        `}
      </style>
    </div>
  );
};

export default App;
