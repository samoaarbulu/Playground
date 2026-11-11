<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { GeoPoint, PlaceItem } from '../types/places';

const props = withDefaults(
  defineProps<{
    places: PlaceItem[];
    selectedPlaceId?: string | null;
    center: GeoPoint | null;
    radiusMeters?: number | null;
    mapboxToken: string;
    mapTheme?: 'dark' | 'streets';
    interactiveCenter?: boolean;
    fitResults?: boolean;
    searchSeq?: number;
  }>(),
  {
    selectedPlaceId: null,
    radiusMeters: null,
    mapTheme: 'dark',
    interactiveCenter: false,
    fitResults: false,
    searchSeq: 0,
  },
);

const emit = defineEmits<{
  selectPlace: [placeId: string];
  updateCenter: [point: GeoPoint];
  saveToken: [token: string];
  toggleTheme: [];
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const tokenInput = ref('');
const mapError = ref<string | null>(null);
const mapReady = ref(false);

let map: mapboxgl.Map | null = null;
let centerMarker: mapboxgl.Marker | null = null;
let placeMarkers: mapboxgl.Marker[] = [];
let activePopup: mapboxgl.Popup | null = null;

const CIRCLE_SOURCE_ID = 'search-radius-source';
const CIRCLE_FILL_LAYER_ID = 'search-radius-fill';
const CIRCLE_LINE_LAYER_ID = 'search-radius-outline';

function styleUrlFor(theme: 'dark' | 'streets'): string {
  return theme === 'streets'
    ? 'mapbox://styles/mapbox/streets-v12'
    : 'mapbox://styles/mapbox/dark-v11';
}

function buildCircleGeoJson(center: GeoPoint, radiusMeters: number) {
  const steps = 64;
  const earthRadius = 6378137;
  const latRad = (center.lat * Math.PI) / 180;
  const lngRad = (center.lng * Math.PI) / 180;
  const angularDistance = radiusMeters / earthRadius;
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (2 * Math.PI * i) / steps;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pLat),
      );
    coordinates.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coordinates],
        },
      },
    ],
  };
}

function buildPopupNode(place: PlaceItem): HTMLElement {
  const box = document.createElement('div');
  box.className = 'creds-popup';

  const title = document.createElement('strong');
  title.className = 'creds-popup-title';
  title.textContent = place.name;
  box.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'creds-popup-meta';
  const parts = [place.category ?? 'spot'];
  if (place.distanceMeters !== null) {
    parts.push(`${place.distanceMeters} m`);
  }
  meta.textContent = parts.join(' • ');
  box.appendChild(meta);

  if (place.address || place.locality) {
    const addr = document.createElement('div');
    addr.className = 'creds-popup-addr';
    addr.textContent = [place.address, place.locality, place.region]
      .filter(Boolean)
      .join(', ');
    box.appendChild(addr);
  }

  return box;
}

function syncRadiusLayer() {
  if (!map || !map.isStyleLoaded()) return;

  const hasCircle = Boolean(props.center && props.radiusMeters && props.radiusMeters > 0);
  const geoJson = hasCircle && props.center && props.radiusMeters
    ? buildCircleGeoJson(props.center, props.radiusMeters)
    : { type: 'FeatureCollection' as const, features: [] };

  const existing = map.getSource(CIRCLE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(geoJson);
    return;
  }

  map.addSource(CIRCLE_SOURCE_ID, {
    type: 'geojson',
    data: geoJson,
  });

  map.addLayer({
    id: CIRCLE_FILL_LAYER_ID,
    type: 'fill',
    source: CIRCLE_SOURCE_ID,
    paint: {
      'fill-color': '#5271FF',
      'fill-opacity': 0.14,
    },
  });

  map.addLayer({
    id: CIRCLE_LINE_LAYER_ID,
    type: 'line',
    source: CIRCLE_SOURCE_ID,
    paint: {
      'line-color': '#5271FF',
      'line-width': 2,
      'line-dasharray': [3, 2],
    },
  });
}

function syncMarkers() {
  if (!map) return;

  centerMarker?.remove();
  centerMarker = null;

  if (props.center) {
    const el = document.createElement('div');
    el.className = 'creds-gps-pin';
    el.title = 'Punto GPS de referencia';
    centerMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([props.center.lng, props.center.lat])
      .addTo(map);
  }

  for (const marker of placeMarkers) {
    marker.remove();
  }
  placeMarkers = [];
  activePopup?.remove();
  activePopup = null;

  for (const place of props.places) {
    const isSelected = place.id === props.selectedPlaceId;
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = isSelected ? 'creds-place-pin is-selected' : 'creds-place-pin';
    pin.setAttribute('aria-label', `${place.name}${place.distanceMeters !== null ? ` (${place.distanceMeters} m)` : ''}`);
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      emit('selectPlace', place.id);
    });

    const marker = new mapboxgl.Marker({ element: pin })
      .setLngLat([place.longitude, place.latitude])
      .addTo(map);

    if (isSelected && map) {
      activePopup = new mapboxgl.Popup({ offset: 18, closeButton: false })
        .setLngLat([place.longitude, place.latitude])
        .setDOMContent(buildPopupNode(place))
        .addTo(map);
    }

    placeMarkers.push(marker);
  }
}

