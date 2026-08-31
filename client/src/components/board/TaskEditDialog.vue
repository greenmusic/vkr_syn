<template>
  <v-dialog :model-value="open" max-width="900" @update:model-value="$emit('update:open', $event)">
    <v-card v-if="task" class="task-modal">
      <v-card-title class="app-dialog-title task-modal-title">
        <div class="task-modal-title-main">
          <v-icon icon="mdi-card-text-outline" class="task-modal-title-icon" />
          <v-text-field
            v-model="editingTitle"
            class="task-modal-title-input"
            placeholder="Введите название задачи"
            variant="plain"
            density="compact"
            hide-details
            :readonly="readOnly"
          />
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Закрыть"
          @click="close"
        />
      </v-card-title>
      <v-card-text class="task-modal-body">
        <div class="task-modal-main">
          <section class="task-modal-block">
            <span class="field-label">
              <v-icon icon="mdi-git" size="16" />
              Git ссылка
            </span>
            <div class="git-block">
              <v-text-field
                v-model.trim="editingGitLink"
                placeholder="https://github.com/..."
                type="url"
                variant="outlined"
                density="compact"
                hide-details
                :readonly="readOnly"
              />
              <div v-if="repoGitData" class="git-repo">
                <div class="git-repo-head">
                  <img
                    v-if="repoGitData.owner?.avatar_url"
                    class="git-repo-avatar"
                    :src="repoGitData.owner.avatar_url"
                    alt=""
                    width="28"
                    height="28"
                  />
                  <div class="git-repo-titles">
                    <strong>{{ repoGitData.name }}</strong>
                    <span v-if="repoGitData.owner?.login">{{ repoGitData.owner.login }}</span>
                  </div>
                </div>
                <p v-if="repoGitData.description" class="git-repo-desc">
                  {{ repoGitData.description }}
                </p>
                <dl class="git-repo-meta">
                  <div v-if="repoGitData.created_at">
                    <dt>Создано</dt>
                    <dd>{{ formatGitDate(repoGitData.created_at) }}</dd>
                  </div>
                  <div v-if="repoGitData.updated_at">
                    <dt>Обновлено</dt>
                    <dd>{{ formatGitDate(repoGitData.updated_at) }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section class="task-modal-block">
            <span class="field-label">
              <v-icon icon="mdi-text-long" size="16" />
              Описание
            </span>
            <v-textarea
              v-model="editingDescription"
              placeholder="Добавьте более подробное описание"
              rows="4"
              variant="outlined"
              hide-details
              :readonly="readOnly"
            />
          </section>

          <section class="task-modal-block checklist-section">
            <div class="checklist-heading">
              <span class="field-label">
                <v-icon icon="mdi-format-list-checks" size="16" />
                Чек-лист
              </span>
              <span class="checklist-count">{{ completedChecklistCount }}/{{ editingChecklist.length }}</span>
            </div>
            <div v-if="!readOnly" class="checklist-add">
              <v-text-field
                v-model.trim="newChecklistItem"
                placeholder="Добавить пункт"
                variant="outlined"
                density="compact"
                hide-details
                @keyup.enter="addChecklistItem"
              />
              <v-btn icon="mdi-plus" color="primary" size="x-small" @click="addChecklistItem" />
            </div>
            <v-list v-if="editingChecklist.length" class="checklist-list" lines="one">
              <v-list-item v-for="(item, index) in editingChecklist" :key="item.id || index">
                <template #prepend>
                  <v-checkbox-btn v-model="item.completed" color="primary" :disabled="readOnly" />
                </template>
                <v-list-item-title :class="{ 'checklist-completed': item.completed }">
                  {{ item.title }}
                </v-list-item-title>
                <template v-if="!readOnly" #append>
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    color="error"
                    size="x-small"
                    @click="removeChecklistItem(index)"
                  />
                </template>
              </v-list-item>
            </v-list>
            <p v-else class="checklist-empty">Добавьте первый пункт</p>
          </section>
        </div>

        <aside class="task-modal-sidebar">
          <section class="task-modal-block">
            <span class="field-label">
              <v-icon icon="mdi-account-multiple-outline" size="16" />
              Участники
            </span>
            <v-autocomplete
              v-model="editingParticipantIds"
              :items="users"
              item-title="username"
              item-value="id"
              placeholder="Начните вводить имя"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="compact"
              clearable
              hide-details
              :readonly="readOnly"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="resolveParticipant(item).username">
                  <template #prepend>
                    <UserAvatar
                      :avatar="userAvatarSrc(resolveParticipant(item))"
                      :username="resolveParticipant(item).username"
                      :size="30"
                    />
                  </template>
                </v-list-item>
              </template>
              <template #chip="{ props: chipProps, item }">
                <v-chip v-bind="chipProps" size="small">
                  <template #prepend>
                    <UserAvatar
                      :avatar="userAvatarSrc(resolveParticipant(item))"
                      :username="resolveParticipant(item).username"
                      :size="22"
                    />
                  </template>
                  {{ resolveParticipant(item).username || 'Участник' }}
                </v-chip>
              </template>
            </v-autocomplete>
          </section>

          <section v-if="board?.labels?.length" class="task-modal-block">
            <span class="field-label">
              <v-icon icon="mdi-label-outline" size="16" />
              Метки
            </span>
            <div class="task-label-picker">
              <button
                v-for="label in board.labels"
                :key="label.id"
                type="button"
                class="task-label-option"
                :class="{ 'task-label-option-active': editingLabelIds.includes(label.id) }"
                :style="{ background: label.color }"
                :disabled="readOnly"
                @click="toggleLabel(label.id)"
              >
                {{ label.title }}
                <v-icon v-if="editingLabelIds.includes(label.id)" icon="mdi-check" size="14" />
              </button>
            </div>
          </section>

          <section class="task-modal-block">
            <span class="field-label">
              <v-icon icon="mdi-flag-outline" size="16" />
              Приоритет
            </span>
            <v-select
              v-model="editingPriority"
              :items="priorityOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="readOnly"
            />
          </section>

          <section class="task-modal-block">
            <span class="field-label">
              <v-icon icon="mdi-clock-outline" size="16" />
              Срок исполнения
            </span>
            <v-text-field
              v-model="editingDueDate"
              type="datetime-local"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="readOnly"
            />
          </section>

          <section v-if="!readOnly" class="task-modal-block">
            <span class="field-label">Действия</span>
            <v-btn
              :color="editingCompleted ? 'success' : 'primary'"
              :variant="editingCompleted ? 'flat' : 'tonal'"
              prepend-icon="mdi-check-circle-outline"
              block
              @click="editingCompleted = !editingCompleted"
            >
              {{ editingCompleted ? 'Задача выполнена' : 'Выполнено' }}
            </v-btn>
          </section>
          <section v-else class="task-modal-block">
            <span class="field-label">Статус</span>
            <v-chip :color="editingCompleted ? 'success' : 'primary'" variant="flat">
              {{ editingCompleted ? 'Задача выполнена' : 'В работе' }}
            </v-chip>
          </section>
        </aside>
      </v-card-text>
      <v-card-actions class="app-dialog-actions">
        <template v-if="readOnly">
          <v-spacer />
          <v-btn variant="text" @click="close">Закрыть</v-btn>
        </template>
        <template v-else>
          <v-btn color="error" variant="text" @click="$emit('request-delete')">Удалить</v-btn>
          <v-spacer />
          <v-btn color="primary" :loading="saving" @click="save">Сохранить</v-btn>
          <v-btn variant="text" @click="close">Закрыть</v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import axios from 'axios'
import { computed, ref, watch } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import { priorityOptions } from '../../utils/taskDisplay.js'
import { userAvatarSrc } from '../../utils/userDisplay.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null },
  board: { type: Object, default: null },
  users: { type: Array, default: () => [] },
  readOnly: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'save', 'request-delete'])

