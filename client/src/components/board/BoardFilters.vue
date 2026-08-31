<template>
  <div class="board-filters">
    <v-autocomplete
      :model-value="participantIds"
      :items="users"
      item-title="username"
      item-value="id"
      label="Участники"
      placeholder="Все участники"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="board-filter-field"
      @update:model-value="$emit('update:participantIds', $event)"
    >
      <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="resolveUser(item).username">
          <template #prepend>
            <UserAvatar
              :avatar="userAvatarSrc(resolveUser(item))"
              :username="resolveUser(item).username"
              :size="30"
            />
          </template>
        </v-list-item>
      </template>
      <template #chip="{ props: chipProps, item }">
        <v-chip v-bind="chipProps" size="small">
          <template #prepend>
            <UserAvatar
              :avatar="userAvatarSrc(resolveUser(item))"
              :username="resolveUser(item).username"
              :size="22"
            />
          </template>
          {{ resolveUser(item).username }}
        </v-chip>
      </template>
    </v-autocomplete>
    <v-autocomplete
      :model-value="labelIds"
      :items="labels"
      item-title="title"
      item-value="id"
      label="Метки"
      placeholder="Все метки"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="board-filter-field"
      @update:model-value="$emit('update:labelIds', $event)"
    >
      <template #chip="{ props: chipProps, item }">
        <v-chip
          v-bind="chipProps"
          size="small"
          :style="{ backgroundColor: item?.raw?.color || '#0085ff', color: '#fff' }"
        >
          {{ item?.raw?.title || item?.title }}
        </v-chip>
      </template>
    </v-autocomplete>
    <v-text-field
      :model-value="keyword"
      label="Ключевые слова"
      placeholder="Поиск по названию и описанию"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="board-filter-field"
      @update:model-value="$emit('update:keyword', $event)"
    />
    <v-select
      :model-value="timeframe"
      :items="timeframeOptions"
      item-title="title"
      item-value="value"
      label="Срок"
      variant="outlined"
      density="compact"
      hide-details
      class="board-filter-field board-filter-field-small"
      @update:model-value="$emit('update:timeframe', $event)"
    />
    <v-btn v-if="hasActiveFilters" variant="text" size="small" @click="$emit('clear')">
      Сбросить фильтры
    </v-btn>
  </div>
</template>

<script setup>
import { timeframeOptions } from '../../utils/taskDisplay.js'
import { userAvatarSrc } from '../../utils/userDisplay.js'
import UserAvatar from '../UserAvatar.vue'

const props = defineProps({
  participantIds: { type: Array, default: () => [] },
  labelIds: { type: Array, default: () => [] },
  keyword: { type: String, default: '' },
  timeframe: { type: String, default: 'all' },
  users: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  hasActiveFilters: { type: Boolean, default: false },
})

defineEmits(['update:participantIds', 'update:labelIds', 'update:keyword', 'update:timeframe', 'clear'])

const resolveUser = (item) => {
  const raw = item?.raw ?? item
  if (raw && typeof raw === 'object' && (raw.username || raw.avatar || raw.avatarData)) {
    return raw
  }
  const id = raw?.value ?? raw?.id ?? raw
  return props.users.find((user) => String(user.id) === String(id)) || {}
}
</script>

<style scoped>
.board-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}

.board-filter-field {
  min-width: 180px;
  max-width: 260px;
}

.board-filter-field-small {
  min-width: 160px;
  max-width: 220px;
}
</style>
