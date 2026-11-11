import { reactive } from 'vue';
import type { GeoPoint, PresetCity } from '../types/places';

const STORAGE_KEYS = {
  apiBaseUrl: 'creds_playground_api_url',
  mapboxToken: 'creds_playground_mapbox_token',
  mapTheme: 'creds_playground_map_theme',
} as const;

export const PRESET_CITIES: PresetCity[] = [
  {
    id: 'brickell',
    label: 'Brickell, Miami',
    locality: 'Miami',
    region: 'FL',
    coords: { lat: 25.7617, lng: -80.1918 },
  },
  {
    id: 'wynwood',
    label: 'Wynwood, Miami',
    locality: 'Miami',
    region: 'FL',
    coords: { lat: 25.8011, lng: -80.199 },
  },
  {
    id: 'coral-gables',
    label: 'Coral Gables',
    locality: 'Coral Gables',
    region: 'FL',
    coords: { lat: 25.7215, lng: -80.2684 },
  },
  {
    id: 'orlando',
    label: 'Orlando Downtown',
    locality: 'Orlando',
    region: 'FL',
    coords: { lat: 28.5383, lng: -81.3792 },
  },
  {
    id: 'tampa',
    label: 'Tampa Downtown',
    locality: 'Tampa',
    region: 'FL',
    coords: { lat: 27.9506, lng: -82.4572 },
  },
];

export const COMMON_CATEGORIES = [
  'gym',
  'fitness_instructor',
  'yoga_studio',
  'pilates_studio',
  'boxing_studio',
  'martial_arts_club',
  'tennis_court',
  'swimming_pool',
  'sports_club',
] as const;

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignorar errores de almacenamiento en modo privado restringido
  }
}

const defaultApiUrl = (
  import.meta.env.VITE_API_BASE_URL || 'https://api-dev.getcreds.co'
).replace(/\/+$/, '');

const defaultMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();

const state = reactive({
  apiBaseUrl: readStored(STORAGE_KEYS.apiBaseUrl, defaultApiUrl),
  mapboxToken: readStored(STORAGE_KEYS.mapboxToken, defaultMapboxToken),
  mapTheme: (readStored(STORAGE_KEYS.mapTheme, 'dark') === 'streets'
    ? 'streets'
    : 'dark') as 'dark' | 'streets',
  referencePoint: { ...PRESET_CITIES[0].coords } as GeoPoint,
});

export function usePlaygroundConfig() {
  function setApiBaseUrl(url: string) {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean) return;
    state.apiBaseUrl = clean;
    writeStored(STORAGE_KEYS.apiBaseUrl, clean);
  }

  function setMapboxToken(token: string) {
    const clean = token.trim();
    state.mapboxToken = clean;
    writeStored(STORAGE_KEYS.mapboxToken, clean);
  }

  function setMapTheme(theme: 'dark' | 'streets') {
    state.mapTheme = theme;
    writeStored(STORAGE_KEYS.mapTheme, theme);
  }

  function setReferencePoint(point: GeoPoint) {
    state.referencePoint = {
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
    };
  }

  return {
    config: state,
    setApiBaseUrl,
    setMapboxToken,
    setMapTheme,
    setReferencePoint,
  };
}

