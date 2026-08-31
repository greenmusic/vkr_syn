import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/index.js'
import { getCachedUser } from '../auth/session.js'

/** Состояние рабочей области: список досок, открытая доска, участники, черновики задач. */
export const useBoardWorkspace = () => {
  const route = useRoute()
  const router = useRouter()
  const isBoardPage = computed(() => Boolean(route.params.boardId))

  const projects = ref([])
  const currentBoard = ref(null)
  const currentUserId = ref(getCachedUser()?.id || null)
  const newProjectName = ref('')
  const newBoardVisibility = ref('private')
  const newMemberId = ref('')
  const newMemberRole = ref('viewer')
  const memberRoleOptions = [
    { title: 'Просмотр', value: 'viewer' },
    { title: 'Редактирование', value: 'editor' },
  ]
  const newLabelTitle = ref('')
  const newLabelColor = ref('#0085ff')
  const boardSettingsOpen = ref(false)
  const newBoardFormOpen = ref(false)
  const editingProjectName = ref('')
  const editingProjectDescription = ref('')
  const editingProjectStatus = ref('active')
  const editingProjectStartDate = ref('')
  const editingProjectDueDate = ref('')
  const editingVisibility = ref('private')
  const pendingBackground = ref(null)
  const pendingRemoveBackground = ref(false)
  const savingBoard = ref(false)
  const pageLoading = ref(false)
  const creatingBoard = ref(false)
  const savingTask = ref(false)
  const drafts = ref({})
  const snackbar = ref({ show: false, text: '', color: 'success' })
  const userSearchResults = ref([])
  const userDirectory = ref([])
  const searchingUsers = ref(false)
  let searchTimer = null

  const notify = (text, color = 'success') => {
    snackbar.value = { show: true, text, color }
  }

  const visibilityOptions = [
    { title: 'Приватная', value: 'private' },
    { title: 'Публичная', value: 'public' },
  ]
  const projectStatusOptions = [
    { title: 'Планируется', value: 'planning' },
    { title: 'Активен', value: 'active' },
    { title: 'Приостановлен', value: 'on_hold' },
    { title: 'Завершён', value: 'completed' },
  ]

  const selectedProject = computed(() => currentBoard.value)
  const columns = computed(() => selectedProject.value?.stages || [])
  const boardPeople = computed(() => {
    const map = new Map()
    const putPerson = (user) => {
      if (!user?.id) return
      const id = String(user.id)
      const prev = map.get(id) || {}
      map.set(id, {
        ...prev,
        ...user,
        id,
        avatar: user.avatar || user.avatarData || prev.avatar || prev.avatarData || null,
      })
    }
    const cached = getCachedUser()
    if (cached?.id) putPerson(cached)
    for (const member of selectedProject.value?.members || []) putPerson(member)
    for (const task of selectedProject.value?.tasks || []) {
      for (const participant of task.participants || []) putPerson(participant)
    }
    for (const user of userDirectory.value) putPerson(user)
    return [...map.values()]
  })

  const projectProgress = computed(() => {
    const tasks = selectedProject.value?.tasks || []
    if (!tasks.length) return 0
    return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)
  })

  const boardBackgroundStyle = computed(() => {
    if (!selectedProject.value?.background || !isBoardPage.value) return {}
    return { backgroundImage: `url(${selectedProject.value.background})` }
  })

  const getTasksByStatus = (status) =>
    (selectedProject.value?.tasks || []).filter((task) => task.status === status)

  const openBoard = (boardId) => {
    router.push(`/boards/${boardId}`)
  }

  const boardCoverStyle = (project) => {
    if (!project?.background) return {}
    return { backgroundImage: `url(${project.background})` }
  }

  const goToBoardList = () => {
    currentBoard.value = null
    router.push('/')
  }

  const toDateInputValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

  const projectStatusLabel = (status) =>
    projectStatusOptions.find((option) => option.value === status)?.title || 'Активен'

  const projectStatusColor = (status) =>
    ({ planning: 'info', active: 'success', on_hold: 'warning', completed: 'secondary' })[status] ||
    'success'

  const formatProjectDate = (value) =>
    new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })

  const loadBoardList = async () => {
    const { data } = await api.get('/boards')
    projects.value = data
  }

  const loadBoard = async (boardId, { withLoader = true } = {}) => {
    if (!boardId) {
      currentBoard.value = null
      return
    }
    if (withLoader) pageLoading.value = true
    try {
      const { data } = await api.get(`/boards/${boardId}`)
      currentBoard.value = data
    } catch (error) {
      currentBoard.value = null
      console.error('[Board] Failed to load board:', error)
      notify('Не удалось загрузить доску', 'error')
      router.replace('/')
    } finally {
      if (withLoader) pageLoading.value = false
    }
  }

  const openBoardSettings = () => {
    if (!selectedProject.value?.isOwner) return
    editingProjectName.value = selectedProject.value.name || ''
    editingProjectDescription.value = selectedProject.value.description || ''
    editingProjectStatus.value = selectedProject.value.status || 'active'
    editingProjectStartDate.value = toDateInputValue(selectedProject.value.startDate)
    editingProjectDueDate.value = toDateInputValue(selectedProject.value.dueDate)
    editingVisibility.value = selectedProject.value.visibility || 'private'
    pendingBackground.value = null
    pendingRemoveBackground.value = false
    boardSettingsOpen.value = true
  }

  const applyBackground = async (boardId, file) => {
    const resizedBackground = await resizeBackground(file)
    const formData = new FormData()
    formData.append('background', resizedBackground, 'board-background.jpg')
    const { data } = await api.patch(`/boards/${boardId}/background`, formData)
    selectedProject.value.background = data.background
  }

  const applyRemoveBackground = async (boardId) => {
    const formData = new FormData()
    formData.append('removeBackground', 'true')
    await api.patch(`/boards/${boardId}/background`, formData)
    selectedProject.value.background = null
  }

  const saveProjectDetails = async () => {
    if (!selectedProject.value?.isOwner || savingBoard.value) return
    const name = editingProjectName.value.trim()
    if (!name) {
      notify('Укажите название доски', 'error')
      return
    }
    const previousDetails = {
      name: selectedProject.value.name,
      description: selectedProject.value.description,
      status: selectedProject.value.status,
      startDate: selectedProject.value.startDate,
      dueDate: selectedProject.value.dueDate,
      visibility: selectedProject.value.visibility,
      background: selectedProject.value.background,
    }
    const details = {
      name,
      description: editingProjectDescription.value,
      status: editingProjectStatus.value,
      startDate: editingProjectStartDate.value || null,
      dueDate: editingProjectDueDate.value || null,
    }
    Object.assign(selectedProject.value, details, { visibility: editingVisibility.value })
    savingBoard.value = true
    try {
      const boardId = selectedProject.value.id
      const { data } = await api.patch(`/boards/${boardId}/details`, details)
      currentBoard.value = data
      projects.value = projects.value.map((project) =>
        project.id === data.id ? { ...project, name: data.name } : project,
      )

      if (editingVisibility.value !== previousDetails.visibility) {
        const { data: visibilityData } = await api.patch(`/boards/${boardId}/visibility`, {
          visibility: editingVisibility.value,
        })
        selectedProject.value.visibility = visibilityData.visibility
        if (currentBoard.value) currentBoard.value.visibility = visibilityData.visibility
      }

      const backgroundFile = Array.isArray(pendingBackground.value)
        ? pendingBackground.value[0]
        : pendingBackground.value
      if (backgroundFile) {
        await applyBackground(boardId, backgroundFile)
      } else if (pendingRemoveBackground.value) {
        await applyRemoveBackground(boardId)
      }

      pendingBackground.value = null
      pendingRemoveBackground.value = false
      notify('Настройки доски сохранены')
    } catch (error) {
      Object.assign(selectedProject.value, previousDetails)
      console.error('[Board] Failed to save board settings:', error)
      notify('Не удалось сохранить настройки доски', 'error')
    } finally {
      savingBoard.value = false
    }
  }

  const deletingBoard = ref(false)

  const removeBoard = async () => {
    if (!selectedProject.value?.isOwner) return
    const boardId = selectedProject.value.id
    deletingBoard.value = true
    try {
      await api.delete(`/boards/${boardId}`)
      boardSettingsOpen.value = false
      projects.value = projects.value.filter((project) => project.id !== boardId)
      currentBoard.value = null
      router.push('/')
      notify('Доска удалена')
    } catch (error) {
      console.error('[Board] Failed to delete board:', error)
      notify('Не удалось удалить доску', 'error')
    } finally {
      deletingBoard.value = false
    }
  }

  const addProject = async () => {
    const name = newProjectName.value.trim()
    if (!name || creatingBoard.value) return

    creatingBoard.value = true
    try {
      const { data: project } = await api.post('/boards', {
        name,
        visibility: newBoardVisibility.value,
      })
      newProjectName.value = ''
      newBoardVisibility.value = 'private'
      newBoardFormOpen.value = false
      await loadBoardList()
      router.push(`/boards/${project.id}`)
      notify('Доска создана')
    } catch (error) {
      console.error('[Board] Failed to create board:', error)
      notify('Не удалось создать доску', 'error')
    } finally {
      creatingBoard.value = false
    }
  }

  const markBackgroundForRemoval = () => {
    pendingBackground.value = null
    pendingRemoveBackground.value = true
  }

  watch(pendingBackground, (value) => {
    const file = Array.isArray(value) ? value[0] : value
    if (file) pendingRemoveBackground.value = false
  })

  const resizeBackground = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image()
      const objectUrl = URL.createObjectURL(file)

      image.onload = () => {
        URL.revokeObjectURL(objectUrl)

        const maxDimension = 2400
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)

        const compress = (quality) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Не удалось обработать изображение'))
              if (blob.size <= 200 * 1024) return resolve(blob)
              if (quality > 0.35) return compress(quality - 0.1)

              if (canvas.width > 640 || canvas.height > 640) {
                canvas.width = Math.max(1, Math.round(canvas.width * 0.8))
                canvas.height = Math.max(1, Math.round(canvas.height * 0.8))
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
                return compress(0.82)
              }

              return resolve(blob)
            },
            'image/jpeg',
            quality,
          )
        }

        compress(0.82)
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Не удалось загрузить изображение'))
      }
      image.src = objectUrl
    })

  const applyUserList = (users) => {
    const currentMemberIds = new Set(
      (selectedProject.value?.members || []).map((member) => String(member.id)),
    )
    userSearchResults.value = users.filter(
      (user) =>
        String(user.id) !== String(currentUserId.value) &&
        !currentMemberIds.has(String(user.id)),
    )
  }

  const loadUserDirectory = async (query = '') => {
    searchingUsers.value = true
    try {
      const { data } = await api.get('/users', query ? { params: { q: query } } : undefined)
      userDirectory.value = data
      applyUserList(data)
    } catch (error) {
      console.error('[Board] Failed to search users:', error)
    } finally {
      searchingUsers.value = false
    }
  }

  const searchUsers = (query) => {
    clearTimeout(searchTimer)
    const q = String(query || '').trim()
    searchTimer = setTimeout(() => {
      loadUserDirectory(q)
    }, q ? 250 : 0)
  }

  const addMember = async () => {
    if (!newMemberId.value || !selectedProject.value?.isOwner) return

    try {
      const { data: member } = await api.post(`/boards/${selectedProject.value.id}/members`, {
        userId: newMemberId.value,
        role: newMemberRole.value,
      })
      selectedProject.value.members = [...(selectedProject.value.members || []), member]
      newMemberId.value = ''
      applyUserList(userDirectory.value)
      notify('Пользователь добавлен к доске')
    } catch (error) {
      console.error('[Board] Failed to add board member:', error)
      notify('Не удалось добавить пользователя', 'error')
    }
  }

  const removeMember = async (memberId) => {
    if (!selectedProject.value?.isOwner) return

    try {
      await api.delete(`/boards/${selectedProject.value.id}/members/${memberId}`)
      selectedProject.value.members = selectedProject.value.members.filter(
        (member) => member.id !== memberId,
      )
      notify('Пользователь удалён из доступа к доске')
    } catch (error) {
      console.error('[Board] Failed to remove board member:', error)
      notify('Не удалось удалить пользователя', 'error')
    }
  }

  const addLabel = async () => {
    const title = newLabelTitle.value.trim()
    if (!title || !selectedProject.value?.isOwner) return

    try {
      const { data: label } = await api.post(`/boards/${selectedProject.value.id}/labels`, {
        title,
        color: newLabelColor.value,
      })
      selectedProject.value.labels = [...(selectedProject.value.labels || []), label]
      newLabelTitle.value = ''
      notify('Метка добавлена')
    } catch (error) {
      console.error('[Board] Failed to add label:', error)
      notify('Не удалось добавить метку', 'error')
    }
  }

  const removeLabel = async (labelId) => {
    if (!selectedProject.value?.isOwner) return

    try {
      await api.delete(`/boards/${selectedProject.value.id}/labels/${labelId}`)
      selectedProject.value.labels = selectedProject.value.labels.filter(
        (label) => label.id !== labelId,
      )
      notify('Метка удалена')
    } catch (error) {
      console.error('[Board] Failed to remove label:', error)
      notify('Не удалось удалить метку', 'error')
    }
  }

  const addStage = async (stageTitle) => {
    const title = String(stageTitle || '').trim()
    if (!title || !selectedProject.value) return

    try {
      const { data: stage } = await api.post(`/boards/${selectedProject.value.id}/stages`, { title })
      selectedProject.value.stages.push(stage)
      notify('Этап добавлен')
    } catch (error) {
      console.error('[Board] Failed to create stage:', error)
      notify('Не удалось добавить этап', 'error')
    }
  }

  const deleteStage = async (stageId) => {
    if (!selectedProject.value?.canEdit) return

    const stage = selectedProject.value.stages.find((item) => item.key === stageId)
    if (!stage) return

    try {
      await api.delete(`/boards/${selectedProject.value.id}/stages/${stageId}`)
      selectedProject.value.stages = selectedProject.value.stages.filter(
        (item) => item.key !== stageId,
      )
      selectedProject.value.tasks = selectedProject.value.tasks.filter(
        (task) => task.status !== stageId,
      )
      notify('Этап и его задачи удалены')
    } catch (error) {
      console.error('[Board] Failed to delete stage:', error)
      notify('Не удалось удалить этап', 'error')
    }
  }

  const renameStage = async (stageId, title) => {
    if (!selectedProject.value?.canEdit) return

    const stage = selectedProject.value.stages.find((item) => item.key === stageId)
    if (!stage) return
    const previousTitle = stage.title
    stage.title = title

    try {
      const { data } = await api.patch(`/boards/${selectedProject.value.id}/stages/${stageId}`, {
        title,
      })
      stage.title = data.title
      notify('Название этапа обновлено')
    } catch (error) {
      stage.title = previousTitle
      console.error('[Board] Failed to rename stage:', error)
      notify('Не удалось переименовать этап', 'error')
    }
  }

  const reorderStages = async (oldIndex, newIndex) => {
    if (!selectedProject.value?.canEdit || oldIndex === newIndex) return

    const previousStages = [...selectedProject.value.stages]
    const stages = [...previousStages]
    const [stage] = stages.splice(oldIndex, 1)
    stages.splice(newIndex, 0, stage)
    selectedProject.value.stages = stages

    try {
      await api.put(`/boards/${selectedProject.value.id}/stages/order`, {
        stageIds: stages.map((item) => item.key),
      })
    } catch (error) {
      selectedProject.value.stages = previousStages
      console.error('[Board] Failed to reorder stages:', error)
    }
  }

  const addTask = async (status) => {
    const title = drafts.value[status]?.trim()
    if (!title || !selectedProject.value) return

    try {
      const { data: task } = await api.post(`/boards/${selectedProject.value.id}/tasks`, {
        title,
        stageId: status,
      })
      selectedProject.value.tasks.push(task)
      drafts.value[status] = ''
      notify('Задача создана')
    } catch (error) {
      console.error('[Board] Failed to create task:', error)
      notify('Не удалось создать задачу', 'error')
    }
  }

  const saveTaskDetails = async (task, details) => {
    if (savingTask.value) return
    const normalizedDetails = {
      ...details,
      title: String(details.title || '').trim(),
      gitLink: String(details.gitLink || '').trim() || null,
      participantIds: (details.participantIds || []).map(Number),
      labelIds: (details.labelIds || []).map(Number),
    }
    const previousDetails = {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      gitLink: task.gitLink,
      priority: task.priority,
      participants: task.participants,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      assigneeEmail: task.assigneeEmail,
      assigneeAvatar: task.assigneeAvatar,
      labels: task.labels,
      checklist: task.checklist,
    }

    Object.assign(task, normalizedDetails)
    savingTask.value = true

    try {
      const { data } = await api.patch(
        `/boards/${selectedProject.value.id}/tasks/${task.id}/details`,
        normalizedDetails,
      )
      Object.assign(task, data)
      notify('Задача сохранена')
    } catch (error) {
      Object.assign(task, previousDetails)
      console.error('[Board] Failed to update task details:', error)
      notify('Не удалось сохранить задачу', 'error')
    } finally {
      savingTask.value = false
    }
  }

  const moveTaskToStage = async (taskId, stageId, beforeTaskId) => {
    if (!selectedProject.value) return

    const task = selectedProject.value.tasks.find((item) => item.id === taskId)
    const targetStage = columns.value.find((column) => column.key === stageId)
    if (!task || !targetStage) return

    const previousStatus = task.status
    const targetTasks = selectedProject.value.tasks.filter(
      (item) => item.status === targetStage.key && item.id !== taskId,
    )
    const targetTask = beforeTaskId
      ? targetTasks.find((item) => item.id === beforeTaskId)
      : undefined
    const nextPosition = targetTask ? targetTasks.indexOf(targetTask) : targetTasks.length
    const previousTasks = [...selectedProject.value.tasks]
    const remainingTasks = previousTasks.filter((item) => item.id !== taskId)
    const insertAt = targetTask
      ? remainingTasks.findIndex((item) => item.id === targetTask.id)
      : remainingTasks.reduce(
          (lastIndex, item, index) => (item.status === targetStage.key ? index : lastIndex),
          -1,
        ) + 1

    task.status = targetStage.key
    remainingTasks.splice(Math.max(0, insertAt), 0, task)
    selectedProject.value.tasks = remainingTasks

    try {
      await api.patch(`/boards/${selectedProject.value.id}/tasks/${taskId}`, {
        stageId: targetStage.key,
        position: nextPosition,
      })
    } catch (error) {
      task.status = previousStatus
      selectedProject.value.tasks = previousTasks
      console.error('[Board] Failed to move task:', error)
      notify('Не удалось переместить задачу', 'error')
    }
  }

  const deleteTask = async (taskId) => {
    if (!selectedProject.value) return

    try {
      await api.delete(`/boards/${selectedProject.value.id}/tasks/${taskId}`)
      selectedProject.value.tasks = selectedProject.value.tasks.filter((task) => task.id !== taskId)
      notify('Задача удалена')
    } catch (error) {
      console.error('[Board] Failed to delete task:', error)
      notify('Не удалось удалить задачу', 'error')
    }
  }

  watch(
    () => route.params.boardId,
    (boardId) => {
      loadBoard(boardId)
    },
  )

  watch(boardSettingsOpen, (open) => {
    if (open) loadUserDirectory()
  })

  const initialize = async () => {
    currentUserId.value = getCachedUser()?.id || null
    pageLoading.value = true
    try {
      await Promise.all([loadBoardList(), loadUserDirectory()])
      if (route.params.boardId) await loadBoard(route.params.boardId, { withLoader: false })
    } catch (error) {
      console.error('[Board] Failed to load boards:', error)
      notify('Не удалось загрузить доски', 'error')
    } finally {
      pageLoading.value = false
    }
  }

  return {
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
    goToBoardList,
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
  }
}
