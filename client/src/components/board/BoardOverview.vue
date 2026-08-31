<template>
  <div v-if="loading" class="project-overview" aria-busy="true" aria-label="Загрузка доски">
    <div class="project-overview-main">
      <div class="project-overview-title">
        <span class="skeleton-block skeleton-line skeleton-title"></span>
        <span class="skeleton-block skeleton-chip"></span>
        <span class="skeleton-block skeleton-chip"></span>
      </div>
      <span class="skeleton-block skeleton-line skeleton-description"></span>
    </div>
    <div class="project-progress">
      <div class="project-progress-meta">
        <span class="skeleton-block skeleton-line skeleton-meta"></span>
        <span class="skeleton-block skeleton-line skeleton-meta"></span>
      </div>
      <span class="skeleton-block skeleton-progress"></span>
    </div>
  </div>
  <div v-else-if="project" class="project-overview">
    <div class="project-overview-main">
      <div class="project-overview-title">
        <v-btn
          v-if="project.isOwner"
          class="project-settings-btn"
          type="button"
          variant="text"
          size="small"
          color="primary"
          icon="mdi-cog-outline"
          aria-label="Настройки доски"
          title="Настройки доски"
          @click="$emit('open-settings')"
        />
        <h1>{{ project.name }}</h1>
        <v-chip size="x-small" :color="statusColor" variant="tonal">{{ statusLabel }}</v-chip>
        <v-chip
          size="x-small"
          :color="access.color"
          variant="tonal"
          :prepend-icon="access.icon"
          :title="access.hint"
        >
          {{ access.label }}
        </v-chip>
      </div>
      <p v-if="project.description" class="project-description" :title="project.description">
        {{ project.description }}
      </p>
    </div>
    <div class="project-progress">
      <div class="project-progress-meta">
        <span>{{ progress }}%</span>
        <span v-if="project.dueDate" class="project-deadline">
          <v-icon icon="mdi-calendar-outline" size="14" /> {{ dueDateLabel }}
        </span>
      </div>
      <v-progress-linear :model-value="progress" color="primary" height="6" rounded />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { boardAccessInfo } from '../../utils/boardAccess.js'

const props = defineProps({
  project: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  statusLabel: { type: String, default: '' },
  statusColor: { type: String, default: 'success' },
  dueDateLabel: { type: String, default: '' },
})

const access = computed(() => boardAccessInfo(props.project))

defineEmits(['open-settings'])
</script>

<style scoped>
.project-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}

.project-overview-main {
  min-width: 0;
  flex: 1;
}

.project-overview-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.project-overview h1 {
  margin: 0;
  color: var(--app-heading);
  font-size: var(--text-title);
  line-height: 1.25;
}

.project-settings-btn {
  flex-shrink: 0;
}

.project-description {
  max-width: 760px;
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-progress {
  flex: 0 0 200px;
  width: 200px;
  color: var(--app-muted);
  font-size: 12px;
}

.project-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.project-deadline {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--app-muted);
  white-space: nowrap;
}

.skeleton-title {
  width: 180px;
  height: 16px;
}

.skeleton-description {
  width: min(420px, 70%);
  height: 10px;
  margin-top: 8px;
}

.skeleton-meta {
  width: 48px;
  height: 10px;
}

.skeleton-progress {
  height: 6px;
  border-radius: 999px;
}

@media (max-width: 700px) {
  .project-overview {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .project-progress {
    flex-basis: auto;
    width: auto;
  }
}
</style>
