export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PresetCity {
  id: string;
  label: string;
  locality: string;
  region: string;
  coords: GeoPoint;
}

export interface PlaceItem {
  id: string;
  name: string;
  brandName: string | null;
  category: string | null;
  address: string | null;
  locality: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  phones: string[] | null;
  websites: string[] | null;
  socials: string[] | null;
  operatingStatus: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
}

export interface NearbyPlacesResponse {
  items: PlaceItem[];
  meta: {
    lat: number;
    lng: number;
    radiusMeters: number;
    count: number;
    limit: number;
    offset: number;
  };
}

export interface SearchPlacesResponse {
  items: PlaceItem[];
  meta: {
    q: string | null;
    locality: string | null;
    region: string | null;
    category: string | null;
    count: number;
    limit: number;
    offset: number;
  };
}

export interface ApiTrace<T = unknown> {
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  data: T | null;
  errorMessage: string | null;
}

