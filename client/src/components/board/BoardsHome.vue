<template>
  <section class="boards-home">
    <h2 class="boards-home-title page-heading">Мои проекты</h2>

    <div class="boards-layout">
      <section class="boards-panel">
        <h3 class="boards-panel-title">
          <v-icon icon="mdi-account-outline" size="18" />
          Мои доски
        </h3>
        <div v-if="loading" class="boards-grid" aria-busy="true" aria-label="Загрузка досок">
          <div v-for="index in 4" :key="`owned-${index}`" class="board-card board-card-skeleton">
            <span class="skeleton-block skeleton-line board-skeleton-title"></span>
            <span class="skeleton-block skeleton-chip"></span>
          </div>
        </div>
        <div v-else class="boards-grid">
          <button
            v-for="project in ownedBoards"
            :key="project.id"
            type="button"
            class="board-card"
            :style="boardCoverStyle(project)"
            @click="$emit('open', project.id)"
          >
            <span class="board-card-title">{{ project.name }}</span>
            <span class="board-card-meta">
              <span class="board-card-chip">{{ visibilityLabel(project) }}</span>
            </span>
          </button>
          <button type="button" class="board-card board-card-new" @click="$emit('create')">
            <span class="board-card-new-icon">+</span>
            <span>Создать доску</span>
          </button>
        </div>
      </section>

      <section class="boards-panel">
        <h3 class="boards-panel-title">
          <v-icon icon="mdi-account-multiple-outline" size="18" />
          Доски, в которых я указан
        </h3>
        <div class="boards-subgrid">
          <section v-for="section in sharedSections" :key="section.key" class="boards-subsection">
            <h4 class="boards-section-title">
              <v-icon :icon="section.icon" size="16" />
              {{ section.title }}
            </h4>
            <div v-if="loading" class="boards-grid">
              <div
                v-for="index in 2"
                :key="`${section.key}-${index}`"
                class="board-card board-card-skeleton"
              >
                <span class="skeleton-block skeleton-line board-skeleton-title"></span>
                <span class="skeleton-block skeleton-chip"></span>
              </div>
            </div>
            <p v-else-if="!section.boards.length" class="boards-empty">{{ section.empty }}</p>
            <div v-else class="boards-grid">
              <button
                v-for="project in section.boards"
                :key="project.id"
                type="button"
                class="board-card"
                :style="boardCoverStyle(project)"
                @click="$emit('open', project.id)"
              >
                <span class="board-card-title">{{ project.name }}</span>
                <span class="board-card-meta">
                  <span class="board-card-chip">{{ visibilityLabel(project) }}</span>
                </span>
              </button>
            </div>
          </section>
        </div>
      </section>

      <section class="boards-panel">
        <h3 class="boards-panel-title">
          <v-icon icon="mdi-earth" size="18" />
          Публичные
        </h3>
        <div v-if="loading" class="boards-grid">
          <div v-for="index in 3" :key="`public-${index}`" class="board-card board-card-skeleton">
            <span class="skeleton-block skeleton-line board-skeleton-title"></span>
            <span class="skeleton-block skeleton-chip"></span>
          </div>
        </div>
        <p v-else-if="!publicBoards.length" class="boards-empty">Нет публичных досок</p>
        <div v-else class="boards-grid">
          <button
            v-for="project in publicBoards"
            :key="project.id"
            type="button"
            class="board-card"
            :style="boardCoverStyle(project)"
            @click="$emit('open', project.id)"
          >
            <span class="board-card-title">{{ project.name }}</span>
            <span class="board-card-meta">
              <span class="board-card-chip">Публичная</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  boardCoverStyle: { type: Function, required: true },
})

defineEmits(['open', 'create'])

const ownedBoards = computed(() => props.projects.filter((project) => project.isOwner))

const isListed = (project) => Boolean(project.isListed)

const sharedSections = computed(() => [
  {
    key: 'edit',
    title: 'Изменение',
    icon: 'mdi-pencil-outline',
    boards: props.projects.filter((project) => isListed(project) && project.canEdit),
    empty: 'Нет досок с правом изменения',
  },
  {
    key: 'view',
    title: 'Просмотр',
    icon: 'mdi-eye-outline',
    boards: props.projects.filter(
      (project) =>
        !project.isOwner &&
        !project.canEdit &&
        (isListed(project) || project.visibility === 'public'),
    ),
    empty: 'Нет досок только для просмотра',
  },
])

const publicBoards = computed(() =>
  props.projects.filter(
    (project) => project.visibility === 'public' && !project.isOwner && !isListed(project),
  ),
)

const visibilityLabel = (project) => (project.visibility === 'public' ? 'Публичная' : 'Приватная')
</script>

<style scoped>
.boards-home {
  margin-bottom: 24px;
}

.boards-home-title {
  margin: 0 0 16px;
}

.boards-layout {
  display: grid;
  gap: 16px;
}

.boards-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--secondary3);
}

.boards-panel-title,
.boards-section-title {
  display: flex;
  align-items: center;
  min-height: 24px;
  margin: 0 0 12px;
  color: var(--app-heading);
  font-size: var(--text-section);
  font-weight: 700;
  line-height: 1.2;
  gap: 8px;
}

.boards-section-title {
  font-size: var(--text-body);
}

.boards-subgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.boards-subsection {
  min-width: 0;
}

.boards-empty {
  margin: 0;
  min-height: 112px;
  color: var(--main1);
  font-size: 13px;
  line-height: 1.4;
}

.boards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.board-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  height: 112px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background-color: var(--banner-bg);
  background-image: linear-gradient(135deg, var(--accent2), var(--banner-bg));
  background-position: center;
  background-size: cover;
  cursor: pointer;
  text-align: left;
}

.board-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(3, 11, 58, 0) 40%, rgba(3, 11, 58, 0.55) 100%);
}

.board-card-title {
  position: relative;
  z-index: 1;
  color: var(--white-banner);
  font-size: 15px;
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(3, 11, 58, 0.35);
}

.board-card-meta {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.board-card-chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(3, 11, 58, 0.45);
  color: var(--white-banner);
  font-size: 11px;
  font-weight: 700;
}

.board-card-new {
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--accent5);
  background-image: none;
  color: var(--accent1);
}

.board-card-new::after {
  content: none;
}

.board-card-new-icon {
  font-size: 22px;
  line-height: 1;
}

.board-card-skeleton {
  justify-content: flex-end;
  background: var(--static3);
  background-image: none;
  cursor: default;
  pointer-events: none;
}

.board-card-skeleton::after {
  background: linear-gradient(180deg, rgba(3, 11, 58, 0.04) 30%, rgba(3, 11, 58, 0.18) 100%);
}

.board-skeleton-title {
  position: relative;
  z-index: 1;
  width: 70%;
  height: 14px;
}

.board-card-skeleton .skeleton-chip {
  position: relative;
  z-index: 1;
  background-image: linear-gradient(90deg, var(--secondary1) 0%, var(--accent5) 45%, var(--secondary1) 90%);
  background-size: 240% 100%;
}

@media (max-width: 800px) {
  .boards-subgrid {
    grid-template-columns: 1fr;
  }
}
</style>
