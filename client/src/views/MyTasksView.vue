<template>
  <v-app>
    <Header />
    <v-main>
      <v-container class="tasks-page" max-width="1280">
        <div class="tasks-heading page-heading">
          <div>
            <h1>Мои задачи</h1>
            <p>Исполнитель или участник · {{ tasks.length }}</p>
          </div>
          <v-text-field
            v-if="tasks.length"
            v-model="search"
            class="tasks-search"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            placeholder="Поиск по задаче или доске"
          />
        </div>

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

        <template v-if="!loading">
          <v-alert v-if="!tasks.length" type="info" variant="tonal" density="compact">
            У вас пока нет назначенных задач.
          </v-alert>
          <v-alert v-else-if="!visibleGroups.length" type="info" variant="tonal" density="compact">
            Ничего не найдено.
          </v-alert>
          <section v-for="group in visibleGroups" :key="group.key" class="task-group">
            <button type="button" class="task-group-header" @click="toggleGroup(group.key)">
              <v-icon :icon="collapsed[group.key] ? 'mdi-chevron-right' : 'mdi-chevron-down'" size="18" />
              <span>{{ group.title }}</span>
              <span class="task-group-count">{{ group.tasks.length }}</span>
            </button>
            <ul v-show="!collapsed[group.key]" class="task-list">
              <li
                v-for="task in group.tasks"
                :key="task.id"
                class="task-row"
                :class="{ overdue: isOverdue(task), completed: task.completed }"
                @click="openTask(task)"
              >
                <span class="task-title">{{ task.title }}</span>
                <span class="task-board">{{ task.boardName }} · {{ task.stageTitle }}</span>
                <v-chip size="x-small" :color="priorityColor(task.priority)" variant="tonal">
                  {{ priorityLabel(task.priority) }}
                </v-chip>
                <span class="task-due">
                  <template v-if="task.dueDate">{{ formatDate(task.dueDate) }}</template>
                  <template v-else>Без срока</template>
                </span>
              </li>
            </ul>
          </section>
        </template>
      </v-container>
    </v-main>
    <AppPreloader :open="loading" />
    <v-spacer />
    <AppFooter />
  </v-app>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'
import AppFooter from '../components/AppFooter.vue'
import AppPreloader from '../components/AppPreloader.vue'
import Header from '../components/header.vue'

const router = useRouter()
const tasks = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const collapsed = reactive({})

const priorityOptions = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

const priorityLabel = (priority) => priorityOptions[priority] || priorityOptions.medium
const priorityColor = (priority) =>
  ({ low: 'success', medium: 'info', high: 'warning', critical: 'error' })[priority] || 'info'
const isOverdue = (task) => !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
const formatDate = (date) =>
  new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const openTask = (task) => {
  router.push({ path: `/boards/${task.boardId}`, query: { task: task.id } })
}

const toggleGroup = (key) => {
  collapsed[key] = !collapsed[key]
}

const filteredTasks = computed(() => {
  const query = String(search.value || '').trim().toLowerCase()
  if (!query) return tasks.value
  return tasks.value.filter((task) =>
    `${task.title} ${task.boardName} ${task.stageTitle}`.toLowerCase().includes(query),
  )
})

const taskGroups = computed(() => {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...filteredTasks.value].sort((first, second) => {
    const firstDue = first.dueDate ? new Date(first.dueDate) : Infinity
    const secondDue = second.dueDate ? new Date(second.dueDate) : Infinity
    return firstDue - secondDue || priorityOrder[first.priority] - priorityOrder[second.priority]
  })
  const open = sorted.filter((task) => !task.completed)
  const done = sorted.filter((task) => task.completed)

  return [
    { key: 'overdue', title: 'Просроченные', tasks: open.filter(isOverdue) },
    {
      key: 'today',
      title: 'Сегодня',
      tasks: open.filter(
        (task) => task.dueDate && !isOverdue(task) && new Date(task.dueDate) < endOfToday,
      ),
    },
    {
      key: 'upcoming',
      title: 'Ближайшие 7 дней',
      tasks: open.filter(
        (task) =>
          task.dueDate && new Date(task.dueDate) >= endOfToday && new Date(task.dueDate) < endOfWeek,
      ),
    },
    {
      key: 'later',
      title: 'Позже',
      tasks: open.filter((task) => task.dueDate && new Date(task.dueDate) >= endOfWeek),
    },
    { key: 'no-date', title: 'Без срока', tasks: open.filter((task) => !task.dueDate) },
    { key: 'done', title: 'Выполненные', tasks: done },
  ]
})

const visibleGroups = computed(() => taskGroups.value.filter((group) => group.tasks.length))

onMounted(async () => {
  collapsed.done = true
  collapsed.later = true
  try {
    const { data } = await api.get('/tasks')
    tasks.value = data
  } catch {
    error.value = 'Не удалось загрузить задачи'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tasks-page {
  padding-top: 16px;
  padding-bottom: 32px;
}

.tasks-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tasks-heading h1,
.tasks-heading p {
  margin: 0;
}

.tasks-search {
  max-width: 320px;
  flex: 1;
}

.task-group {
  margin-bottom: 8px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  overflow: hidden;
}

.task-group-header {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  background: var(--secondary3);
  color: var(--app-heading);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  gap: 4px;
}

.task-group-count {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--static3);
  color: var(--reorganization-text);
  font-size: 11px;
}

.task-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr) auto 108px;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid var(--app-border);
  cursor: pointer;
}

.task-row:hover {
  background: var(--bg);
}

.task-title,
.task-board,
.task-due {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-title {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 600;
}

.task-board {
  color: var(--app-muted);
  font-size: 12px;
}

.task-due {
  color: var(--app-muted);
  font-size: 12px;
  text-align: right;
}

.task-row.overdue .task-due,
.task-row.overdue .task-title {
  color: var(--red);
}

.task-row.completed .task-title {
  color: var(--main1);
  text-decoration: line-through;
}

@media (max-width: 800px) {
  .tasks-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .tasks-search {
    max-width: none;
  }

  .task-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'title due'
      'board chip';
  }

  .task-title {
    grid-area: title;
  }

  .task-board {
    grid-area: board;
  }

  .task-due {
    grid-area: due;
  }
}
</style>
