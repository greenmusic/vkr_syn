<template>
  <v-dialog :model-value="open" max-width="560" @update:model-value="$emit('update:open', $event)">
    <v-card>
      <v-card-title class="app-dialog-title">
        Настройки доски
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Закрыть"
          @click="$emit('update:open', false)"
        />
      </v-card-title>
      <v-card-text class="app-dialog-content">
        <h3 class="app-dialog-section">О проекте</h3>
        <div class="settings-row">
          <v-text-field
            :model-value="name"
            label="Название"
            maxlength="255"
            hide-details
            @update:model-value="$emit('update:name', $event)"
          />
          <v-select
            :items="visibilityOptions"
            :model-value="visibility"
            item-title="title"
            item-value="value"
            label="Видимость"
            hide-details
            class="settings-visibility"
            @update:model-value="$emit('update:visibility', $event)"
          />
        </div>
        <v-textarea
          :model-value="description"
          label="Описание"
          rows="1"
          auto-grow
          max-rows="3"
          hide-details
          @update:model-value="$emit('update:description', $event)"
        />
        <div class="settings-row">
          <v-text-field
            :model-value="startDate"
            type="date"
            label="Начало"
            hide-details
            @update:model-value="$emit('update:startDate', $event)"
          />
          <v-text-field
            :model-value="dueDate"
            type="date"
            label="Срок"
            hide-details
            @update:model-value="$emit('update:dueDate', $event)"
          />
          <v-select
            :model-value="status"
            :items="projectStatusOptions"
            item-title="title"
            item-value="value"
            label="Статус"
            hide-details
            class="settings-status"
            @update:model-value="$emit('update:status', $event)"
          />
        </div>

        <v-divider />
        <h3 class="app-dialog-section">Участники</h3>
        <div class="settings-row settings-row-wrap">
          <v-autocomplete
            :model-value="newMemberId"
            :items="userSearchResults"
            item-title="username"
            item-value="id"
            label="Пользователь"
            placeholder="Имя или email"
            hide-details
            :loading="searchingUsers"
            @update:model-value="$emit('update:newMemberId', $event)"
            @update:search="$emit('search-users', $event)"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="item.raw?.username">
                <template #prepend>
                  <UserAvatar
                    :avatar="userAvatarSrc(item.raw)"
                    :username="item.raw?.username"
                    :size="30"
                  />
                </template>
              </v-list-item>
            </template>
            <template #selection="{ item }">
              <div class="member-selection">
                <UserAvatar
                  :avatar="userAvatarSrc(item.raw)"
                  :username="item.raw?.username"
                  :size="22"
                />
                <span>{{ item.raw?.username }}</span>
              </div>
            </template>
          </v-autocomplete>
          <v-select
            :model-value="newMemberRole"
            :items="memberRoleOptions"
            item-title="title"
            item-value="value"
            label="Доступ"
            hide-details
            class="member-role-select"
            @update:model-value="$emit('update:newMemberRole', $event)"
          />
          <v-btn type="button" color="primary" @click="$emit('add-member')">Добавить</v-btn>
        </div>
        <div v-if="project?.members?.length" class="member-list">
          <span v-for="member in project.members" :key="member.id" class="member-chip">
            <UserAvatar :avatar="userAvatarSrc(member)" :username="member.username" :size="22" />
            {{ member.username }}
            <span class="member-role-badge">
              {{ member.role === 'viewer' ? 'просмотр' : 'редактор' }}
            </span>
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              title="Удалить участника"
              aria-label="Удалить участника"
              @click="$emit('remove-member', member.id)"
            />
          </span>
        </div>

        <v-divider />
        <h3 class="app-dialog-section">Метки</h3>
        <div class="settings-row">
          <v-text-field
            :model-value="newLabelTitle"
            label="Название метки"
            hide-details
            @update:model-value="$emit('update:newLabelTitle', $event)"
            @keyup.enter="$emit('add-label')"
          />
          <input
            :value="newLabelColor"
            type="color"
            class="label-color-input"
            aria-label="Цвет метки"
            @input="$emit('update:newLabelColor', $event.target.value)"
          />
          <v-btn type="button" color="primary" @click="$emit('add-label')">Добавить</v-btn>
        </div>
        <div v-if="project?.labels?.length" class="label-list">
          <span
            v-for="label in project.labels"
            :key="label.id"
            class="label-chip"
            :style="{ backgroundColor: label.color }"
          >
            {{ label.title }}
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              @click="$emit('remove-label', label.id)"
            />
          </span>
        </div>

        <v-divider />
        <h3 class="app-dialog-section">Фон</h3>
        <div class="settings-row settings-row-wrap">
          <v-file-input
            :model-value="pendingBackground"
            label="Изображение"
            accept="image/*"
            hide-details
            prepend-icon="mdi-image-outline"
            class="settings-file"
            @update:model-value="$emit('update:pendingBackground', $event)"
          />
          <v-btn
            v-if="showClearBackground"
            type="button"
            variant="tonal"
            color="secondary"
            @click="$emit('remove-background')"
          >
            Убрать фон
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions class="app-dialog-actions">
        <v-btn color="error" variant="text" @click="confirmDeleteOpen = true">Удалить</v-btn>
        <v-spacer />
        <v-btn color="primary" :loading="saving" @click="$emit('save-project')">Сохранить</v-btn>
        <v-btn variant="text" @click="$emit('update:open', false)">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <AppConfirmDialog
    v-model:open="confirmDeleteOpen"
    title="Удалить доску?"
    :text="`Доска «${project?.name || ''}» будет удалена безвозвратно.`"
    :loading="deleting"
    @confirm="confirmDelete"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppConfirmDialog from '../AppConfirmDialog.vue'
