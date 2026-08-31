<template>
  <div
    v-if="loading"
    class="board-slider"
    aria-busy="true"
    aria-label="Загрузка этапов и задач"
  >
    <div class="board">
      <div v-for="(column, columnIndex) in skeletonColumns" :key="columnIndex" class="column">
        <div class="column-header">
          <div class="skeleton-block skeleton-line stage-skeleton-title"></div>
          <div class="skeleton-block skeleton-chip"></div>
        </div>
        <div class="task-form">
          <div class="skeleton-block skeleton-line stage-skeleton-field"></div>
        </div>
        <div class="task-list">
          <article
            v-for="(width, taskIndex) in column.tasks"
            :key="taskIndex"
            class="task-card-skeleton"
          >
            <span class="skeleton-block skeleton-chip"></span>
            <span
              class="skeleton-block skeleton-line task-skeleton-title"
              :style="{ width: `${width}%` }"
            ></span>
            <span class="skeleton-block skeleton-line task-skeleton-meta"></span>
          </article>
        </div>
      </div>
    </div>
  </div>

  <template v-else>
  <BoardFilters
    v-model:participant-ids="filterParticipantIds"
    v-model:label-ids="filterLabelIds"
    v-model:keyword="filterKeyword"
    v-model:timeframe="filterTimeframe"
    :users="users"
    :labels="board?.labels || []"
    :has-active-filters="hasActiveFilters"
    @clear="clearFilters"
  />

  <div class="board-slider">
    <div ref="boardRef" class="board">
      <div v-for="column in columns" :key="column.key" class="column">
        <div class="column-header" :class="{ 'column-header-editable': board?.canEdit }">
          <div class="stage-title-area">
            <v-text-field
              v-if="editingStageId === column.key"
              v-model="editingStageTitle"
              class="stage-title-input"
              variant="plain"
              density="compact"
              hide-details
              autofocus
              @keyup.enter="saveStageTitle(column)"
              @keyup.esc="cancelStageEdit"
              @blur="saveStageTitle(column)"
            />
            <h3 v-else class="stage-drag-handle">{{ column.title }}</h3>
          </div>
          <div class="column-tools">
            <span>{{ filteredTasksByStatus(column.key).length }}</span>
            <v-menu v-if="board?.canEdit">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  icon="mdi-dots-vertical"
                  variant="text"
                  size="x-small"
                  title="Настройки этапа"
                  aria-label="Настройки этапа"
                  @click.stop
                />
              </template>
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-pencil-outline"
                  title="Переименовать"
                  @click="openStageEditor(column)"
                />
                <v-list-item
                  prepend-icon="mdi-delete-outline"
                  title="Удалить этап"
                  base-color="error"
                  @click="requestDeleteStage(column)"
                />
              </v-list>
            </v-menu>
          </div>
        </div>

        <div v-if="board?.canEdit" class="task-form">
          <v-text-field
            v-model.trim="drafts[column.key]"
            :label="`Добавить задачу (${column.title})`"
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="emit('add-task', column.key)"
          />
          <v-btn
            icon="mdi-plus"
            color="primary"
            size="x-small"
            title="Добавить задачу"
            aria-label="Добавить задачу"
            @click="emit('add-task', column.key)"
          />
        </div>

        <div class="task-list" :data-stage-id="column.key">
          <TaskCard
            v-for="task in filteredTasksByStatus(column.key)"
            :key="task.id"
            :task="task"
            :can-view="true"
            :can-edit="Boolean(board?.canEdit)"
            :dragging="draggedTaskId === task.id"
            :focused="String(focusingTaskId) === String(task.id)"
            @open="openTaskEditor"
          />
        </div>
      </div>

      <div v-if="board?.canEdit" class="add-stage-column">
        <v-text-field
          v-model.trim="newStageTitle"
          label="Название этапа"
          placeholder="Новый этап"
          variant="outlined"
          density="compact"
          hide-details
          @keyup.enter="addStage"
        />
        <v-btn color="primary" prepend-icon="mdi-plus" @click="addStage">Добавить этап</v-btn>
      </div>
    </div>
  </div>
  </template>

  <TaskEditDialog
    v-model:open="taskDialogOpen"
    :task="editingTask"
    :board="board"
    :users="users"
    :read-only="isTaskReadOnly"
    :saving="savingTask"
    @save="onSaveTask"
    @request-delete="deleteTaskDialogOpen = true"
  />

  <AppConfirmDialog
    v-model:open="deleteTaskDialogOpen"
    title="Удалить задачу?"
    text="Вы уверены, что хотите удалить эту задачу?"
    @confirm="confirmDeleteTask"
  />

  <AppConfirmDialog
    v-model:open="deleteStageDialogOpen"
    title="Удалить этап?"
    :text="
      pendingDeleteStage
        ? `Этап «${pendingDeleteStage.title}» и все его задачи будут удалены безвозвратно.`
        : 'Этап и все его задачи будут удалены безвозвратно.'
    "
    @confirm="confirmDeleteStage"
  />
