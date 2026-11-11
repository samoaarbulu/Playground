import type {
  ApiTrace,
  NearbyPlacesResponse,
  SearchPlacesResponse,
} from '../types/places';

export interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius: number;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SearchQueryParams {
  q?: string;
  locality?: string;
  region?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
  offset?: number;
}

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const url = new URL(`${cleanBase}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function executeGet<T>(url: string, parseAsJson = true): Promise<ApiTrace<T>> {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain' },
    });
    const durationMs = Math.round(performance.now() - startedAt);

    let parsed: unknown = null;
    if (parseAsJson) {
      const text = await response.text();
      parsed = text ? JSON.parse(text) : null;
    } else {
      parsed = await response.text();
    }

    if (!response.ok) {
      const serverMsg =
        typeof parsed === 'object' &&
        parsed !== null &&
        'message' in parsed &&
        parsed.message
          ? Array.isArray(parsed.message)
            ? parsed.message.join(', ')
            : String(parsed.message)
          : `Error HTTP ${response.status}`;
      return {
        url,
        status: response.status,
        ok: false,
        durationMs,
        data: parsed as T,
        errorMessage: serverMsg,
      };
    }

    return {
      url,
      status: response.status,
      ok: true,
      durationMs,
      data: parsed as T,
      errorMessage: null,
    };
  } catch (err) {
    return {
      url,
      status: null,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      data: null,
      errorMessage:
        err instanceof Error ? err.message : 'Error de red al consultar la API.',
    };
  }
}

export function checkApiHealth(baseUrl: string): Promise<ApiTrace<string>> {
  return executeGet<string>(buildUrl(baseUrl, '/'), false);
}

export function fetchNearbyPlaces(
  baseUrl: string,
  params: NearbyQueryParams,
): Promise<ApiTrace<NearbyPlacesResponse>> {
  const url = buildUrl(baseUrl, '/v1/places/nearby', {
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    category: params.category,
    q: params.q,
    limit: params.limit ?? 30,
    offset: params.offset ?? 0,
  });
  return executeGet<NearbyPlacesResponse>(url);
}

export function searchPlaces(
  baseUrl: string,
  params: SearchQueryParams,
): Promise<ApiTrace<SearchPlacesResponse>> {
  const url = buildUrl(baseUrl, '/v1/places/search', {
    q: params.q,
    locality: params.locality,
    region: params.region,
    category: params.category,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    limit: params.limit ?? 30,
    offset: params.offset ?? 0,
  });
  return executeGet<SearchPlacesResponse>(url);
}

