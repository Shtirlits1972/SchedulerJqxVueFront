<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from './stores/auth'

const auth = useAuth()
const router = useRouter()

const isAuthenticated = computed(() => auth.isAuthenticated.value)
const userName = computed(() => auth.userName.value || 'Пользователь')
const isLoading = computed(() => auth.isLoading.value)

onMounted(() => {
  auth.initialize()
  auth.dropExpiredToken()
})

const handleLogout = async () => {
  try {
    await auth.logout()
    await router.push({ name: 'login' })
  } catch {
    // ошибка уже сохранена в store
  }
}
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <nav class="nav">
        <div class="nav__group">
          <RouterLink class="nav__link" to="/scheduler">Scheduler</RouterLink>
          <RouterLink class="nav__link" to="/locations">Locations</RouterLink>
          <RouterLink class="nav__link" to="/users">Users</RouterLink>
        </div>
        <div class="nav__group nav__group--auth">
          <template v-if="isAuthenticated">
            <span class="nav__user">{{ userName }}</span>
            <button class="nav__link nav__button" type="button" @click="handleLogout" :disabled="isLoading">
              Выйти
            </button>
          </template>
          <template v-else>
            <RouterLink class="nav__link" to="/login">Вход</RouterLink>
            <RouterLink class="nav__link" to="/register">Регистрация</RouterLink>
          </template>
        </div>
      </nav>
    </header>

    <main class="layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
  color: #0f172a;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.layout__header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #0f172a;
  padding: 0.9rem 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.nav__group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav__group--auth {
  gap: 0.5rem;
}

.nav__link {
  color: #e2e8f0;
  text-decoration: none;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav__link.router-link-active {
  background: #1e293b;
  color: #ffffff;
}

.nav__link:not(.router-link-active):hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav__button {
  border: none;
  background: #1d4ed8;
  cursor: pointer;
}

.nav__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nav__user {
  color: #cbd5e1;
  font-weight: 700;
}

.layout__main {
  padding: 2rem 1.5rem;
}
</style>
