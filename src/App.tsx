import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { getActivityRankings, getBestDaysForActivity } from './logic/getActivityRankings';
import GoogleMapPicker from './components/GoogleMapPicker';
import MoreTime from './components/MoreTime';
import { activityMeta, formatDay, Activity } from './utils/activityUtils';
import { getLatLngFromGeocode } from './utils/locationHelpers';
import { fetchGeocode, fetchNearbyActivities, fetchWeather } from './utils/networking';
import { ACTIVITIES, SEARCH_RADIUS_KM, TEXT } from './utils/constants';

interface Ranking {
  activity: Activity;
  score: number;
  reason: string;
}

const App: React.FC = () => {
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

  // Suggestion fetching
  useEffect(() => {
    if (searchText.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchText)}&count=5`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      })
      .catch(() => {
        setSuggestions([]);
        setShowSuggestions(false);
      });
    return () => controller.abort();
  }, [searchText]);

  // Handlers
  const handleSearch = useCallback(async (e: React.MouseEvent | React.FormEvent | any) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

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
      if (inputMode === 'map' && pickedLocation) {
        lat = pickedLocation.lat;
        lng = pickedLocation.lng;
        cityName = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        country = '';
      } else {
        const geoData = await fetchGeocode(searchText, GOOGLE_API_KEY);
        const geo = getLatLngFromGeocode(geoData, searchText);
        if (!geo) {
          setError('City not found.');
          setLoading(false);
          return;
        }
        ({ lat, lng, name: cityName, country } = geo);
      }

      try {
        const { skiRes, surfRes } = await fetchNearbyActivities(GOOGLE_API_KEY, lat, lng);
        setHasSkiing(!!(skiRes && skiRes.places && skiRes.places.length > 0));
        setHasSurfing(!!(surfRes && surfRes.places && surfRes.places.length > 0));
      } catch {
        setHasSkiing(null);
        setHasSurfing(null);
        placesApiFailed = true;
      }

      const weatherData = await fetchWeather(lat, lng);
      if (!weatherData.daily) {
        setError('Weather data not available.');
        setLoading(false);
        return;
      }
      setDailyTimes(weatherData.daily.time || []);

      const newRankings = getActivityRankings(weatherData.daily, country, cityName);
      setRankings(newRankings);

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
  }, [inputMode, searchText, pickedLocation, GOOGLE_API_KEY]);

  const handleSuggestionClick = useCallback((suggestion: any) => {
    setSearchText(suggestion.name + (suggestion.country ? `, ${suggestion.country}` : ''));
    setShowSuggestions(false);
    setSuggestions([]);
    setRankings(null); // Hide rankings when picking a suggestion
    // Trigger search when a suggestion is selected
    setTimeout(() => {
      // Only trigger if in city mode
      if (inputMode === 'city') {
        handleSearch({ preventDefault: () => {} } as any);
      }
    }, 0);
  }, [inputMode, handleSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (showTooltip) setShowTooltip(false);
    setShowSuggestions(true);
    setRankings(null);
  }, [showTooltip]);

  // Popup rendering
  const renderPopup = () => {
    if (!popupActivity || !bestDays[popupActivity] || bestDays[popupActivity].length === 0) return null;
    const meta = activityMeta[popupActivity];
    const sorted = [...bestDays[popupActivity]].sort((a, b) => a - b);
    return (
      <div className="popup-overlay" onClick={() => setPopupActivity(null)}>
        <div
          className="popup-card"
          style={{ border: `2.5px solid ${meta.color}` }}
          onClick={e => e.stopPropagation()}
        >
          <button className="popup-close-btn" onClick={() => setPopupActivity(null)} aria-label="Close">
            ×
          </button>
          <div className="popup-title" style={{ color: meta.color }}>
            <span className="popup-icon">{meta.icon}</span>
            {popupActivity}
          </div>
          <div className="popup-bestdays-title" style={{ color: meta.color }}>
            <svg width="20" height="20" viewBox="0 0 20 20" style={{marginRight: 3, verticalAlign: 'middle'}}>
              <circle cx="10" cy="10" r="9" fill={meta.color} fillOpacity="0.18" />
              <path d="M6.5 10.5l2 2 5-5" stroke={meta.color} strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            Best day{sorted.length > 1 ? 's' : ''}
          </div>
          <div className="popup-bestdays-list">
            {sorted.map(i =>
              dailyTimes && dailyTimes[i] ? (
                <div
                  key={i}
                  style={{
                    background: `linear-gradient(90deg, ${meta.color}22 60%, #fff0 100%)`,
                    border: `1.5px solid ${meta.color}`,
                    borderRadius: 8,
                    padding: '0.45em 1.1em',
                    fontWeight: 500,
                    color: '#222',
                    fontSize: '1.01rem',
                    boxShadow: `0 2px 8px ${meta.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" style={{marginRight: 2}}>
                    <circle cx="10" cy="10" r="8" fill={meta.color} fillOpacity="0.22" />
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
            )}
          </div>
          <div className="popup-reason">
            {rankings?.find(r => r.activity === popupActivity)?.reason}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App app-background">
      <MoreTime />
      <div className="background-overlay" />
        <img
          src={require('./assets/images/logo.png')}
          alt="ClimaGo Logo"
          className="climago-logo"
          style={{
            width: 250,
            height: 250,
            objectFit: 'contain',
            margin: '32px auto 0 auto',
            display: 'block',
            filter: 'drop-shadow(0 2px 8px #0002)'
          }}
        />
        <div className="main-content">
        <div className="input-toggle-container">
          <label
            className={`input-toggle ${inputMode === 'city' ? 'active-city' : ''}`}
            htmlFor="type-city-radio"
          >
            <span className="input-toggle-icon city">🏙️</span>
            Type city
            <input
              id="type-city-radio"
              type="radio"
              checked={inputMode === 'city'}
              onChange={() => { setInputMode('city'); setShowMapOverlay(true); setRankings(null); }}
              style={{ display: 'none' }}
            />
          </label>
          <label
            className={`input-toggle ${inputMode === 'map' ? 'active-map' : ''}`}
            htmlFor="show-map-radio"
          >
            <span className="input-toggle-icon map">🗺️</span>
            Show map
            <input
              id="show-map-radio"
              type="radio"
              checked={inputMode === 'map'}
              onChange={() => { setInputMode('map'); setShowMapOverlay(true); setRankings(null); }}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {inputMode === 'city' ? (
          <div className="city-input-container">
            <form
              className="city-input-form"
              onSubmit={e => {
                e.preventDefault();
                handleSearch(e);
              }}
              autoComplete="off"
            >
              <input
                type="text"
                placeholder={TEXT.SEARCH_PLACEHOLDER}
                value={searchText}
                onChange={handleInputChange}
                className="city-input"
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch(e as any);
                  }
                }}
              />
              <button
                type="submit"
                onClick={handleSearch}
                className="search-btn"
                aria-label="Search"
                disabled={loading}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {showTooltip && (
                  <span className="tooltip">
                    {TEXT.TOOLTIP_ENTER_SEARCH}
                  </span>
                )}
              </button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-dropdown">
                {suggestions.map((s, i) => (
                  <li
                    key={s.id || s.name + s.country + i}
                    onMouseDown={() => handleSuggestionClick(s)}
                    className="suggestion-item"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSuggestionClick(s);
                      }
                    }}
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
            {showMapOverlay ? (
              <div style={{ width: '75%', maxWidth: 600, marginBottom: 32 }}>
                <div className="map-picker-container">
                  <div className="map-picker-title">
                    {TEXT.CLICK_ON_MAP}
                  </div>
                  <GoogleMapPicker
                    pickedLocation={pickedLocation}
                    setPickedLocation={setPickedLocation}
                    apiKey={GOOGLE_API_KEY}
                  />
                  {pickedLocation && (
                    <div className="map-picker-picked">
                      {TEXT.PICKED(pickedLocation.lat, pickedLocation.lng)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="map-picker-search-btn"
                    disabled={!pickedLocation || loading}
                  >
                    {TEXT.SEARCH_THIS_LOCATION}
                  </button>
                </div>
              </div>
            ) : (
              <div className="map-picker-another">
                <button
                  type="button"
                  onClick={() => setShowMapOverlay(true)}
                  className="map-picker-another-btn"
                >
                  {TEXT.PICK_ANOTHER_LOCATION}
                </button>
              </div>
            )}
          </>
        )}
        <div className="results-container">
          {loading && <div className="loading-text">{TEXT.LOADING}</div>}
          {error && error !== TEXT.UNABLE_TO_GET_SURF_SKI && (
            <div className="error-text">{error}</div>
          )}
          {error === TEXT.UNABLE_TO_GET_SURF_SKI && (
            <div className="places-api-warning">
              {TEXT.UNABLE_TO_GET_SURF_SKI}
            </div>
          )}
          {rankings && (
            <div className="rankings-card">
              <h2 className="rankings-title">{TEXT.ACTIVITY_RANKINGS_TITLE}</h2>
              <div className="rankings-info">
                <svg width="18" height="18" viewBox="0 0 20 20" style={{marginRight: 2, verticalAlign: 'middle'}}>
                  <circle cx="10" cy="10" r="9" fill="#bdbdbd" fillOpacity="0.18" />
                  <text x="10" y="15" textAnchor="middle" fontSize="13" fill="#888" fontWeight="bold">i</text>
                </svg>
                <span>{TEXT.CLICK_ACTIVITY_INFO}</span>
              </div>
              <div className="capability-info">
                <div className={`capability-skiing${hasSkiing === false ? ' unavailable' : ''}`}>
                  <span style={{fontSize: 22}}>🎿</span>
                  <span className="capability-activity-full skiing">
                    {hasSkiing === null
                      ? TEXT.CHECKING_SKIING(SEARCH_RADIUS_KM)
                      : hasSkiing
                        ? TEXT.SKIING_NEARBY(SEARCH_RADIUS_KM)
                        : TEXT.NO_SKIING_NEARBY(SEARCH_RADIUS_KM)
                    }
                  </span>
                </div>
                <div className={`capability-surfing${hasSurfing === false ? ' unavailable' : ''}`}>
                  <span style={{fontSize: 22}}>🏄‍♂️</span>
                  <span className="capability-activity-full surfing">
                    {hasSurfing === null
                      ? TEXT.CHECKING_SURFING(SEARCH_RADIUS_KM)
                      : hasSurfing
                        ? TEXT.SURFING_NEARBY(SEARCH_RADIUS_KM)
                        : TEXT.NO_SURFING_NEARBY(SEARCH_RADIUS_KM)
                    }
                  </span>
                </div>
              </div>
              <div className="activity-rankings-list">
                {rankings.map((r, idx) => {
                  const meta = activityMeta[r.activity];
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
              {renderPopup()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
