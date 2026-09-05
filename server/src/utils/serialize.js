/** Пользователь для клиента: без пароля и соли. id — строка, как у досок и задач. */
export const toUser = (user) => {
  const src = user?.dataValues || user || {};
  const email = src.email || user.email || "";
  const username = src.username || user.username || email;
  return {
    id: String(src.id ?? user.id ?? ""),
    username,
    email,
  };
};

export const serializeUser = (user) => ({
  ...toUser(user),
  avatar: user?.avatarData || user?.avatar_data || user?.avatar || user?.dataValues?.avatarData || null,
});
