<template>
  <v-app>
    <v-main class="auth-page">
      <v-container class="auth-container" max-width="980">
        <div class="auth-heading">
          <p class="auth-eyebrow">Менеджер проектов и задач</p>
        </div>

        <v-row class="auth-row" align="stretch" justify="center" dense>
          <v-col cols="12" md="6" v-if="showRegisterForm">
            <v-card height="100%" elevation="2">
              <v-card-item>
                <v-card-title>Регистрация</v-card-title>
                <v-card-subtitle>Создайте новый профиль</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <form class="auth-form" @submit.prevent="registerUser" autocomplete="on">
                  <v-text-field
                    v-model="registerForm.username"
                    name="username"
                    label="Имя пользователя"
                    autocomplete="username"
                    density="comfortable"
                    hide-details="auto"
                    required
                  />
                  <v-text-field
                    v-model="registerForm.email"
                    name="email"
                    type="email"
                    label="Email"
                    autocomplete="email"
                    density="comfortable"
                    hide-details="auto"
                    required
                  />
                  <v-text-field
                    v-model="registerForm.password"
                    name="new-password"
                    type="password"
                    label="Пароль"
                    autocomplete="new-password"
                    density="comfortable"
                    hide-details="auto"
                    required
                  />
                  <v-btn type="submit" color="primary" block :loading="submitting">Зарегистрироваться</v-btn>
                  <div class="auth-link" @click="showRegisterForm = false">Уже есть аккаунт? Войти</div>
                </form>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6" v-else>
            <v-card height="100%" elevation="2">
              <v-card-item>
                <v-card-title>Вход</v-card-title>
                <v-card-subtitle>Продолжите работу с board</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <form class="auth-form" @submit.prevent="loginUser" autocomplete="on">
                  <v-text-field
                    v-model="loginForm.email"
                    name="email"
                    type="email"
                    label="Email"
                    autocomplete="username"
                    density="comfortable"
                    hide-details="auto"
                    required
                  />
                  <v-text-field
                    v-model="loginForm.password"
                    name="password"
                    type="password"
                    label="Пароль"
                    autocomplete="current-password"
                    density="comfortable"
                    hide-details="auto"
                    required
                  />
                  <v-btn type="submit" color="primary" block :loading="submitting">Войти</v-btn>
                  <template v-if="bitrix.enabled">
                    <div class="auth-divider">или</div>
                    <v-text-field
                      v-if="bitrix.allowCustom"
                      v-model.trim="bitrixPortal"
                      label="Адрес портала Bitrix24"
                      placeholder="company.bitrix24.ru"
                      density="comfortable"
                      hide-details
                    />
                    <v-btn
                      type="button"
                      color="#32c5ff"
                      class="bitrix-btn"
                      block
                      prepend-icon="mdi-login-variant"
                      :loading="submitting"
                      @click="loginWithBitrix"
                    >
                      Войти через Bitrix24
                    </v-btn>
                  </template>
                  <div class="auth-link" @click="showRegisterForm = true">Зарегистрироваться</div>
                </form>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-if="message" class="mt-5" type="info" variant="tonal">{{ message }}</v-alert>
      </v-container>
    </v-main>

    <AppPreloader :open="loadingConfig || submitting" />
    <v-spacer />
    <AppFooter />
  </v-app>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import AppPreloader from '../components/AppPreloader.vue'
import api from '../api/index.js'
import { setSession } from '../auth/session.js'

const router = useRouter()
const route = useRoute()

const message = ref('')
const submitting = ref(false)
const loadingConfig = ref(true)
const showRegisterForm = ref(false)
const bitrix = ref({ enabled: false, domain: '', allowCustom: false })
const bitrixPortal = ref('')

const bitrixErrors = {
  bitrix_not_configured: 'Вход через Bitrix24 не настроен на сервере.',
  bitrix_portal: 'Укажите адрес портала Bitrix24.',
  bitrix_denied: 'Вход через Bitrix24 отменён.',
  bitrix_state: 'Сессия входа Bitrix24 устарела. Попробуйте ещё раз.',
  bitrix_token: 'Не удалось получить доступ из Bitrix24. Проверьте настройки приложения.',
}

const registerForm = ref({
  username: '',
  email: '',
  password: '',
})

const loginForm = ref({
  email: '',
  password: '',
})

