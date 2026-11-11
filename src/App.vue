<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-block-size: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.app-main {
  inline-size: min(100%, 1440px);
  margin-inline: auto;
  padding: clamp(1rem, 2.5dvw, 1.75rem);
  min-inline-size: 0;
}
</style>

