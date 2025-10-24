import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import LoginPage from '@/views/LoginPage.vue';
import MainPage from '@/views/MainPage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      name: 'main',
      component: MainPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'login' },
    },
  ],
});

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // User is not authenticated, redirect to login
      next({ name: 'login' });
      return;
    }
  }

  // Check if route is for guests only (login page)
  if (to.meta.requiresGuest) {
    if (authStore.isAuthenticated) {
      // User is already authenticated, redirect to main
      next({ name: 'main' });
      return;
    }
  }

  // Allow navigation
  next();
});

export default router;
