<script setup lang="ts">
import { computed } from 'vue';
import type { ApiTrace } from '../types/places';

const props = defineProps<{
  trace: ApiTrace | null;
}>();

const formattedJson = computed(() => {
  if (!props.trace?.data) return '';
  if (typeof props.trace.data === 'string') return props.trace.data;
  return JSON.stringify(props.trace.data, null, 2);
});
</script>

<template>
  <details v-if="trace" class="inspector">
    <summary class="inspector-summary">
      <span class="status-badge" :class="trace.ok ? 'is-ok' : 'is-err'">
        <span aria-hidden="true">{{ trace.ok ? '✓' : '✕' }}</span>
        <span>{{ trace.status ? `HTTP ${trace.status}` : 'Sin conexión' }}</span>
      </span>
      <code class="inspector-url">{{ trace.url }}</code>
      <span class="inspector-time">{{ trace.durationMs }} ms</span>
    </summary>

    <div class="inspector-body">
      <p v-if="trace.errorMessage" class="inspector-error" role="alert">
        {{ trace.errorMessage }}
      </p>
      <pre v-if="formattedJson" class="inspector-json"><code>{{ formattedJson }}</code></pre>
    </div>
  </details>
</template>

<style scoped>
.inspector {
  border: 1px solid #6b7280;
  border-radius: 0.85rem;
  background-color: var(--creds-ink);
  color: var(--creds-white);
  overflow: hidden;
}

.inspector-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  list-style: none;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-badge.is-ok {
  background-color: #143d26;
  color: #a9f5c4;
  border: 1px solid #35a866;
}

.status-badge.is-err {
  background-color: #46171d;
  color: #ffc2c8;
  border: 1px solid #e06c75;
}

.inspector-url {
  flex: 1 1 220px;
  min-inline-size: 0;
  overflow-wrap: anywhere;
  font-size: 0.82rem;
  color: #d6dceb;
}

.inspector-time {
  font-size: 0.8rem;
  color: #c9d3eb;
  font-weight: 700;
}

.inspector-body {
  border-block-start: 1px solid #2e3440;
  padding: 0.85rem 1rem;
  display: grid;
  gap: 0.65rem;
}

.inspector-error {
  margin: 0;
  color: #ffc2c8;
  font-size: 0.88rem;
}

.inspector-json {
  margin: 0;
  max-block-size: 260px;
  overflow: auto;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #e6ebf5;
}
</style>
