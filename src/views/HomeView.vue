<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ApiInspector from '../components/ApiInspector.vue';
import { usePlaygroundConfig } from '../composables/usePlaygroundConfig';
import { checkApiHealth } from '../services/placesApi';
import type { ApiTrace } from '../types/places';

const { config, setApiBaseUrl, setMapboxToken } = usePlaygroundConfig();

const apiInput = ref(config.apiBaseUrl);
const tokenInput = ref(config.mapboxToken);
const healthTrace = ref<ApiTrace<string> | null>(null);
const checking = ref(false);
const savedNotice = ref('');

async function runHealthCheck() {
  checking.value = true;
  healthTrace.value = await checkApiHealth(config.apiBaseUrl);
  checking.value = false;
}

function saveConfig() {
  setApiBaseUrl(apiInput.value);
  setMapboxToken(tokenInput.value);
  savedNotice.value = 'Configuración guardada en este navegador.';
  void runHealthCheck();
}

function selectPresetApi(url: string) {
  apiInput.value = url;
  setApiBaseUrl(url);
  savedNotice.value = `Ambiente cambiado a ${url}`;
  void runHealthCheck();
}

onMounted(() => {
  void runHealthCheck();
});
</script>

<template>
  <section class="page-stack">
    <div class="hero-card">
      <div class="hero-copy">
        <p class="hero-eyebrow">PoC Interactiva • Backend + Mapbox</p>
        <h1>Where your people go.</h1>
        <p class="hero-lead">
          Entorno de prueba en Vue 3 para validar los endpoints geoespaciales reales de
          CREDS y la visualización vectorial en Mapbox antes de integrarlos en Flutter.
        </p>
      </div>

      <div class="hero-actions">
        <RouterLink to="/nearby" class="cta-card">
          <span class="cta-tag">Menú 1 • GPS + Radio 3 km</span>
          <strong>Test Búsqueda Cercana →</strong>
          <span>Mapa interactivo, geolocalización y lista ordenada por distancia exacta.</span>
        </RouterLink>

        <RouterLink to="/search" class="cta-card">
          <span class="cta-tag">Menú 2 • Catálogo + Texto</span>
          <strong>Test Búsqueda por Texto →</strong>
          <span>Filtra por nombre, marca, ciudad, estado o cercanía opcional.</span>
        </RouterLink>
      </div>
    </div>

    <div class="config-grid">
      <section class="panel-card" aria-labelledby="config-heading">
        <h2 id="config-heading">Configuración de conexión</h2>
        <form class="form-stack" @submit.prevent="saveConfig">
          <div class="field-group">
            <label for="api-base-url">URL Base de la API</label>
            <input
              id="api-base-url"
              v-model="apiInput"
              type="url"
              name="apiBaseUrl"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              required
            />
            <div class="preset-row">
              <button
                type="button"
                class="chip-btn"
                @click="selectPresetApi('https://api-dev.getcreds.co')"
              >
                Dev Cloud (api-dev.getcreds.co)
              </button>
              <button
                type="button"
                class="chip-btn"
                @click="selectPresetApi('http://localhost:3000')"
              >
                Local (localhost:3000)
              </button>
            </div>
          </div>

          <div class="field-group">
            <label for="mapbox-public-token">Mapbox Public Token (pk.eyJ...)</label>
            <input
              id="mapbox-public-token"
              v-model="tokenInput"
              type="text"
              name="mapboxToken"
              placeholder="pk.eyJ1Ijoi..."
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
            />
            <span class="field-hint">
              Se guarda en tu navegador (localStorage) o desde <code>VITE_MAPBOX_TOKEN</code>.
            </span>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Guardar y probar conexión</button>
            <button
              type="button"
              class="btn-secondary"
              :disabled="checking"
              @click="runHealthCheck"
            >
              {{ checking ? 'Verificando...' : 'Reprobar GET /' }}
            </button>
          </div>

          <p v-if="savedNotice" class="status-note" role="status" aria-live="polite">
            {{ savedNotice }}
          </p>
        </form>
      </section>

      <section class="panel-card" aria-labelledby="status-heading">
        <h2 id="status-heading">Estado del Backend en vivo</h2>
        <div v-if="healthTrace" class="health-box" role="status" aria-live="polite">
          <p class="health-line">
            <span aria-hidden="true">{{ healthTrace.ok ? '✅' : '❌' }}</span>
            <strong>{{ healthTrace.ok ? 'Backend conectado' : 'No se pudo conectar' }}</strong>
          </p>
          <p class="health-meta">
            Respuesta: <code>{{ healthTrace.data ?? healthTrace.errorMessage }}</code>
            ({{ healthTrace.durationMs }} ms)
          </p>
        </div>

        <ul class="endpoint-list">
          <li>
            <code>GET /v1/places/nearby</code> — Radio geodésico en metros (default 3,000 m)
          </li>
          <li>
            <code>GET /v1/places/search</code> — Búsqueda por texto, ciudad y estado
          </li>
          <li>
            <a
              :href="`${config.apiBaseUrl}/docs`"
              target="_blank"
              rel="noopener noreferrer"
              class="docs-link"
            >
              Abrir documentación Swagger (/docs) ↗
            </a>
          </li>
        </ul>

        <ApiInspector :trace="healthTrace" />
      </section>
    </div>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 1.5rem;
}

