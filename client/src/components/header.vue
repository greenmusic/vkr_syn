<template>
  <v-app-bar color="banner" density="comfortable" elevation="2">
    <v-app-bar-title class="brand-title">
      <button type="button" class="brand-link" title="К проектам" @click="goToProjects">
        <svg width="156" height="44" viewBox="0 0 156 44">
          <use :href="brandLogo + '#logo-desc'" :xlink:href="brandLogo + '#logo-desc'" />
        </svg>
      </button>
    </v-app-bar-title>

    <v-btn
      v-if="currentUser"
      class="header-nav-btn"
      variant="text"
      color="black"
      prepend-icon="mdi-view-dashboard-outline"
      :class="{ 'header-nav-btn-active': isProjectsPage }"
      @click="goToProjects"
    >
      Проекты
    </v-btn>

    <template #append>
      <div v-if="currentUser" class="header-user">
        <v-btn
          class="header-nav-btn"
          variant="text"
          color="black"
          prepend-icon="mdi-format-list-checks"
          :class="{ 'header-nav-btn-active': isTasksPage }"
          @click="router.push('/tasks')"
        >
          Мои задачи
        </v-btn>
        <v-btn
          icon
          variant="text"
          title="Как пользоваться"
          aria-label="Как пользоваться"
          @click="openOnboarding"
        >
          <v-icon icon="mdi-help-circle-outline" />
        </v-btn>
        <v-btn icon variant="text" title="Настройки пользователя" @click="router.push('/settings')">
          <UserAvatar :avatar="currentUser.avatar" :username="currentUser.username" :size="34" />
        </v-btn>
        <span class="header-name">{{ currentUser.username }}</span>
        <v-btn variant="outlined" color="black" size="small" :loading="loggingOut" @click="logout">
          Выйти
        </v-btn>
      </div>
    </template>
  </v-app-bar>
</template>

<script setup>
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/index.js'
import { clearSession, getCachedUser } from '../auth/session.js'
import UserAvatar from './UserAvatar.vue'
import brandLogo from '../img/sprite.svg'

const router = useRouter()
const route = useRoute()
const currentUser = ref(getCachedUser())
const loggingOut = ref(false)

const isProjectsPage = computed(() => route.name === 'home')
const isTasksPage = computed(() => route.name === 'my-tasks')

const goToProjects = () => {
  router.push('/')
}

const openOnboarding = () => {
  sessionStorage.setItem('show-onboarding', '1')
  if (route.name === 'home' || route.name === 'board-view') {
    window.dispatchEvent(new CustomEvent('open-onboarding'))
    sessionStorage.removeItem('show-onboarding')
    return
  }
  router.push('/')
}

const handleUserUpdated = (event) => {
  currentUser.value = event.detail
}

const logout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await api.post('/logout')
  } catch (error) {
    console.error('[Header] Logout error:', error)
  } finally {
    clearSession()
    window.location.assign('/login')
  }
}

onMounted(() => {
  currentUser.value = getCachedUser()
  window.addEventListener('user-updated', handleUserUpdated)
})

onBeforeUnmount(() => {
  window.removeEventListener('user-updated', handleUserUpdated)
})
</script>

<style scoped>
.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-title {
  display: flex;
  align-items: center;
  margin-inline-end: 8px;
}

.brand-link {
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.header-nav-btn {
  font-weight: 600;
  letter-spacing: 0.01em;
  opacity: 0.88;
}

.header-name {
    color: var(--static2);
  font-size: var(--text-body);
  font-weight: 600;
}

.header-nav-btn-active {
  opacity: 1;
  background: rgba(0, 0, 0, 0.16);
}

.v-toolbar {
  background-color: var(--static1);
}

@media (max-width: 700px) {
  .header-name {
    display: none;
  }

  .header-nav-btn :deep(.v-btn__content) {
    display: none;
  }
}
</style>
