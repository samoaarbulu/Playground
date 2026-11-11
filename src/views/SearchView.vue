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
import { searchPlaces } from '../services/placesApi';
import type { ApiTrace, PlaceItem, SearchPlacesResponse } from '../types/places';

const { config, setMapboxToken, setMapTheme, setReferencePoint } =
  usePlaygroundConfig();

const q = ref('Equinox');
const locality = ref('Miami');
const region = ref('FL');
const category = ref('');
const sortByReferenceGps = ref(false);

const places = ref<PlaceItem[]>([]);
const selectedPlaceId = ref<string | null>(null);
const loading = ref(false);
const searchSeq = ref(0);
const trace = ref<ApiTrace<SearchPlacesResponse> | null>(null);

async function runSearch() {
  loading.value = true;
  const response = await searchPlaces(config.apiBaseUrl, {
    q: q.value.trim() || undefined,
    locality: locality.value.trim() || undefined,
    region: region.value.trim() || undefined,
    category: category.value.trim() || undefined,
    lat: sortByReferenceGps.value ? config.referencePoint.lat : undefined,
    lng: sortByReferenceGps.value ? config.referencePoint.lng : undefined,
    limit: 30,
  });

  trace.value = response;
  places.value = response.ok && response.data ? response.data.items : [];
  selectedPlaceId.value = places.value[0]?.id ?? null;
  loading.value = false;
  searchSeq.value += 1;
}

function applyQuickSearch(example: {
  q: string;
  locality: string;
  region: string;
  category: string;
}) {
  q.value = example.q;
  locality.value = example.locality;
  region.value = example.region;
  category.value = example.category;
  void runSearch();
}

function useCityAsReference(cityIndex: number) {
  const city = PRESET_CITIES[cityIndex];
  if (!city) return;
  locality.value = city.locality;
  region.value = city.region;
  setReferencePoint(city.coords);
  void runSearch();
}

onMounted(() => {
  void runSearch();
});
</script>

<template>
  <section class="page-stack">
    <div class="view-header">
      <div>
        <h1>Test Búsqueda por Texto y Ubicación</h1>
        <p class="view-subtitle">
          Consulta <code>GET /v1/places/search</code> filtrando por nombre/marca, ciudad, estado y cercanía opcional.
        </p>
      </div>
    </div>

    <div class="preset-bar">
      <span class="preset-label">Pruebas rápidas:</span>
      <button
        type="button"
        class="chip-btn"
        @click="applyQuickSearch({ q: 'Equinox', locality: 'Miami', region: 'FL', category: '' })"
      >
        Equinox en Miami
      </button>
      <button
        type="button"
        class="chip-btn"
        @click="applyQuickSearch({ q: 'Yoga', locality: 'Orlando', region: 'FL', category: '' })"
      >
        Yoga en Orlando
      </button>
      <button
        type="button"
        class="chip-btn"
        @click="applyQuickSearch({ q: 'CrossFit', locality: '', region: 'FL', category: '' })"
      >
        CrossFit en toda FL
      </button>
      <button
        type="button"
        class="chip-btn"
        @click="useCityAsReference(4)"
      >
        Ciudad Tampa (FL)
      </button>
    </div>

    <search>
      <form class="search-form" @submit.prevent="runSearch">
        <div class="filter-field">
          <label for="search-q">Texto (nombre o marca)</label>
          <input
            id="search-q"
            v-model="q"
            type="search"
            name="q"
            placeholder="Ej. Equinox, Barry's, Pilates..."
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
          />
        </div>

        <div class="filter-field">
          <label for="search-locality">Ciudad / Localidad</label>
          <input
            id="search-locality"
            v-model="locality"
            type="text"
            name="locality"
            placeholder="Ej. Miami, Orlando, Tampa..."
          />
        </div>

        <div class="filter-field">
          <label for="search-region">Estado / Región</label>
          <input
            id="search-region"
            v-model="region"
            type="text"
            name="region"
            placeholder="Ej. FL"
            autocapitalize="characters"
          />
        </div>

        <div class="filter-field">
          <label for="search-category">Categoría</label>
          <input
            id="search-category"
            v-model="category"
            type="text"
            name="category"
            list="search-categories-list"
            placeholder="Todas"
          />
          <datalist id="search-categories-list">
            <option v-for="cat in COMMON_CATEGORIES" :key="cat" :value="cat" />
          </datalist>
        </div>

        <div class="checkbox-field">
          <input
            id="search-sort-gps"
            v-model="sortByReferenceGps"
            type="checkbox"
            name="sortByGps"
          />
          <label for="search-sort-gps">
            Ordenar por cercanía a ({{ config.referencePoint.lat }}, {{ config.referencePoint.lng }})
          </label>
        </div>

        <div class="filter-submit">
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Buscando...' : 'Buscar locales' }}
          </button>
        </div>
      </form>
    </search>

    <div class="workspace-grid">
      <div class="map-pane">
        <CredsMap
          :places="places"
          :selected-place-id="selectedPlaceId"
          :center="sortByReferenceGps ? config.referencePoint : null"
          :mapbox-token="config.mapboxToken"
          :map-theme="config.mapTheme"
          :fit-results="true"
          :search-seq="searchSeq"
          @select-place="selectedPlaceId = $event"
          @save-token="setMapboxToken"
          @toggle-theme="setMapTheme(config.mapTheme === 'dark' ? 'streets' : 'dark')"
        />
      </div>

      <aside class="results-pane" aria-label="Resultados de búsqueda">
        <div class="results-header" role="status" aria-live="polite">
          <strong>{{ places.length }} resultados</strong>
          <span v-if="locality || region">
            {{ [locality, region].filter(Boolean).join(', ') }}
          </span>
        </div>

        <p v-if="trace && !trace.ok" class="error-box" role="alert">
          <span aria-hidden="true">❌</span>
          <span>{{ trace.errorMessage }}</span>
        </p>

        <p v-else-if="!loading && places.length === 0" class="empty-box">
          No se encontraron locales con esos filtros. Prueba limpiar la ciudad o buscar otro término.
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

.search-form {
  background-color: var(--creds-white);
  border: 1px solid #767d8a;
  border-radius: 0.95rem;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

.checkbox-field {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding-block-start: 0.2rem;
}

.checkbox-field input[type='checkbox'] {
  inline-size: 1.2rem;
  block-size: 1.2rem;
  accent-color: var(--creds-blue);
}

.checkbox-field label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--creds-ink);
}

.filter-submit {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
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

