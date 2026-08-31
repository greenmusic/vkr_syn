export const boardAccessInfo = (project) => {
  if (project?.isOwner || project?.accessRole === 'owner') {
    return {
      label: 'Вы автор доски',
      hint: 'Можно менять настройки, участников и содержимое',
      color: 'primary',
      icon: 'mdi-crown-outline',
    }
  }
  if (project?.canEdit || project?.accessRole === 'editor') {
    return {
      label: 'Доступ: изменение',
      hint: 'Можно менять этапы и задачи',
      color: 'success',
      icon: 'mdi-pencil-outline',
    }
  }
  return {
    label: 'Доступ: просмотр',
    hint: 'Можно смотреть все задачи, без изменений',
    color: 'secondary',
    icon: 'mdi-eye-outline',
  }
}