function fitMapToView() {
  if (!map) return;

  if (props.fitResults && props.places.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    for (const place of props.places) {
      bounds.extend([place.longitude, place.latitude]);
    }
    if (props.center) {
      bounds.extend([props.center.lng, props.center.lat]);
    }
    map.fitBounds(bounds, { padding: 56, maxZoom: 15.5, duration: 550 });
    return;
  }

  if (props.center && props.radiusMeters && props.radiusMeters > 0) {
    const circleCoords =
      buildCircleGeoJson(props.center, props.radiusMeters).features[0]?.geometry
        .coordinates[0] ?? [];
    const bounds = new mapboxgl.LngLatBounds();
    for (const coord of circleCoords) {
      bounds.extend(coord);
    }
    for (const place of props.places) {
      bounds.extend([place.longitude, place.latitude]);
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 17.5, duration: 600 });
      return;
    }
  }

  if (props.center) {
    map.flyTo({
      center: [props.center.lng, props.center.lat],
      zoom: 14,
      duration: 500,
    });
  }
}

function destroyMap() {
  activePopup?.remove();
  activePopup = null;
  centerMarker?.remove();
  centerMarker = null;
  for (const marker of placeMarkers) marker.remove();
  placeMarkers = [];
  map?.remove();
  map = null;
  mapReady.value = false;
}

function initMap() {
  destroyMap();
  mapError.value = null;

  const token = props.mapboxToken.trim();
  const container = mapContainerRef.value;
  if (!token || !container) {
    return;
  }

  try {
    mapboxgl.accessToken = token;
    const initialCenter: [number, number] = props.center
      ? [props.center.lng, props.center.lat]
      : [-80.1918, 25.7617];

    map = new mapboxgl.Map({
      container,
      style: styleUrlFor(props.mapTheme),
      center: initialCenter,
      zoom: 12.6,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      mapReady.value = true;
      syncRadiusLayer();
      syncMarkers();
      fitMapToView();
    });

    map.on('style.load', () => {
      syncRadiusLayer();
      syncMarkers();
    });

    map.on('click', (event) => {
      if (!props.interactiveCenter) return;
      emit('updateCenter', {
        lat: Number(event.lngLat.lat.toFixed(6)),
        lng: Number(event.lngLat.lng.toFixed(6)),
      });
    });

    map.on('error', (event) => {
      const msg = event?.error?.message ?? '';
      if (msg.toLowerCase().includes('access token') || msg.includes('401')) {
        mapError.value =
          'El token de Mapbox fue rechazado (401). Verifica que sea un Public Token válido (pk.eyJ...).';
      }
    });
  } catch (err) {
    mapError.value =
      err instanceof Error ? err.message : 'No se pudo inicializar Mapbox GL JS.';
  }
}

function handleSaveToken() {
  const clean = tokenInput.value.trim();
  if (!clean) return;
  emit('saveToken', clean);
}

watch(
  () => props.mapboxToken,
  () => {
    initMap();
  },
);

watch(
  () => props.mapTheme,
  (theme) => {
    if (map) {
      map.setStyle(styleUrlFor(theme));
    }
  },
);

watch(
  () => [props.center, props.radiusMeters],
  () => {
    syncRadiusLayer();
    syncMarkers();
  },
  { deep: true },
);

watch(
  () => props.searchSeq,
  () => {
    syncRadiusLayer();
    syncMarkers();
    fitMapToView();
  },
);

watch(
  () => props.places,
  () => {
    syncMarkers();
  },
  { deep: true },
);

watch(
  () => props.selectedPlaceId,
  (selectedId) => {
    syncMarkers();
    if (selectedId && map) {
      const found = props.places.find((p) => p.id === selectedId);
      if (found) {
        map.easeTo({ center: [found.longitude, found.latitude], duration: 350 });
      }
    }
  },
);

onMounted(() => {
  tokenInput.value = props.mapboxToken;
  initMap();
});

onBeforeUnmount(() => {
  destroyMap();
});
</script>

