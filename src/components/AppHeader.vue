<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const headerRef = ref<HTMLElement | null>(null);
const innerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const isWide = ref(true);
const isMeasuring = ref(false);
let resizeObserver: ResizeObserver | null = null;
let lastCollapsedWidth = 0;

function measureLayout() {
  const header = headerRef.value;
  const inner = innerRef.value;
  const menu = menuRef.value;
  if (!header || !inner || !menu) return;

  const currentWidth = header.clientWidth;
  if (!isWide.value && currentWidth <= lastCollapsedWidth) {
    return;
  }

  const wasOpen = menu.matches(':popover-open') || menu.classList.contains(':popover-open');
  isMeasuring.value = true;
  isWide.value = true;
  menu.removeAttribute('popover');

  requestAnimationFrame(() => {
    const fits = inner.scrollWidth <= inner.clientWidth + 1;
    isWide.value = fits;

    if (fits) {
      menu.removeAttribute('popover');
    } else {
      lastCollapsedWidth = currentWidth;
      menu.setAttribute('popover', 'auto');
      if (wasOpen && typeof menu.showPopover === 'function') {
        try {
          menu.showPopover();
        } catch {
          // Ignorar si ya está abierto o en transición
        }
      }
    }

    requestAnimationFrame(() => {
      isMeasuring.value = false;
    });
  });
}

function closeNarrowMenu() {
  const menu = menuRef.value;
  if (!menu || isWide.value) return;
  if (typeof menu.hidePopover === 'function') {
    try {
      menu.hidePopover();
    } catch {
      // Ignorar si ya está cerrado
    }
  }
}

onMounted(() => {
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    void import('@oddbird/popover-polyfill');
  }

  measureLayout();

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measureLayout();
    });
    if (headerRef.value) resizeObserver.observe(headerRef.value);
    if (menuRef.value) resizeObserver.observe(menuRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <header
    ref="headerRef"
    class="site-header"
    :class="{ 'is-wide': isWide, 'is-measuring': isMeasuring }"
  >
    <div ref="innerRef" class="header-inner">
      <RouterLink to="/" class="site-logo" @click="closeNarrowMenu">
        <span class="logo-wordmark">CREDS</span>
        <span class="logo-subtitle">API Playground</span>
      </RouterLink>

      <nav class="site-nav" aria-label="Principal">
        <button
          class="menu-button"
          type="button"
          popovertarget="site-menu"
          popovertargetaction="toggle"
          aria-controls="site-menu"
        >
          <span aria-hidden="true">☰</span>
          <span>Menú</span>
        </button>

        <ul id="site-menu" ref="menuRef" class="site-menu" popover="auto">
          <li>
            <RouterLink to="/" class="nav-link" @click="closeNarrowMenu">
              <span aria-hidden="true" class="nav-marker"></span>
              <span>Inicio</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/nearby" class="nav-link" @click="closeNarrowMenu">
              <span aria-hidden="true" class="nav-marker"></span>
              <span>Búsqueda Cercana</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/search" class="nav-link" @click="closeNarrowMenu">
              <span aria-hidden="true" class="nav-marker"></span>
              <span>Búsqueda</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background-color: var(--creds-ink);
  color: var(--creds-white);
  border-block-end: 1px solid #2b303a;
  padding-inline: clamp(1rem, 3dvw, 2rem);
}

.header-inner {
  max-inline-size: 1440px;
  margin-inline: auto;
  min-block-size: 4.25rem;
  display: flex;
  align-items: safe center;
  justify-content: space-between;
  gap: 1.5rem;
}

.header-inner > * {
  flex-shrink: 0;
  white-space: nowrap;
}

.site-header.is-measuring * {
  transition: none !important;
}

.site-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  padding-block: 0.35rem;
}

.logo-wordmark {
  background-color: var(--creds-ink);
  color: var(--creds-lime);
  border: 1.5px solid var(--creds-lime);
  border-radius: 0.5rem;
  padding: 0.25rem 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 1rem;
}

.logo-subtitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: #d6dbe6;
}

.menu-button {
  anchor-name: --menu-button;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-block-size: 44px;
  padding-inline: 0.9rem;
  border-radius: 0.6rem;
  border: 1px solid #596273;
  background-color: #1c1f26;
  color: var(--creds-white);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.site-menu {
  position: fixed;
  inset: auto;
  inset-block-start: 4.5rem;
  inset-block-start: anchor(--menu-button bottom);
  inset-inline-end: 1rem;
  inline-size: min(82dvw, 20rem);
  max-inline-size: calc(100dvw - 2rem);
  block-size: fit-content;
  max-block-size: calc(100dvh - 6rem);
  margin-block-start: 0.5rem;
  padding: 0.5rem;
  list-style: none;
  background-color: #181b22;
  color: var(--creds-white);
  border: 1px solid #49505e;
  border-radius: 0.85rem;
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.45);
  overflow: auto;
}

.site-menu:not(:is(:popover-open, .\:popover-open)) {
  display: none;
}

.site-menu:is(:popover-open, .\:popover-open) {
  display: grid;
  gap: 0.25rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  inline-size: 100%;
  min-block-size: 44px;
  padding: 0.55rem 0.95rem;
  border-radius: 0.6rem;
  color: #e2e6ef;
  text-decoration: none;
  font-weight: 600;
  border: 1px solid transparent;
  transition: background-color 150ms ease, border-color 150ms ease;
}

.nav-link:hover {
  background-color: #242936;
  color: var(--creds-white);
}

.nav-marker {
  inline-size: 0.45rem;
  block-size: 0.45rem;
  border-radius: 999px;
  border: 1.5px solid #8a93a6;
}

.nav-link[aria-current='page'] {
  background-color: var(--creds-blue);
  color: var(--creds-white);
  border-color: #93a9ff;
  box-shadow: inset 0 -2px 0 var(--creds-white);
}

.nav-link[aria-current='page'] .nav-marker {
  background-color: var(--creds-white);
  border-color: var(--creds-white);
}

.site-header.is-wide .menu-button {
  display: none;
}

.site-header.is-wide .site-menu {
  position: static;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  inline-size: auto;
  max-inline-size: none;
  block-size: auto;
  max-block-size: none;
  overflow: visible;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.site-header.is-wide .site-menu::backdrop {
  display: none;
}

.site-header.is-wide .nav-link {
  inline-size: auto;
}

@media (forced-colors: active) {
  .nav-link[aria-current='page'] {
    outline: 2px solid Highlight;
  }
}
</style>

