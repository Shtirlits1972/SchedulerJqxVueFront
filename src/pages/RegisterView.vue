<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'

const auth = useAuth()
const router = useRouter()

const isLoading = computed(() => auth.isLoading.value)
const errorMessage = computed(() => auth.error.value ?? '')

const form = reactive({
  email: '',
  password: '',
  usersName: '',
})

onMounted(() => {
  auth.initialize()
  auth.dropExpiredToken()
})

const submit = async () => {
  auth.clearError()
  try {
    await auth.register(form.email.trim(), form.password, form.usersName.trim())
    await router.push({ name: 'scheduler' })
  } catch {
    // ошибка уже сохранена в store
  }
}
</script>

<template>
  <section class="auth">
    <div class="auth__card">
      <h1 class="auth__title">Регистрация</h1>
      <p class="auth__subtitle">Создайте аккаунт, чтобы войти в систему.</p>

      <form class="auth__form" @submit.prevent="submit">
        <label class="auth__field">
          <span>Email</span>
          <input v-model="form.email" class="auth__input" type="email" required />
        </label>

        <label class="auth__field">
          <span>Имя пользователя</span>
          <input v-model="form.usersName" class="auth__input" type="text" required />
        </label>

        <label class="auth__field">
          <span>Пароль</span>
          <input v-model="form.password" class="auth__input" type="password" required />
        </label>

        <p v-if="errorMessage" class="auth__error">{{ errorMessage }}</p>

        <button class="auth__button" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Создаём…' : 'Зарегистрироваться' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.auth {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.auth__card {
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth__title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
}

.auth__subtitle {
  margin: 0;
  color: #4b5563;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #0f172a;
  font-weight: 600;
}

.auth__input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0.65rem 0.75rem;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth__input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.auth__error {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecdd3;
}

.auth__button {
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.auth__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth__button:not(:disabled):hover {
  background: #1d4ed8;
}

.auth__button:not(:disabled):active {
  transform: translateY(1px);
}
</style>
