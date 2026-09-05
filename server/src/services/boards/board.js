import {
  Board,
  BoardLabel,
  BoardMember,
  BoardStage,
  BoardTask,
  User,
  sequelize,
  DEFAULT_STAGES,
  accessibleWhere,
  destroyTaskRelations,
  getAccessibleBoardIds,
  loadBoards,
  serializeBoard,
  serializeBoardSummary,
  toTaskPerson,
  sameId,
} from "./shared.js";

/** Список досок, которые пользователь видит: свои, чужие с доступом и публичные. */
export const getBoards = async (userId) => {
  const listedBoardIds = await getAccessibleBoardIds(userId);
  const boards = await Board.findAll({
    where: await accessibleWhere(userId, null, listedBoardIds),
    attributes: [
      "id",
      "userId",
      "name",
      "status",
      "backgroundData",
      "visibility",
      "createTime",
    ],
    include: [
      {
        model: BoardTask,
        as: "tasks",
        attributes: ["id", "completed"],
        separate: true,
      },
      {
        model: User,
        as: "members",
        attributes: ["id"],
        through: { attributes: ["role"] },
      },
    ],
    order: [["createTime", "ASC"]],
  });
  return boards.map((board) => serializeBoardSummary(board, userId, listedBoardIds));
};

/** Полная доска по id, если к ней есть доступ. */
export const getBoard = async (userId, boardId) => {
  const boards = await loadBoards(userId, boardId);
  if (!boards[0]) return null;
  const serialized = serializeBoard(boards[0], userId);
  const memberIds = (serialized.members || []).map((member) => member.id).filter(Boolean);
  if (!memberIds.length) return serialized;

  const profiles = await User.findAll({
    where: { id: memberIds },
    attributes: ["id", "username", "email", "avatarData"],
  });
  const byId = new Map(profiles.map((user) => [String(user.id), toTaskPerson(user)]));
  serialized.members = serialized.members.map((member) => {
    const profile = byId.get(String(member.id)) || {};
    return {
      ...profile,
      ...member,
      id: String(member.id),
      username: member.username || profile.username || member.email || profile.email,
      email: member.email || profile.email,
      avatar: member.avatar || profile.avatar,
      role: member.role,
    };
  });
  return serialized;
};

/** Создаёт доску автору и три стартовых этапа. */
export const createBoard = async ({ userId, name, visibility }) => {
  const board = await Board.create({ userId, name, visibility });
  await BoardStage.bulkCreate(
    DEFAULT_STAGES.map((title, position) => ({
      boardId: board.id,
      title,
      position,
    })),
  );
  return getBoard(userId, board.id);
};

export const updateVisibility = async (boardId, userId, visibility) => {
  const [updated] = await Board.update(
    { visibility },
    { where: { id: boardId, userId } },
  );
  return updated > 0;
};

/** Название, описание, статус и сроки. Меняет только автор. */
export const updateBoardDetails = async (boardId, userId, details) => {
  const name = String(details.name || "").trim();
  if (!name || name.length > 255) return false;

  const board = await Board.findOne({ where: { id: boardId, userId } });
  if (!board) return false;

  const status = ["planning", "active", "on_hold", "completed"].includes(details.status)
    ? details.status
    : "active";

  await board.update({
    name,
    description: String(details.description || "").trim() || null,
    status,
    startDate: details.startDate || null,
    dueDate: details.dueDate || null,
  });
  return true;
};

export const updateBackground = async (boardId, userId, backgroundData) => {
  const [updated] = await Board.update(
    { backgroundData },
    { where: { id: boardId, userId } },
  );
  return updated > 0;
};

export const addMember = async (boardId, ownerId, userId, role = "editor") => {
  const board = await Board.findOne({
    where: { id: boardId, userId: ownerId },
  });
  if (!board) return null;
  const user = await User.findByPk(userId, {
    attributes: ["id", "username", "email", "avatarData"],
  });
  if (!user || sameId(user.id, ownerId)) return null;
  const memberRole = role === "viewer" ? "viewer" : "editor";
  const [membership] = await BoardMember.findOrCreate({
    where: { boardId, userId },
    defaults: { role: memberRole },
  });
  if (membership.role !== memberRole) await membership.update({ role: memberRole });
  return { ...toTaskPerson(user), role: memberRole };
};

export const removeMember = async (boardId, ownerId, userId) => {
  const board = await Board.findOne({
    where: { id: boardId, userId: ownerId },
  });
  if (!board) return false;
  const deleted = await BoardMember.destroy({
    where: { boardId, userId },
  });
  return deleted > 0;
};

/** Удаляет доску и связанные этапы, задачи, метки и участников. Только автор. */
export const deleteBoard = async (boardId, userId) => {
  const board = await Board.findOne({ where: { id: boardId, userId } });
  if (!board) return false;

  const tasks = await BoardTask.findAll({
    where: { boardId },
    attributes: ["id"],
  });
  const taskIds = tasks.map((task) => task.id);

  await sequelize.transaction(async (transaction) => {
    if (taskIds.length) {
      await destroyTaskRelations(taskIds, transaction);
      await BoardTask.destroy({ where: { boardId }, transaction });
    }
    await BoardLabel.destroy({ where: { boardId }, transaction });
    await BoardStage.destroy({ where: { boardId }, transaction });
    await BoardMember.destroy({ where: { boardId }, transaction });
    await board.destroy({ transaction });
  });
  return true;
};