</template>

<script setup>
import Sortable from 'sortablejs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BoardFilters from './board/BoardFilters.vue'
import TaskCard from './board/TaskCard.vue'
import TaskEditDialog from './board/TaskEditDialog.vue'
import AppConfirmDialog from './AppConfirmDialog.vue'

const props = defineProps({
  board: { type: Object, default: null },
  columns: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  drafts: { type: Object, required: true },
  getTasksByStatus: { type: Function, required: true },
  currentUserId: { type: [String, Number], default: null },
  highlightedTaskId: { type: [String, Number], default: null },
  savingTask: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const skeletonColumns = [
  { tasks: [88, 64, 74] },
  { tasks: [80, 56] },
  { tasks: [92, 62, 70] },
]

const isTaskReadOnly = computed(() => !props.board?.canEdit)

const emit = defineEmits([
  'add-task',
  'add-stage',
  'delete-task',
  'delete-stage',
  'rename-stage',
  'reorder-stages',
  'move-task-to-stage',
  'save-task-details',
])

const editingTask = ref(null)
const taskDialogOpen = ref(false)
const deleteTaskDialogOpen = ref(false)
const deleteStageDialogOpen = ref(false)
const pendingDeleteStage = ref(null)
const newStageTitle = ref('')
const editingStageId = ref(null)
const editingStageTitle = ref('')
const boardRef = ref(null)
const sortables = ref([])
const stageSortable = ref(null)
const draggedTaskId = ref(null)
const focusingTaskId = ref(null)
let highlightTimer = 0
const filterParticipantIds = ref([])
const filterLabelIds = ref([])
const filterKeyword = ref('')
const filterTimeframe = ref('all')

const hasActiveFilters = computed(
  () =>
    filterParticipantIds.value.length > 0 ||
    filterLabelIds.value.length > 0 ||
    Boolean(filterKeyword.value) ||
    filterTimeframe.value !== 'all',
)

const clearFilters = () => {
  filterParticipantIds.value = []
  filterLabelIds.value = []
  filterKeyword.value = ''
  filterTimeframe.value = 'all'
}

const matchesTimeframe = (task) => {
  if (filterTimeframe.value === 'all') return true
  if (filterTimeframe.value === 'no-date') return !task.dueDate
  if (!task.dueDate) return false
  const dueTime = new Date(task.dueDate).getTime()
  const now = Date.now()
  if (filterTimeframe.value === 'overdue') return dueTime < now
  if (filterTimeframe.value === 'due-soon') {
    return dueTime >= now && dueTime <= now + 24 * 60 * 60 * 1000
  }
  return true
}

const filteredTasksByStatus = (status) => {
  const keyword = filterKeyword.value.trim().toLowerCase()
  const participantFilter = filterParticipantIds.value.map(String)
  const labelFilter = filterLabelIds.value.map(String)

  return props.getTasksByStatus(status).filter((task) => {
    if (focusingTaskId.value && String(task.id) === String(focusingTaskId.value)) {
      return true
    }
    if (
      participantFilter.length &&
      !(task.participants || []).some((participant) =>
        participantFilter.includes(String(participant.id)),
      )
    )
      return false
    if (
      labelFilter.length &&
      !(task.labels || []).some((label) => labelFilter.includes(String(label.id)))
    )
      return false
    if (keyword && !`${task.title} ${task.description || ''}`.toLowerCase().includes(keyword))
      return false
    return matchesTimeframe(task)
  })
}

const destroySortables = () => {
  sortables.value.forEach((sortable) => sortable.destroy())
  sortables.value = []
  stageSortable.value?.destroy()
  stageSortable.value = null
}

const revertSortableMove = (event, selector) => {
  const siblings = [...event.from.querySelectorAll(selector)]
  const referenceNode = siblings[event.oldIndex] || null
  if (event.item.parentNode !== event.from || event.item !== referenceNode) {
    event.from.insertBefore(event.item, referenceNode)
  }
}

const setupSortables = async () => {
  await nextTick()
  destroySortables()
  if (props.loading || !props.board?.canEdit || !boardRef.value) return

  stageSortable.value = Sortable.create(boardRef.value, {
    group: 'board-stages',
    animation: 180,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    draggable: '.column',
    handle: '.column-header',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 4,
    ghostClass: 'stage-ghost',
    chosenClass: 'stage-chosen',
    onEnd: (event) => {
      revertSortableMove(event, '.column')
      if (event.oldDraggableIndex === event.newDraggableIndex) return
      emit('reorder-stages', event.oldDraggableIndex, event.newDraggableIndex)
    },
  })

  sortables.value = [...boardRef.value.querySelectorAll('[data-stage-id]')].map((column) =>
    Sortable.create(column, {
      group: 'board-tasks',
      animation: 180,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      draggable: '[data-task-id]',
      ghostClass: 'task-ghost',
      chosenClass: 'task-chosen',
      dragClass: 'task-drag',
      forceFallback: false,
      onStart: (event) => {
        draggedTaskId.value = event.item.dataset.taskId
      },
      onEnd: (event) => {
        const taskId = event.item.dataset.taskId
        const stageId = event.to.dataset.stageId
        const siblings = [...event.to.querySelectorAll('[data-task-id]')]
        const dropIndex = siblings.indexOf(event.item)
        const beforeTaskId = siblings[dropIndex + 1]?.dataset.taskId ?? null
        draggedTaskId.value = null
        revertSortableMove(event, '[data-task-id]')
        emit('move-task-to-stage', taskId, stageId, beforeTaskId)
      },
    }),
  )
}

const openStageEditor = (stage) => {
  editingStageId.value = stage.key
  editingStageTitle.value = stage.title
}

const cancelStageEdit = () => {
  editingStageId.value = null
  editingStageTitle.value = ''
}

const saveStageTitle = (stage) => {
  if (editingStageId.value !== stage.key) return
  const title = editingStageTitle.value.trim()
  if (title && title !== stage.title) emit('rename-stage', stage.key, title)
  cancelStageEdit()
}

const openTaskEditor = (task) => {
  editingTask.value = task
  taskDialogOpen.value = true
}

const onSaveTask = (task, details) => {
  emit('save-task-details', task, details)
}

const confirmDeleteTask = () => {
  if (!editingTask.value || isTaskReadOnly.value) return
  deleteTaskDialogOpen.value = false
  emit('delete-task', editingTask.value.id)
  taskDialogOpen.value = false
  editingTask.value = null
}

const requestDeleteStage = (stage) => {
  pendingDeleteStage.value = stage
  deleteStageDialogOpen.value = true
}

const confirmDeleteStage = () => {
  const stage = pendingDeleteStage.value
  deleteStageDialogOpen.value = false
  pendingDeleteStage.value = null
  if (stage?.key) emit('delete-stage', stage.key)
}

const addStage = () => {
  const title = newStageTitle.value.trim()
  if (!title) return
  emit('add-stage', title)
  newStageTitle.value = ''
}

const HIGHLIGHT_DURATION_MS = 2800
let startedHighlightKey = ''

const clearTaskHighlight = () => {
  window.clearTimeout(highlightTimer)
  focusingTaskId.value = null
}

const scrollHighlightedTaskIntoView = async () => {
  const taskId = props.highlightedTaskId
  if (taskId == null || taskId === '') {
    startedHighlightKey = ''
    clearTaskHighlight()
    return
  }

  const highlightKey = `${props.board?.id ?? ''}:${taskId}`
  if (startedHighlightKey !== highlightKey) {
    startedHighlightKey = highlightKey
    focusingTaskId.value = taskId
    window.clearTimeout(highlightTimer)
    highlightTimer = window.setTimeout(clearTaskHighlight, HIGHLIGHT_DURATION_MS)
  }

  if (!focusingTaskId.value) return

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await nextTick()
    const selector = `[data-task-id="${CSS.escape(String(taskId))}"]`
    const card = boardRef.value?.querySelector(selector)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

onMounted(setupSortables)
watch(
  () => [
    props.loading,
    props.board?.id,
    props.board?.canEdit,
    props.columns.map((column) => column.key).join(','),
  ],
  setupSortables,
)
watch(
  () => [props.highlightedTaskId, props.board?.id, props.columns.length],
  () => {
    scrollHighlightedTaskIntoView()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  clearTaskHighlight()
  destroySortables()
})
if (import.meta.hot) import.meta.hot.dispose(destroySortables)
</script>

<style scoped>
.board-slider {
  position: relative;
  min-width: 0;
  padding-bottom: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  transform: rotateX(180deg);
  overscroll-behavior-inline: contain;
  scroll-behavior: smooth;
  scrollbar-color: var(--secondary1) transparent;
  scrollbar-width: thin;
}

.board-slider::-webkit-scrollbar {
  height: 10px;
}

.board-slider::-webkit-scrollbar-track {
  background: transparent;
}

.board-slider::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--main1);
}

.board {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 100%;
  min-width: min-content;
  padding: 10px 4px 4px;
  overflow: visible;
  transform: rotateX(180deg);
  scroll-snap-type: x proximity;
}

.column {
  flex: 0 0 clamp(300px, 31vw, 300px);
  min-height: 210px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--calendar-bg);
  scroll-snap-align: start;
}

