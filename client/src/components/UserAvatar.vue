<template>
  <v-avatar :size="size" :color="color" :title="username || 'Пользователь'">
    <v-img v-if="avatarSource" :src="avatarSource" :alt="username || 'Аватар пользователя'" cover />
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
