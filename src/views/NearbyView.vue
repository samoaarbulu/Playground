<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ApiInspector from '../components/ApiInspector.vue';
import CredsMap from '../components/CredsMap.vue';
import PlaceCard from '../components/PlaceCard.vue';
import {
  COMMON_CATEGORIES,
  PRESET_CITIES,
  usePlaygroundConfig,
} from '../composables/usePlaygroundConfig';
import { fetchNearbyPlaces } from '../services/placesApi';
import type { ApiTrace, GeoPoint, NearbyPlacesResponse, PlaceItem } from '../types/places';

const { config, setMapboxToken, setMapTheme, setReferencePoint } =
  usePlaygroundConfig();

const center = ref<GeoPoint>({ ...config.referencePoint });
const radius = ref(200);
const category = ref('');
const q = ref('');
const limit = ref(25);

const places = ref<PlaceItem[]>([]);
const selectedPlaceId = ref<string | null>(null);
const loading = ref(false);
const searchSeq = ref(0);
const gpsStatus = ref('Ubicación inicial: Brickell, Miami (puedes activar tu GPS o tocar el mapa).');
const trace = ref<ApiTrace<NearbyPlacesResponse> | null>(null);

async function runNearbyQuery() {
  loading.value = true;
  const response = await fetchNearbyPlaces(config.apiBaseUrl, {
    lat: center.value.lat,
    lng: center.value.lng,
    radius: radius.value,
    category: category.value || undefined,
    q: q.value.trim() || undefined,
    limit: limit.value,
  });

  trace.value = response;
  places.value = response.ok && response.data ? response.data.items : [];
  selectedPlaceId.value = places.value[0]?.id ?? null;
  loading.value = false;
  searchSeq.value += 1;
}

function applyPoint(point: GeoPoint, label: string) {
  center.value = { ...point };
  setReferencePoint(point);
  gpsStatus.value = label;
  void runNearbyQuery();
}

function requestBrowserGps() {
  if (!('geolocation' in navigator)) {
    gpsStatus.value = 'Tu navegador no soporta Geolocation API; usa una ciudad de prueba.';
    return;
  }

  gpsStatus.value = 'Solicitando permiso de ubicación GPS al navegador...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const point = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      };
      applyPoint(
        point,
        `GPS real detectado (${point.lat}, ${point.lng}) ±${Math.round(pos.coords.accuracy)} m`,
      );
    },
    (err) => {
      gpsStatus.value = `No se pudo leer tu GPS (${err.message}). Puedes probar con Miami u Orlando.`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  );
}

function handleMapClick(point: GeoPoint) {
  applyPoint(point, `Pin movido en mapa (${point.lat}, ${point.lng})`);
}

onMounted(() => {
  void runNearbyQuery();
});
</script>