.hero-card {
  background: linear-gradient(135deg, var(--creds-ink) 0%, #1d2859 100%);
  color: var(--creds-white);
  border-radius: 1.25rem;
  padding: clamp(1.5rem, 3dvw, 2.25rem);
  display: grid;
  gap: 1.5rem;
}

.hero-eyebrow {
  margin: 0 0 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #b7c6ff;
}

.hero-copy h1 {
  margin: 0 0 0.65rem;
  font-size: clamp(1.75rem, 3.2dvw, 2.4rem);
  line-height: 1.15;
}

.hero-lead {
  margin: 0;
  max-inline-size: 62ch;
  color: #dce2f0;
  line-height: 1.55;
}

.hero-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.cta-card {
  display: grid;
  gap: 0.35rem;
  padding: 1.15rem 1.25rem;
  border-radius: 0.95rem;
  background-color: rgb(255 255 255 / 0.08);
  border: 1px solid #6e83d9;
  color: var(--creds-white);
  text-decoration: none;
  transition: background-color 150ms ease, transform 150ms ease;
}

.cta-card:hover {
  background-color: var(--creds-blue);
  transform: translateY(-1px);
}

.cta-tag {
  font-size: 0.78rem;
  font-weight: 700;
  color: #c9d5ff;
}

.cta-card strong {
  font-size: 1.1rem;
}

.cta-card span:last-child {
  font-size: 0.9rem;
  color: #e4e9f5;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
}

.panel-card {
  background-color: var(--creds-white);
  border: 1px solid #767d8a;
  border-radius: 1rem;
  padding: 1.35rem;
  display: grid;
  gap: 1rem;
  align-content: start;
}

.panel-card h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--creds-ink);
}

.form-stack {
  display: grid;
  gap: 1rem;
}

.field-group {
  display: grid;
  gap: 0.4rem;
}

.field-group label {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--creds-ink);
}

.field-hint {
  font-size: 0.82rem;
  color: var(--creds-graphite);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-start: 0.2rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.status-note {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--creds-deep-blue);
}

.health-box {
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  background-color: #f4f6fb;
  border: 1px solid #7c8596;
  display: grid;
  gap: 0.25rem;
}

.health-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.health-meta {
  margin: 0;
  font-size: 0.88rem;
  color: var(--creds-graphite);
}

.endpoint-list {
  margin: 0;
  padding-inline-start: 1.15rem;
  display: grid;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--creds-graphite);
}

.docs-link {
  color: var(--creds-deep-blue);
  font-weight: 700;
}
</style>

