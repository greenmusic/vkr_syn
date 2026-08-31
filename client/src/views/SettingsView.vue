<template>
  <v-app>
    <Header />

    <v-main>
      <v-container class="settings-page" max-width="760">
        <div class="settings-heading page-heading">
          <h1>Настройки профиля</h1>
          <p>Имя и аватар, которые видят участники досок</p>
        </div>

        <section class="settings-panel">
          <form class="settings-form" @submit.prevent="saveSettings">
            <div class="avatar-editor">
              <UserAvatar
                :avatar="avatarPreview"
                :username="username"
                :size="56"
                color="primary"
              />
              <div class="avatar-actions">
                <div class="avatar-row">
                  <v-file-input
                    class="avatar-file"
                    label="Изображение"
                    accept="image/*"
                    variant="outlined"
                    density="compact"
                    hide-details
                    prepend-icon=""
                    prepend-inner-icon="mdi-image-outline"
                    @update:model-value="selectAvatar"
                  />
                  <v-btn
                    type="button"
                    class="avatar-remove"
                    variant="outlined"
                    color="secondary"
                    :disabled="!avatarPreview"
                    @click="removeAvatar"
                  >
                    Удалить
                  </v-btn>
                </div>
                <small>PNG, JPG или GIF до 2 МБ</small>
              </div>
            </div>

            <v-text-field
              v-model="username"
              label="Имя пользователя"
              maxlength="100"
              variant="outlined"
              density="compact"
              hide-details
              required
            />
            <v-text-field
              :model-value="email"
              label="Email"
              type="email"
              variant="outlined"
              density="compact"
              hide-details
              disabled
            />

            <p v-if="message" class="status-message">{{ message }}</p>

            <div class="form-actions">
              <v-btn type="button" size="small" variant="text" @click="router.back()">Отмена</v-btn>
              <v-spacer />
              <v-btn type="submit" size="small" color="primary" :loading="saving">Сохранить</v-btn>
            </div>
          </form>
        </section>
      </v-container>
    </v-main>

    <AppPreloader :open="loading" />
    <v-spacer />
    <AppFooter />
  </v-app>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../components/header.vue'
import AppFooter from '../components/AppFooter.vue'
import AppPreloader from '../components/AppPreloader.vue'
import UserAvatar from '../components/UserAvatar.vue'
import api from '../api/index.js'
import { setSession } from '../auth/session.js'

const router = useRouter()
const username = ref('')
const email = ref('')
const avatar = ref(null)
const avatarPreview = ref(null)
const removeAvatarFlag = ref(false)
const avatarTooLarge = ref(false)
const saving = ref(false)
const loading = ref(true)
const message = ref('')

const selectAvatar = (value) => {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) {
    avatarTooLarge.value = false
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    avatar.value = null
    avatarTooLarge.value = true
    message.value = 'Размер аватара не должен превышать 2 МБ'
    return
  }

  avatar.value = file
  avatarTooLarge.value = false
  removeAvatarFlag.value = false
  avatarPreview.value = URL.createObjectURL(file)
  message.value = ''
}

const removeAvatar = () => {
  avatar.value = null
  avatarPreview.value = null
  removeAvatarFlag.value = true
}

const saveSettings = async () => {
  if (avatarTooLarge.value) {
    message.value = 'Выберите изображение размером не более 2 МБ'
    return
  }

  saving.value = true
  message.value = ''

  try {
    const formData = new FormData()
    formData.append('username', username.value)
    formData.append('removeAvatar', String(removeAvatarFlag.value))
    if (avatar.value) formData.append('avatar', avatar.value)

    const { data } = await api.patch('/settings', formData)
    username.value = data.username
    email.value = data.email
    avatarPreview.value = data.avatar
    avatar.value = null
    removeAvatarFlag.value = false
    setSession(data)
    message.value = 'Настройки сохранены'
  } catch (error) {
    message.value = error.response?.data?.error || 'Не удалось сохранить настройки'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/settings')
    username.value = data.username
    email.value = data.email
    avatarPreview.value = data.avatar
  } catch (error) {
    message.value = error.response?.data?.error || 'Не удалось загрузить настройки'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.settings-page {
  padding-top: 16px;
  padding-bottom: 32px;
}

.settings-panel {
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  overflow: hidden;
}

.settings-form {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.avatar-editor {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--app-border);
}

.avatar-actions {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 4px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.avatar-file {
  flex: 1;
  min-width: 0;
}

.avatar-remove {
  flex-shrink: 0;
  height: 40px;
}

.avatar-actions small {
  color: var(--main1);
  font-size: 11px;
}

.status-message {
  margin: 0;
  color: var(--accent1);
  font-size: 12px;
  font-weight: 600;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

@media (max-width: 600px) {
  .avatar-editor {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