<template>
  <section class="page-stack">
    <div class="view-header">
      <div>
        <h1>Test Búsqueda Cercana (GPS + Radio)</h1>
        <p class="view-subtitle">
          Consulta <code>GET /v1/places/nearby</code> con cálculo geodésico exacto en metros.
        </p>
      </div>
      <div class="gps-actions">
        <button type="button" class="btn-primary" @click="requestBrowserGps">
          <span aria-hidden="true">📡</span>
          <span>Usar mi GPS actual</span>
        </button>
      </div>
    </div>

    <div class="preset-bar" aria-label="Ciudades de prueba en Florida">
      <span class="preset-label">Simular ubicación:</span>
      <button
        v-for="city in PRESET_CITIES"
        :key="city.id"
        type="button"
        class="chip-btn"
        @click="applyPoint(city.coords, `Ubicación simulada: ${city.label}`)"
      >
        {{ city.label }}
      </button>
    </div>

    <p class="status-banner" role="status" aria-live="polite">
      <span aria-hidden="true">📍</span>
      <span>{{ gpsStatus }}</span>
    </p>

    <search>
      <form class="filter-bar" @submit.prevent="runNearbyQuery">
        <div class="filter-field">
          <label for="nearby-lat">Latitud</label>
          <input
            id="nearby-lat"
            v-model.number="center.lat"
            type="number"
            name="lat"
            step="0.000001"
            min="-90"
            max="90"
            required
          />
        </div>

        <div class="filter-field">
          <label for="nearby-lng">Longitud</label>
          <input
            id="nearby-lng"
            v-model.number="center.lng"
            type="number"
            name="lng"
            step="0.000001"
            min="-180"
            max="180"
            required
          />
        </div>

        <div class="filter-field">
          <label for="nearby-radius">Radio</label>
          <select id="nearby-radius" v-model.number="radius" name="radius">
            <option :value="200">200 m</option>
            <option :value="500">500 m</option>
            <option :value="1000">1 km (1,000 m)</option>
            <option :value="3000">3 km (3,000 m)</option>
            <option :value="5000">5 km (5,000 m)</option>
            <option :value="10000">10 km (10,000 m)</option>
            <option :value="25000">25 km (25,000 m)</option>
          </select>
        </div>

        <div class="filter-field">
          <label for="nearby-category">Categoría (opcional)</label>
          <select id="nearby-category" v-model="category" name="category">
            <option value="">Todas las categorías</option>
            <option v-for="cat in COMMON_CATEGORIES" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>

        <div class="filter-field">
          <label for="nearby-q">Filtrar nombre (opcional)</label>
          <input
            id="nearby-q"
            v-model="q"
            type="search"
            name="q"
            placeholder="Ej. Equinox, Yoga..."
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
          />
        </div>

        <div class="filter-submit">
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Buscando...' : 'Buscar cercanos' }}
          </button>
        </div>
      </form>
    </search>

    <div class="workspace-grid">
      <div class="map-pane">
        <CredsMap
          :places="places"
          :selected-place-id="selectedPlaceId"
          :center="center"
          :radius-meters="radius"
          :mapbox-token="config.mapboxToken"
          :map-theme="config.mapTheme"
          :interactive-center="true"
          :search-seq="searchSeq"
          @select-place="selectedPlaceId = $event"
          @update-center="handleMapClick"
          @save-token="setMapboxToken"
          @toggle-theme="setMapTheme(config.mapTheme === 'dark' ? 'streets' : 'dark')"
        />
      </div>

      <aside class="results-pane" aria-label="Resultados cercanos">
        <div class="results-header" role="status" aria-live="polite">
          <strong>{{ places.length }} locales encontrados</strong>
          <span>Radio {{ radius < 1000 ? `${radius} m` : `${(radius / 1000).toFixed(1)} km` }}</span>
        </div>

        <p v-if="trace && !trace.ok" class="error-box" role="alert">
          <span aria-hidden="true">❌</span>
          <span>{{ trace.errorMessage }}</span>
        </p>

        <p v-else-if="!loading && places.length === 0" class="empty-box">
          No hay locales en este radio en la base actual (recuerda que hoy `creds_dev_db` tiene cargada Florida).
        </p>

        <div class="results-list">
          <PlaceCard
            v-for="place in places"
            :key="place.id"
            :place="place"
            :selected="place.id === selectedPlaceId"
            @select="selectedPlaceId = $event"
          />
        </div>
      </aside>
    </div>

    <ApiInspector :trace="trace" />
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 1rem;
}

.view-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.view-header h1 {
  margin: 0 0 0.25rem;
  font-size: clamp(1.35rem, 2.4dvw, 1.85rem);
  color: var(--creds-ink);
}

.view-subtitle {
  margin: 0;
  color: var(--creds-graphite);
  font-size: 0.95rem;
}

.preset-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.preset-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--creds-ink);
}

.status-banner {
  margin: 0;
  padding: 0.65rem 0.95rem;
  border-radius: 0.7rem;
  background-color: #eef2ff;
  border: 1px solid #8fa2f7;
  color: var(--creds-ink);
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.filter-bar {
  background-color: var(--creds-white);
  border: 1px solid #767d8a;
  border-radius: 0.95rem;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.85rem;
  align-items: end;
}

.filter-field {
  display: grid;
  gap: 0.3rem;
}

.filter-field label {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--creds-ink);
}

.filter-submit {
  display: flex;
}

.filter-submit button {
  inline-size: 100%;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.map-pane {
  min-block-size: 520px;
}

.results-pane {
  min-inline-size: 0;
  background-color: #f4f6fb;
  border: 1px solid #767d8a;
  border-radius: 1rem;
  padding: 0.9rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.75rem;
  max-block-size: 560px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.92rem;
  color: var(--creds-ink);
}

.results-list {
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
  display: grid;
  gap: 0.75rem;
  align-content: start;
  padding-inline-end: 0.25rem;
}

.error-box {
  margin: 0;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background-color: #fff1f2;
  border: 1px solid #be123c;
  color: #881337;
  display: flex;
  gap: 0.45rem;
}

.empty-box {
  margin: 0;
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: var(--creds-white);
  border: 1px solid #8a92a1;
  color: var(--creds-graphite);
}

@media (max-width: 920px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .map-pane {
    min-block-size: 380px;
  }

  .results-pane {
    max-block-size: 460px;
  }
}
</style>

