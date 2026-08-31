export const timeframeOptions = [
  { title: 'Любой срок', value: 'all' },
  { title: 'Без даты', value: 'no-date' },
  { title: 'Просроченные', value: 'overdue' },
  { title: 'Срок истекает в течение суток', value: 'due-soon' },
]

export const priorityOptions = [
  { title: 'Низкий', value: 'low' },
  { title: 'Средний', value: 'medium' },
  { title: 'Высокий', value: 'high' },
  { title: 'Критический', value: 'critical' },
]

export const dueDateStatus = (task) => {
  if (!task.dueDate) return null
  const due = new Date(task.dueDate)
  const now = new Date()
  if (due.getTime() < now.getTime()) return 'overdue'

  const isToday =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  return isToday ? 'due-today' : null
}

export const formatDueDate = (dueDate) =>
  new Date(dueDate).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export const priorityLabel = (priority) =>
  priorityOptions.find((option) => option.value === priority)?.title || 'Средний'

export const priorityColor = (priority) =>
  ({ low: 'success', medium: 'info', high: 'warning', critical: 'error' })[priority] || 'info'

export const gitLinkLabel = (link) => {
  try {
    const url = new URL(link)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Git'
    const path = url.pathname.replace(/\/+$/, '')
    return path.split('/').pop() || 'Git'
  } catch {
    return 'Git'
  }
}

export const isSafeHttpUrl = (link) => {
  try {
    const url = new URL(link)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Сколько пунктов чеклиста закрыто: «2/5». */
export const checklistProgress = (checklist) => {
  const items = Array.isArray(checklist) ? checklist : []
  const completedCount = items.filter((item) => item.completed).length
  return {
    done: items.length > 0 && completedCount === items.length,
    label: `${completedCount}/${items.length}`,
  }
}
