<template>
  <v-avatar :size="size" :color="color" :title="username || 'Пользователь'" class="user-avatar">
    <img v-if="avatarSource" class="user-avatar-img" :src="avatarSource" :alt="username || ''" />
    <span v-else>{{ initial }}</span>
  </v-avatar>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  avatar: { type: String, default: null },
  username: { type: String, default: '' },
  size: { type: [Number, String], default: 34 },
  color: { type: String, default: 'primary' },
})

const avatarSource = computed(() => props.avatar || null)
const initial = computed(() => props.username?.charAt(0).toUpperCase() || '?')
</script>

<style scoped>
.user-avatar {
  flex-shrink: 0;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
