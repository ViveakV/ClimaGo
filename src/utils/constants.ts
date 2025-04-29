import { Activity } from './activityUtils';

export const ACTIVITIES: Activity[] = [
  'Skiing',
  'Surfing',
  'Outdoor sightseeing',
  'Indoor sightseeing',
];

export const SEARCH_RADIUS_KM = 50;
export const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000;

export const TEXT = {
  SEARCH_PLACEHOLDER: "Search...",
  TOOLTIP_ENTER_SEARCH: "Please enter a search term",
  CITY_NOT_FOUND: "City not found.",
  WEATHER_NOT_AVAILABLE: "Weather data not available.",
  FAILED_TO_FETCH: "Failed to fetch data.",
  LOADING: "Loading...",
  ACTIVITY_RANKINGS_TITLE: "Activity Rankings (next 7 days)",
  CLICK_ACTIVITY_INFO: "Click an activity to see more info",
  CHECKING_SKIING: (radius: number) => `Checking skiing within ${radius}km...`,
  SKIING_NEARBY: (radius: number) => `Skiing nearby (within ${radius}km)`,
  NO_SKIING_NEARBY: (radius: number) => `No skiing nearby (within ${radius}km)`,
  CHECKING_SURFING: (radius: number) => `Checking surfing within ${radius}km...`,
  SURFING_NEARBY: (radius: number) => `Surfing nearby (within ${radius}km)`,
  NO_SURFING_NEARBY: (radius: number) => `No surfing nearby (within ${radius}km)`,
  BEST_DAY: "Best day",
  BEST_DAYS: "Best days",
  DAY: (i: number) => `Day ${i + 1}`,
  UNABLE_TO_GET_SURF_SKI: "Unable to get info on surfing and skiing availability",
  PICKED: (lat: number, lng: number) => `Picked: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  PICK_ANOTHER_LOCATION: "Pick another location",
  CLICK_ON_MAP: "Click on the map to pick a location",
  SEARCH_THIS_LOCATION: "Search this location",

  MORETIME_IF_I_HAD: "If I had more time...",
  MORETIME_PASSWORD_PLACEHOLDER: "Enter password",
  MORETIME_SUBMIT: "Submit",
  MORETIME_WRONG_PASSWORD: "Wrong password",
  MORETIME_FEATURES_TITLE: "If I had more time...",
  MORETIME_FEATURES_DESC: "Here are some additional features and improvements I would add:",
  
  FEATURES: [
    { icon: '📱', text: 'Mobile-friendly PWA with offline support' },
    { icon: '🗺️', text: 'More detailed map overlays (ski slopes, surf spots, POIs)' },
    { icon: '🧑‍🤝‍🧑', text: 'Social sharing and trip collaboration' },
    { icon: '🧠', text: 'AI-powered personalized recommendations' },
    { icon: '🌦️', text: 'Hourly weather and real-time updates' },
    { icon: '🗣️', text: 'Multi-language support' },
    { icon: '💬', text: 'User reviews and tips for each activity/location & trip bookings integrations' },
    { icon: '🎨', text: 'More themes and accessibility fixes' },
    { icon: '🗂️', text: 'Fix the best days logic so order days in order of which days are better for the selected activity' },
    { icon: '📱', text: 'Fix mobile styling' },
    { icon: '🔔', text: 'Subscribe to location and activity to be notifed when next best day comes along' },
  ],
};