const goAfterAuth = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  const safeRedirect =
    redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  router.replace(safeRedirect)
}

const loginWithBitrix = () => {
  submitting.value = true
  const params = new URLSearchParams()
  if (bitrix.value.allowCustom && bitrixPortal.value) {
    params.set('portal', bitrixPortal.value)
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  if (redirect.startsWith('/') && !redirect.startsWith('//')) {
    params.set('redirect', redirect)
  }
  window.location.href = `/api/bitrix24/start?${params.toString()}`
}

const applyAutofillToModel = () => {
  const readNativeValue = (selector) => {
    const input = document.querySelector(`.auth-form ${selector}`)
    return input?.value || ''
  }

  const email = readNativeValue('input[name="email"]')
  const password = readNativeValue('input[name="password"]')
  const username = readNativeValue('input[name="username"]')
  const newPassword = readNativeValue('input[name="new-password"]')

  if (email && !loginForm.value.email) loginForm.value.email = email
  if (password && !loginForm.value.password) loginForm.value.password = password
  if (username && !registerForm.value.username) registerForm.value.username = username
  if (email && showRegisterForm.value && !registerForm.value.email) {
    registerForm.value.email = email
  }
  if (newPassword && !registerForm.value.password) registerForm.value.password = newPassword
}

onMounted(async () => {
  const errorCode = typeof route.query.error === 'string' ? route.query.error : ''
  if (errorCode && bitrixErrors[errorCode]) {
    message.value = bitrixErrors[errorCode]
  }
  loadingConfig.value = true
  try {
    const { data } = await api.get('/bitrix24/config')
    bitrix.value = data
    bitrixPortal.value = data.domain || ''
  } catch {
    bitrix.value = { enabled: false, domain: '', allowCustom: false }
  } finally {
    loadingConfig.value = false
  }

  await nextTick()
  applyAutofillToModel()
  const form = document.querySelector('.auth-form')
  form?.addEventListener('animationstart', applyAutofillToModel)
  window.setTimeout(applyAutofillToModel, 50)
  window.setTimeout(applyAutofillToModel, 300)
})

const registerUser = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    const response = await api.post('/register', registerForm.value)
    setSession(response.data.user)
    message.value = response.data.message
    registerForm.value = { username: '', email: '', password: '' }
    goAfterAuth()
  } catch (error) {
    message.value = error.response?.data?.error || 'Ошибка регистрации'
  } finally {
    submitting.value = false
  }
}

const loginUser = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    const response = await api.post('/login', loginForm.value)
    setSession(response.data.user)
    message.value = `${response.data.message}: ${response.data.user.email}`
    loginForm.value = { email: '', password: '' }
    goAfterAuth()
  } catch (error) {
    message.value = error.response?.data?.error || 'Ошибка входа'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg), var(--accent5));
}

.auth-container {
  padding-top: 72px;
}

.auth-heading {
  max-width: 680px;
  margin: 0 auto 34px;
  text-align: center;
}

.auth-eyebrow {
  margin-bottom: 8px;
  color: var(--accent1);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.auth-heading h1 {
  margin-bottom: 8px;
  color: var(--app-heading);
  font-size: 22px;
  line-height: 1.2;
}

.auth-heading p:last-child {
  margin: 0;
  color: var(--app-muted);
  font-size: var(--text-body);
}

.auth-form {
  display: grid;
  gap: 12px;
}

.auth-form :deep(input:-webkit-autofill),
.auth-form :deep(input:-webkit-autofill:hover),
.auth-form :deep(input:-webkit-autofill:focus) {
  -webkit-text-fill-color: var(--app-text);
  caret-color: var(--app-text);
  box-shadow: 0 0 0 1000px var(--app-surface) inset;
  transition: background-color 99999s ease-out;
  animation: on-autofill-start 0.01s;
}

@keyframes on-autofill-start {
  from {
    opacity: 0.99;
  }
  to {
    opacity: 1;
  }
}

.auth-form :deep(.v-field:has(input:-webkit-autofill) .v-field-label:not(.v-field-label--floating)) {
  opacity: 0;
}

@media (max-width: 600px) {
  .auth-container {
    padding-top: 36px;
  }
}

.auth-link{
  cursor: pointer;
}

.auth-divider {
  margin: 8px 0 4px;
  color: var(--main1);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
}

.bitrix-btn {
  color: var(--static2);
  font-weight: 700;
}
</style>
