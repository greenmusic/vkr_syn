/** Пользователь для клиента: без пароля и соли. id — строка, как у досок и задач. */
export const toUser = (user) => ({
  id: String(user.id),
  username: user.username,
  email: user.email,
});

export const serializeUser = (user) => ({
  ...toUser(user),
  avatar: user.avatarData || null,
});
