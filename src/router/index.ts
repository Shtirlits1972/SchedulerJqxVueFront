import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

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

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!auth.initialized.value) {
    await auth.initialize()
  }
  auth.dropExpiredToken()

  const isAuth = auth.isAuthenticated.value
  if (!isAuth && to.name !== 'login' && to.name !== 'register') {
    return { name: 'login' }
  }

  if (isAuth && (to.name === 'login' || to.name === 'register')) {
    return { name: 'scheduler' }
  }

  return true
})

export default router