const editingTitle = ref('')
const editingDescription = ref('')
const editingDueDate = ref('')
const editingGitLink = ref('')
const editingPriority = ref('medium')
const editingParticipantIds = ref([])
const editingLabelIds = ref([])
const editingCompleted = ref(false)
const editingChecklist = ref([])
const newChecklistItem = ref('')
const repoGitData = ref(null)

const completedChecklistCount = computed(
  () => editingChecklist.value.filter((item) => item.completed).length,
)

const formatGitDate = (value) =>
  new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const toDateTimeLocal = (date) => {
  if (!date) return ''
  const value = new Date(date)
  const offset = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

const normalizeRepoData = (provider, data) => {
  if (provider === 'github') {
    return {
      name: data.name,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at,
      owner: {
        login: data.owner?.login,
        avatar_url: data.owner?.avatar_url,
      },
    }
  }
  if (provider === 'gitlab') {
    return {
      name: data.name,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.last_activity_at,
      owner: {
        login: data.namespace?.path,
        avatar_url:
          data.namespace?.avatar_url || data.avatar_url
            ? `https://gitlab.com/${data.namespace?.avatar_url || data.avatar_url}`
            : null,
      },
    }
  }
  if (provider === 'bitbucket') {
    return {
      name: data.name,
      description: data.description,
      created_at: data.created_on,
      updated_at: data.updated_on,
      owner: {
        login: data.owner?.display_name || data.owner?.username,
        avatar_url: data.owner?.links?.avatar?.href,
      },
    }
  }
  return null
}

const gitLinkData = (link) => {
  repoGitData.value = null
  let url
  try {
    url = new URL(link)
  } catch {
    return
  }

  const host = url.hostname.replace(/^www\./, '')
  const [owner, repoRaw] = url.pathname.split('/').filter(Boolean)
  const repo = repoRaw?.replace(/\.git$/, '')
  if (!owner || !repo) return

  let provider
  let apiUrl
  if (host.includes('github.com')) {
    provider = 'github'
    apiUrl = `https://api.github.com/repos/${owner}/${repo}`
  } else if (host.includes('gitlab.com')) {
    provider = 'gitlab'
    apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`
  } else if (host.includes('bitbucket.org')) {
    provider = 'bitbucket'
    apiUrl = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`
  } else {
    return
  }

  axios
    .get(apiUrl)
    .then((response) => {
      repoGitData.value = normalizeRepoData(provider, response.data)
    })
    .catch((error) => {
      console.error('[Board] Failed to load repository info:', error)
    })
}

const resolveParticipant = (item) => {
  const raw = item?.raw ?? item
  if (raw && typeof raw === 'object' && raw.username) return raw
  const id = raw?.value ?? raw
  return props.users.find((user) => String(user.id) === String(id)) || {}
}

const hydrate = (task) => {
  editingTitle.value = task.title || ''
  editingDescription.value = task.description || ''
  editingDueDate.value = toDateTimeLocal(task.dueDate)
  editingGitLink.value = task.gitLink || ''
  editingPriority.value = task.priority || 'medium'
  repoGitData.value = null
  editingParticipantIds.value = (task.participants || []).map((participant) => String(participant.id))
  editingLabelIds.value = (task.labels || []).map((label) => label.id)
  editingCompleted.value = Boolean(task.completed)
  editingChecklist.value = (task.checklist || []).map((item) => ({ ...item }))
  newChecklistItem.value = ''
  if (editingGitLink.value) gitLinkData(editingGitLink.value)
}

watch(
  () => [props.open, props.task],
  ([open, task]) => {
    if (open && task) hydrate(task)
  },
)

const toggleLabel = (labelId) => {
  editingLabelIds.value = editingLabelIds.value.includes(labelId)
    ? editingLabelIds.value.filter((id) => id !== labelId)
    : [...editingLabelIds.value, labelId]
}

const addChecklistItem = () => {
  const title = newChecklistItem.value.trim()
  if (!title) return
  editingChecklist.value.push({ title, completed: false })
  newChecklistItem.value = ''
}

const removeChecklistItem = (index) => {
  editingChecklist.value.splice(index, 1)
}

const close = () => emit('update:open', false)

const save = () => {
  if (props.saving) return
  const title = editingTitle.value.trim()
  if (!title || !props.task) return
  emit('save', props.task, {
    title,
    description: editingDescription.value,
    dueDate: editingDueDate.value ? new Date(editingDueDate.value).toISOString() : null,
    gitLink: editingGitLink.value,
    priority: editingPriority.value,
    participantIds: editingParticipantIds.value,
    labelIds: editingLabelIds.value,
    completed: editingCompleted.value,
    checklist: editingChecklist.value,
  })
  if (editingGitLink.value) gitLinkData(editingGitLink.value)
}
</script>

<style scoped>
.task-modal-title {
  color: var(--app-heading);
}

.task-modal-title-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
}

