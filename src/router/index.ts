import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'scheduler' },
    },
    {
      path: '/scheduler',
      name: 'scheduler',
      component: () => import('../pages/SchedulerPage.vue'),
    },
    {
      path: '/locations',
      name: 'locations',
      component: () => import('../pages/LocationsPage.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../pages/UsersPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/RegisterView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'scheduler' },
    },
  ],
})

export default router