.add-stage-column {
  display: grid;
  flex: 0 0 clamp(300px, 31vw, 300px);
  align-content: start;
  gap: 12px;
  min-height: 142px;
  padding: 12px;
  border: 1px dashed var(--main1);
  border-radius: 8px;
  background: var(--accent5);
  scroll-snap-align: start;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--app-border);
}

.column-header-editable {
  cursor: grab;
}

.column-header h3 {
  margin: 0;
  color: var(--app-text);
  font-size: var(--text-section);
}

.stage-title-area {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
}

.stage-title-input {
  width: 170px;
}

.column-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.column-header span {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--accent5);
  color: var(--accent1);
  font-size: 12px;
  font-weight: 800;
}

.task-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.task-list {
  min-height: 40px;
}

.stage-skeleton-title {
  width: 128px;
  height: 14px;
}

.stage-skeleton-field {
  flex: 1;
  height: 36px;
  border-radius: 8px;
}

.task-card-skeleton {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}

.task-skeleton-title {
  height: 14px;
}

.task-skeleton-meta {
  width: 42%;
  height: 10px;
}

.stage-ghost {
  border: 2px dashed var(--accent2);
  background: var(--accent5);
  opacity: 0.7;
}

.stage-chosen {
  box-shadow: 0 12px 28px rgba(0, 133, 255, 0.16);
}

.task-ghost {
  border: 2px dashed var(--accent2);
  background: var(--accent5);
  opacity: 0.65;
}

.task-chosen {
  box-shadow: 0 10px 24px rgba(0, 133, 255, 0.2);
}

@media (max-width: 900px) {
  .column,
  .add-stage-column {
    flex-basis: min(86vw, 360px);
  }
}
</style>