<template>
  <div class="map-shell">
    <div v-if="mapboxToken && !mapError" class="map-toolbar">
      <span v-if="interactiveCenter" class="map-hint">
        <span aria-hidden="true">📍</span>
        <span>Haz clic en el mapa para mover el GPS de prueba</span>
      </span>
      <span v-else class="map-hint">
        <span aria-hidden="true">🗺️</span>
        <span>Vista vectorial Mapbox GL</span>
      </span>
      <button type="button" class="theme-toggle" @click="emit('toggleTheme')">
        Estilo: {{ mapTheme === 'dark' ? 'Ink Oscuro' : 'Calles Claro' }}
      </button>
    </div>

    <div
      v-show="Boolean(mapboxToken && !mapError)"
      ref="mapContainerRef"
      class="map-canvas"
      role="region"
      aria-label="Mapa interactivo de locales en Mapbox"
    ></div>

    <div v-if="!mapboxToken || mapError" class="token-gate">
      <div class="token-card">
        <span class="token-badge">Mapbox GL JS</span>
        <h3>Conecta tu Public Token de Mapbox</h3>
        <p>
          Pega tu token público (<code>pk.eyJ...</code>) de
          <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer">
            account.mapbox.com
          </a>
          para renderizar el mapa vectorial aquí. Mientras tanto, la consulta y lista de
          resultados de tu API siguen funcionando normalmente.
        </p>

        <p v-if="mapError" class="token-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{{ mapError }}</span>
        </p>

        <form class="token-form" @submit.prevent="handleSaveToken">
          <label for="mapbox-token-inline">Mapbox Public Access Token</label>
          <div class="token-row">
            <input
              id="mapbox-token-inline"
              v-model="tokenInput"
              type="text"
              placeholder="pk.eyJ1Ijoi..."
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              required
            />
            <button type="submit" class="btn-primary">Activar mapa</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-shell {
  position: relative;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 360px;
  border-radius: 1rem;
  overflow: hidden;
  background-color: var(--creds-ink);
  border: 1px solid #303642;
}

.map-canvas {
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 360px;
}

.map-toolbar {
  position: absolute;
  inset-block-start: 0.75rem;
  inset-inline-start: 0.75rem;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  max-inline-size: calc(100% - 4rem);
}

.map-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background-color: rgb(17 17 20 / 0.88);
  color: var(--creds-white);
  border: 1px solid #485060;
  font-size: 0.82rem;
  font-weight: 500;
}

.theme-toggle {
  min-block-size: 36px;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid #6b768f;
  background-color: rgb(17 17 20 / 0.9);
  color: var(--creds-white);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.token-gate {
  display: grid;
  place-items: center;
  padding: 1.5rem;
  min-block-size: 360px;
  block-size: 100%;
  background: radial-gradient(circle at top right, #22306b, var(--creds-ink) 65%);
  color: var(--creds-white);
}

.token-card {
  inline-size: min(100%, 30rem);
  background-color: #181b22;
  border: 1px solid #3d4454;
  border-radius: 1rem;
  padding: 1.5rem;
  display: grid;
  gap: 0.85rem;
}

.token-badge {
  inline-size: fit-content;
  background-color: var(--creds-blue);
  color: var(--creds-white);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.token-card h3 {
  margin: 0;
  font-size: 1.15rem;
}

.token-card p {
  margin: 0;
  color: #cfd5e3;
  font-size: 0.92rem;
  line-height: 1.5;
}

.token-card a {
  color: #9bb1ff;
}

.token-error {
  display: flex;
  gap: 0.5rem;
  padding: 0.65rem 0.8rem;
  border-radius: 0.6rem;
  background-color: #3b181d;
  border: 1px solid #e06c75;
  color: #ffd7db;
  font-size: 0.88rem;
}

.token-form {
  display: grid;
  gap: 0.45rem;
}

.token-form label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #e4e8f2;
}

.token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.token-row input {
  flex: 1 1 200px;
  min-inline-size: 0;
  min-block-size: 48px;
  padding: 0.6rem 0.8rem;
  border-radius: 0.6rem;
  border: 1px solid #6b7488;
  background-color: #101217;
  color: var(--creds-white);
  font: inherit;
  font-size: max(1rem, 1em);
}
</style>

<style>
.creds-gps-pin {
  inline-size: 18px;
  block-size: 18px;
  border-radius: 999px;
  background-color: #5271ff;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 6px rgb(82 113 255 / 0.35);
}

.creds-place-pin {
  inline-size: 14px;
  block-size: 14px;
  padding: 0;
  border-radius: 999px;
  background-color: #ffffff;
  border: 3px solid #3450d6;
  cursor: pointer;
  transition: transform 120ms ease;
}

.creds-place-pin:hover,
.creds-place-pin.is-selected {
  inline-size: 20px;
  block-size: 20px;
  background-color: #5271ff;
  border-color: #ffffff;
  transform: scale(1.1);
}

.mapboxgl-popup-content {
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
  color: #111114;
  border: 1px solid #d4dae6;
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.25);
}

.creds-popup-title {
  display: block;
  font-size: 0.95rem;
  color: #111114;
  margin-block-end: 0.2rem;
}

.creds-popup-meta {
  font-size: 0.8rem;
  font-weight: 700;
  color: #3450d6;
  margin-block-end: 0.2rem;
}

.creds-popup-addr {
  font-size: 0.8rem;
  color: #2b2f33;
}
</style>