import UserAvatar from '../UserAvatar.vue'
import { userAvatarSrc } from '../../utils/userDisplay.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false },
  project: { type: Object, default: null },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, default: 'active' },
  startDate: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  visibility: { type: String, default: 'private' },
  pendingBackground: { type: [Object, Array, File], default: null },
  pendingRemoveBackground: { type: Boolean, default: false },
  projectStatusOptions: { type: Array, default: () => [] },
  visibilityOptions: { type: Array, default: () => [] },
  newMemberId: { type: [String, Number], default: '' },
  newMemberRole: { type: String, default: 'viewer' },
  memberRoleOptions: { type: Array, default: () => [] },
  userSearchResults: { type: Array, default: () => [] },
  searchingUsers: { type: Boolean, default: false },
  newLabelTitle: { type: String, default: '' },
  newLabelColor: { type: String, default: '#0085ff' },
})

const emit = defineEmits([
  'update:open',
  'update:name',
  'update:description',
  'update:status',
  'update:startDate',
  'update:dueDate',
  'update:visibility',
  'update:pendingBackground',
  'update:newMemberId',
  'update:newMemberRole',
  'update:newLabelTitle',
  'update:newLabelColor',
  'save-project',
  'remove-background',
  'search-users',
  'add-member',
  'remove-member',
  'add-label',
  'remove-label',
  'delete-board',
])

const confirmDeleteOpen = ref(false)

const showClearBackground = computed(() => {
  const file = Array.isArray(props.pendingBackground)
    ? props.pendingBackground[0]
    : props.pendingBackground
  if (file) return true
  return Boolean(props.project?.background) && !props.pendingRemoveBackground
})

const confirmDelete = () => {
  emit('delete-board')
}

watch(
  () => props.open,
  (open) => {
    if (!open) confirmDeleteOpen.value = false
  },
)
</script>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-row-wrap {
  flex-wrap: wrap;
}

.settings-status,
.member-role-select {
  flex: 0 0 150px;
  max-width: 150px;
}

.settings-visibility {
  flex: 0 0 160px;
  max-width: 160px;
}

.settings-file {
  flex: 1;
  min-width: 160px;
}

.member-list,
.label-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.member-chip,
.label-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 2px 4px;
  border-radius: 999px;
  background: var(--accent5);
  color: var(--banner-bg);
  font-size: 12px;
  font-weight: 700;
}

.member-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.label-chip {
  border-radius: 6px;
  color: var(--white-change);
  text-shadow: 0 1px 2px rgba(3, 11, 58, 0.25);
}

.member-role-badge {
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--secondary3);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.label-color-input {
  flex: 0 0 auto;
  width: 36px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  cursor: pointer;
}

@media (max-width: 700px) {
  .settings-row {
    flex-wrap: wrap;
  }

  .settings-status,
  .member-role-select,
  .settings-visibility {
    flex: 1 1 140px;
    max-width: none;
  }
}
</style>
