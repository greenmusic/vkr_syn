/** Аватар пользователя: в задачах поле avatar, в профиле avatarData. */
export const userAvatarSrc = (user) => user?.avatar || user?.avatarData || null

export const userDisplayName = (user) => {
  const name = String(user?.username || "").trim()
  if (name && name !== 'Участник') return name
  const email = String(user?.email || "").trim()
  if (email) return email
  return ''
}
