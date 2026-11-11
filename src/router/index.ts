import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import NearbyView from '../views/NearbyView.vue';
import SearchView from '../views/SearchView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/nearby',
      name: 'nearby',
      component: NearbyView,
    },
    {
      path: '/search',
      name: 'search',
      component: SearchView,
    },
  ],
});

