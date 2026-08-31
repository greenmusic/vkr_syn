<template>
  <article
    :class="{
      dragging,
      'task-card-editable': canEdit,
      'task-card-completed': task.completed,
      'task-card-overdue': !task.completed && dueDateStatus(task) === 'overdue',
      'task-card-due-today': !task.completed && dueDateStatus(task) === 'due-today',
      'task-card-focused': focused,
    }"
    class="task-card"
    :data-task-id="task.id"
  >
    <div v-if="task.labels?.length" class="task-labels">
      <span
        v-for="label in task.labels"
        :key="label.id"
        class="task-label-chip"
        :style="{ backgroundColor: label.color }"
        :title="label.title"
      >{{ label.title }}</span>
    </div>
    <div class="task-title-row">
      <h4>{{ task.title }}</h4>
      <button
        v-if="canView"
        type="button"
        class="edit-task-button"
        :title="canEdit ? 'Настройки задачи' : 'Просмотреть задачу'"
        :aria-label="canEdit ? 'Настройки задачи' : 'Просмотреть задачу'"
        @click="$emit('open', task)"
      >
        {{ canEdit ? '✎' : '👁' }}
      </button>
      <div v-if="task.participants?.length" class="task-assignees" aria-label="Участники задачи">
        <UserAvatar
          v-for="participant in task.participants"
          :key="participant.id"
          class="task-assignee-avatar"
          :avatar="participant.avatar || participant.avatarData || null"
          :username="participant.username"
          :size="30"
        />
      </div>
    </div>
    <v-chip size="x-small" :color="priorityColor(task.priority)" variant="tonal" class="task-priority">
      {{ priorityLabel(task.priority) }}
    </v-chip>
    <div v-if="isSafeHttpUrl(task.gitLink)" class="task-git-link">
      <v-icon icon="mdi-git" size="12" />
      <a :href="task.gitLink" target="_blank" rel="noopener noreferrer" title="Открыть в Git">
        {{ gitLinkLabel(task.gitLink) }}
      </a>
    </div>
    <div
      v-if="task.dueDate"
      class="task-due-date"
      :class="{
        'task-due-date-overdue': !task.completed && dueDateStatus(task) === 'overdue',
        'task-due-date-today': !task.completed && dueDateStatus(task) === 'due-today',
      }"
    >
      <v-icon icon="mdi-clock-outline" size="14" />
      {{ formatDueDate(task.dueDate) }}
    </div>
    <div
      v-if="task.checklist?.length"
      class="task-checklist-progress"
      :class="{ 'task-checklist-done': checklistProgress(task.checklist).done }"
    >
      ✅︎ {{ checklistProgress(task.checklist).label }}
    </div>
  </article>
</template>

<script setup>
import UserAvatar from '../UserAvatar.vue'
import {
  checklistProgress,
  dueDateStatus,
  formatDueDate,
  gitLinkLabel,
  isSafeHttpUrl,
  priorityColor,
  priorityLabel,
} from '../../utils/taskDisplay.js'

defineProps({
  task: { type: Object, required: true },
  canView: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  dragging: { type: Boolean, default: false },
  focused: { type: Boolean, default: false },
})

defineEmits(['open'])
</script>

<style scoped>
.task-card {
  margin-bottom: 12px;
  padding: 12px 12px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: 0 1px 2px rgba(31, 46, 67, 0.12);
  cursor: default;
  user-select: none;
  transition:
    opacity 0.15s ease,
    box-shadow 0.15s ease;
}

.task-card-editable {
  cursor: grab;
  touch-action: none;
}

.task-card-editable:active {
  cursor: grabbing;
}

.task-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.task-label-chip {
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--white-change);
  font-size: 11px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(3, 11, 58, 0.25);
}

.task-card h4 {
  min-width: 0;
  margin: 0;
  color: var(--app-text);
  font-size: 15px;
  line-height: 1.5;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.task-title-row h4 {
  flex: 1;
}

.edit-task-button {
  flex: 0 0 auto;
  width: 24px;
  min-width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--main1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.edit-task-button:hover {
  background: var(--accent5);
  color: var(--accent1);
}

.task-assignees {
  display: flex;
  flex-shrink: 0;
  padding-left: 6px;
}

.task-assignees .task-assignee-avatar + .task-assignee-avatar {
  margin-left: -8px;
}

.assignee-email {
  margin-bottom: 10px;
  overflow: hidden;
  color: var(--main1);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-git-link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  overflow: hidden;
  color: var(--main1);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-git-link a {
  overflow: hidden;
  color: var(--accent1);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card-overdue {
  border-color: var(--red);
  background: color-mix(in srgb, var(--red) 12%, var(--static1));
}

.task-card-due-today {
  border-color: var(--yellow2);
  background: var(--icon-bg);
}

.task-card-completed {
  border-color: var(--accent3);
  background: var(--secondary4);
}

.task-card-focused {
  z-index: 2;
  border-color: var(--yellow-accent);
  background: var(--icon-bg);
  animation: task-card-focus-pulse 0.55s ease-in-out 4;
}

@keyframes task-card-focus-pulse {
  0%,
  100% {
    border-color: var(--yellow2);
    background: var(--icon-bg);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--yellow-accent) 55%, transparent),
      0 6px 16px color-mix(in srgb, var(--yellow2) 35%, transparent);
  }
  50% {
    border-color: var(--yellow-accent);
    background: var(--icon-services);
    transform: scale(1.03);
    box-shadow:
      0 0 0 10px color-mix(in srgb, var(--yellow-accent) 45%, transparent),
      0 12px 28px color-mix(in srgb, var(--yellow2) 40%, transparent);
  }
}

.task-due-date {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--secondary3);
  color: var(--reorganization-text);
  font-size: 11px;
  font-weight: 700;
}

.task-due-date-overdue {
  background: color-mix(in srgb, var(--red) 22%, var(--static1));
  color: var(--red);
}

.task-due-date-today {
  background: var(--icon-services);
  color: var(--logo);
}

.task-priority {
  margin-bottom: 10px;
}

.task-checklist-progress {
  color: var(--app-muted);
  font-size: 12px;
  font-weight: 600;
}

.task-checklist-done {
  color: var(--green);
}
</style>
