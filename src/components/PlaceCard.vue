<script setup lang="ts">
import type { PlaceItem } from '../types/places';

defineProps<{
  place: PlaceItem;
  selected?: boolean;
}>();

const emit = defineEmits<{
  select: [placeId: string];
}>();

function formatDistance(meters: number | null): string | null {
  if (meters === null) return null;
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatLocation(place: PlaceItem): string {
  return [place.address, place.locality, place.region, place.postalCode]
    .filter(Boolean)
    .join(', ');
}
</script>

<template>
  <article
    class="place-card"
    :class="{ 'is-selected': selected }"
  >
    <div class="place-header">
      <div class="place-title-wrap">
        <h3 class="place-title">{{ place.name }}</h3>
        <span v-if="place.brandName && place.brandName !== place.name" class="place-brand">
          {{ place.brandName }}
        </span>
      </div>
      <span v-if="place.distanceMeters !== null" class="distance-pill">
        {{ formatDistance(place.distanceMeters) }}
      </span>
    </div>

    <div class="place-tags">
      <span v-if="place.category" class="category-pill">{{ place.category }}</span>
      <span class="coords-text">
        {{ place.latitude.toFixed(4) }}, {{ place.longitude.toFixed(4) }}
      </span>
    </div>

    <p v-if="formatLocation(place)" class="place-address">
      {{ formatLocation(place) }}
    </p>

    <div class="place-links">
      <span v-if="place.phones?.length" class="contact-item">
        📞 {{ place.phones[0] }}
      </span>
      <a
        v-if="place.websites?.length"
        :href="place.websites[0]"
        target="_blank"
        rel="noopener noreferrer"
        class="website-link"
      >
        Sitio web ↗
      </a>
      <button
        type="button"
        class="focus-btn"
        :aria-pressed="Boolean(selected)"
        @click="emit('select', place.id)"
      >
        {{ selected ? 'Seleccionado en mapa' : 'Ver en mapa' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.place-card {
  min-inline-size: 0;
  padding: 0.95rem 1rem;
  border-radius: 0.85rem;
  background-color: var(--creds-white);
  border: 1px solid #767d8a;
  display: grid;
  gap: 0.5rem;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.place-card.is-selected {
  border: 2px solid var(--creds-deep-blue);
  box-shadow: 0 6px 20px rgb(52 80 214 / 0.14);
}

.place-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.place-title-wrap {
  min-inline-size: 0;
}

.place-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--creds-ink);
  overflow-wrap: anywhere;
}

.place-brand {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--creds-graphite);
}

.distance-pill {
  flex-shrink: 0;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background-color: var(--creds-ink);
  color: var(--creds-white);
  font-size: 0.8rem;
  font-weight: 700;
}

.place-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.category-pill {
  padding: 0.2rem 0.55rem;
  border-radius: 0.45rem;
  background-color: #eef2ff;
  color: var(--creds-deep-blue);
  border: 1px solid #96a8f8;
  font-size: 0.78rem;
  font-weight: 700;
}

.coords-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: var(--creds-graphite);
}

.place-address {
  margin: 0;
  font-size: 0.88rem;
  color: var(--creds-graphite);
  line-height: 1.4;
}

.place-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  padding-block-start: 0.2rem;
}

.contact-item {
  font-size: 0.84rem;
  color: var(--creds-graphite);
}

.website-link {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--creds-deep-blue);
  text-decoration: underline;
}

.focus-btn {
  margin-inline-start: auto;
  min-block-size: 38px;
  padding: 0.35rem 0.75rem;
  border-radius: 0.55rem;
  border: 1px solid var(--creds-deep-blue);
  background-color: transparent;
  color: var(--creds-deep-blue);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.focus-btn[aria-pressed='true'] {
  background-color: var(--creds-deep-blue);
  color: var(--creds-white);
}
</style>