.task-modal-title-icon {
  color: var(--accent2);
}

.task-modal-title-input :deep(input) {
  color: var(--app-heading);
  font-size: var(--text-title);
  font-weight: 700;
}

.task-modal-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
}

.task-modal-main,
.task-modal-sidebar,
.task-modal-block,
.checklist-section {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.task-modal-block,
.checklist-section {
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--app-muted);
  font-size: 13px;
  font-weight: 700;
}

.checklist-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checklist-count {
  color: var(--accent2);
  font-size: 12px;
  font-weight: 700;
}

.checklist-add {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.checklist-add .v-text-field {
  flex: 1;
}

.checklist-list {
  padding: 0;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.checklist-completed {
  color: var(--main1);
  text-decoration: line-through;
}

.checklist-empty {
  margin: 0;
  color: var(--main1);
  font-size: 13px;
}

.task-label-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-label-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 2px solid transparent;
  border-radius: 6px;
  color: var(--white-change);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(3, 11, 58, 0.25);
  opacity: 0.6;
}

.task-label-option-active {
  border-color: var(--banner-bg);
  opacity: 1;
}

.git-block {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.git-repo {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--secondary3);
}

.git-repo-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.git-repo-avatar {
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.git-repo-titles {
  display: grid;
  min-width: 0;
}

.git-repo-titles strong {
  color: var(--app-heading);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}

.git-repo-titles span {
  color: var(--app-muted);
  font-size: 12px;
}

.git-repo-desc {
  margin: 0;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.4;
}

.git-repo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin: 0;
}

.git-repo-meta div {
  display: grid;
  gap: 1px;
}

.git-repo-meta dt {
  color: var(--main1);
  font-size: 11px;
  font-weight: 700;
}

.git-repo-meta dd {
  margin: 0;
  color: var(--app-text);
  font-size: 12px;
}

@media (max-width: 720px) {
  .task-modal-body {
    grid-template-columns: 1fr;
  }
}
</style>
