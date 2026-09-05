<template>
  <v-app>
    <Header />

    <v-main :style="boardBackgroundStyle">
      <div class="board-shell">
        <BoardOverview
          v-if="isBoardPage"
          :loading="pageLoading"
          :project="pageLoading ? null : selectedProject"
          :progress="projectProgress"
          :status-label="selectedProject ? projectStatusLabel(selectedProject.status) : ''"
          :status-color="selectedProject ? projectStatusColor(selectedProject.status) : 'success'"
          :due-date-label="
            selectedProject?.dueDate ? formatProjectDate(selectedProject.dueDate) : ''
          "
          @open-settings="openBoardSettings"
        />

        <BoardSettingsDialog
          v-model:open="boardSettingsOpen"
          v-model:name="editingProjectName"
          v-model:description="editingProjectDescription"
          v-model:status="editingProjectStatus"
          v-model:start-date="editingProjectStartDate"
          v-model:due-date="editingProjectDueDate"
          v-model:visibility="editingVisibility"
          v-model:pending-background="pendingBackground"
          v-model:new-member-id="newMemberId"
          v-model:new-member-role="newMemberRole"
          v-model:new-label-title="newLabelTitle"
          v-model:new-label-color="newLabelColor"
          :project="selectedProject"
          :users="boardPeople"
          :project-status-options="projectStatusOptions"
          :visibility-options="visibilityOptions"
          :member-role-options="memberRoleOptions"
          :user-search-results="userSearchResults"
          :searching-users="searchingUsers"
          :pending-remove-background="pendingRemoveBackground"
          :saving="savingBoard"
          :deleting="deletingBoard"
          @save-project="saveProjectDetails"
          @remove-background="markBackgroundForRemoval"
          @search-users="searchUsers"
          @add-member="addMember"
          @remove-member="removeMember"
          @add-label="addLabel"
          @remove-label="removeLabel"
          @delete-board="removeBoard"
        />

        <BoardsHome
          v-if="!isBoardPage"
          :projects="projects"
          :loading="pageLoading"
          :board-cover-style="boardCoverStyle"
          @open="openBoard"
          @create="newBoardFormOpen = true"
        />

        <NewBoardDialog
          v-model:open="newBoardFormOpen"
          v-model:name="newProjectName"
          v-model:visibility="newBoardVisibility"
          :visibility-options="visibilityOptions"
          :creating="creatingBoard"
          @create="addProject"
        />

        <OnboardingDialog
          v-model:open="onboardingOpen"
          :username="onboardingName"
          @complete="finishOnboarding"
          @create="newBoardFormOpen = true"
        />

        <BoardBoard
          v-if="isBoardPage && (pageLoading || selectedProject)"
          :board="selectedProject"
          :columns="columns"
          :users="boardPeople"
          :drafts="drafts"
          :get-tasks-by-status="getTasksByStatus"
          :current-user-id="currentUserId"
          :highlighted-task-id="highlightedTaskId"
          :saving-task="savingTask"
          :loading="pageLoading"
          @add-task="addTask"
          @add-stage="addStage"
          @delete-stage="deleteStage"
          @delete-task="deleteTask"
          @rename-stage="renameStage"
          @reorder-stages="reorderStages"
          @move-task-to-stage="moveTaskToStage"
          @save-task-details="saveTaskDetails"
        />
      </div>
    </v-main>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>

    <v-spacer />
    <AppFooter />
  </v-app>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from '../components/header.vue'
import AppFooter from '../components/AppFooter.vue'
import BoardBoard from '../components/BoardBoard.vue'
import BoardsHome from '../components/board/BoardsHome.vue'
import BoardOverview from '../components/board/BoardOverview.vue'
import BoardSettingsDialog from '../components/board/BoardSettingsDialog.vue'
import NewBoardDialog from '../components/board/NewBoardDialog.vue'
import OnboardingDialog from '../components/OnboardingDialog.vue'
import { getCachedUser } from '../auth/session.js'
import { isOnboardingDone, markOnboardingDone } from '../utils/onboarding.js'
import { useBoardWorkspace } from '../composables/useBoardWorkspace.js'

const route = useRoute()
const highlightedTaskId = computed(() => {
  const task = route.query.task
  if (Array.isArray(task)) return task[0] || null
  return task || null
})

const {
  isBoardPage,
  projects,
  currentUserId,
  selectedProject,
  columns,
  boardPeople,
  drafts,
  snackbar,
  pageLoading,
  creatingBoard,
  savingTask,
  newProjectName,
  newBoardVisibility,
  newMemberId,
  newMemberRole,
  memberRoleOptions,
  newLabelTitle,
  newLabelColor,
  boardSettingsOpen,
  newBoardFormOpen,
  editingProjectName,
  editingProjectDescription,
  editingProjectStatus,
  editingProjectStartDate,
  editingProjectDueDate,
  editingVisibility,
  pendingBackground,
  pendingRemoveBackground,
  savingBoard,
  visibilityOptions,
  projectStatusOptions,
  projectProgress,
  boardBackgroundStyle,
  userSearchResults,
  searchingUsers,
  getTasksByStatus,
  openBoard,
  boardCoverStyle,
  projectStatusLabel,
  projectStatusColor,
  formatProjectDate,
  openBoardSettings,
  saveProjectDetails,
  removeBoard,
  deletingBoard,
  addProject,
  markBackgroundForRemoval,
  searchUsers,
  addMember,
  removeMember,
  addLabel,
  removeLabel,
  addStage,
  deleteStage,
  renameStage,
  reorderStages,
  addTask,
  saveTaskDetails,
  moveTaskToStage,
  deleteTask,
  initialize,
} = useBoardWorkspace()

const onboardingOpen = ref(false)
const onboardingName = computed(() => getCachedUser()?.username || '')

const maybeOpenOnboarding = () => {
  if (pageLoading.value) return
  if (sessionStorage.getItem('show-onboarding') === '1') {
    sessionStorage.removeItem('show-onboarding')
    onboardingOpen.value = true
    return
  }
  const userId = currentUserId.value || getCachedUser()?.id
  if (userId && !isOnboardingDone(userId)) onboardingOpen.value = true
}

const finishOnboarding = () => {
  markOnboardingDone(currentUserId.value || getCachedUser()?.id)
}

const handleOpenOnboarding = () => {
  onboardingOpen.value = true
}

watch(pageLoading, (loading) => {
  if (!loading) maybeOpenOnboarding()
})

onMounted(() => {
  initialize()
  window.addEventListener('open-onboarding', handleOpenOnboarding)
})

onBeforeUnmount(() => {
  window.removeEventListener('open-onboarding', handleOpenOnboarding)
})
</script>

<style scoped>
.board-shell {
  min-height: min(100vh, 84vh);
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 18px 48px;
}

.v-main {
  background-position: center;
  background-size: cover;
  background-attachment: fixed;
}

.read-only-note {
  margin: -12px 0 20px;
  color: var(--app-muted);
  font-size: 13px;
}
</style>
