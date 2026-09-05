import { Op } from "sequelize";
import {
  Board,
  BoardLabel,
  BoardMember,
  BoardStage,
  BoardTask,
  BoardTaskLabel,
  BoardTaskParticipant,
  ChecklistItem,
  User,
  sequelize,
} from "../../models/index.js";
import { toUser, serializeUser as toTaskPerson } from "../../utils/serialize.js";

const DEFAULT_STAGES = ["Сделать", "В процессе", "Выполнено"];
export const byPosition = [
  ["position", "ASC"],
  ["id", "ASC"],
];

const boardIncludes = [
  {
    model: BoardStage,
    as: "stages",
    separate: true,
    order: byPosition,
  },
  {
    model: BoardLabel,
    as: "labels",
    separate: true,
    order: byPosition,
  },
  {
    model: BoardTask,
    as: "tasks",
    separate: true,
    order: byPosition,
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "username", "email", "avatarData"],
      },
      {
        model: User,
        as: "participants",
        attributes: ["id", "username", "email", "avatarData"],
        through: { attributes: [] },
      },
      {
        model: BoardLabel,
        as: "labels",
        attributes: ["id", "title", "color"],
        through: { attributes: [] },
      },
      {
        model: ChecklistItem,
        as: "checklist",
        attributes: ["id", "title", "completed", "position"],
        order: byPosition,
      },
    ],
  },
  {
    model: User,
    as: "members",
    attributes: ["id", "username", "email", "avatarData"],
    through: { attributes: ["role"] },
  },
];

export const sameId = (a, b) => Number(a) === Number(b);

export const toLabel = (label) => ({
  id: String(label.id),
  title: label.title,
  color: label.color,
});

export { toUser, toTaskPerson };

const toMember = (user) => ({
  ...toTaskPerson(user),
  role: user.BoardMember?.role || user.dataValues?.BoardMember?.role || "editor",
});

export const assigneeFields = (user) => ({
  assigneeId: user ? String(user.id) : null,
  assigneeName: user?.username || null,
  assigneeEmail: user?.email || null,
  assigneeAvatar: user?.avatarData || null,
});

const boardProgress = (tasks) =>
  tasks.length
    ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)
    : 0;

const userOnTask = (task, userId) =>
  sameId(task.assigneeId, userId) ||
  (task.participants || []).some((participant) => sameId(participant.id, userId));

export const serializeBoardTask = (task) => ({
  id: String(task.id),
  title: task.title,
  description: task.description || "",
  dueDate: task.dueDate || null,
  completed: Boolean(task.completed),
  status: String(task.stageId),
  gitLink: task.gitLink || null,
  priority: task.priority || "medium",
  assigneeId: task.assigneeId ? String(task.assigneeId) : null,
  assigneeName: task.assignee?.username || null,
  assigneeEmail: task.assignee?.email || null,
  assigneeAvatar: task.assignee?.avatarData || null,
  participants: (task.participants || []).map(toTaskPerson),
  labels: (task.labels || []).map(toLabel),
  checklist: (task.checklist || []).map((item) => ({
    id: String(item.id),
    title: item.title,
    completed: item.completed,
    position: item.position,
  })),
});

/** Только http/https — чтобы в карточке не оказалась javascript:-ссылка. */
export const safeHttpUrl = (value) => {
  const link = String(value || "").trim();
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const destroyTaskRelations = async (taskIds, transaction) => {
  if (!taskIds.length) return;
  await ChecklistItem.destroy({ where: { taskId: taskIds }, transaction });
  await BoardTaskParticipant.destroy({ where: { taskId: taskIds }, transaction });
  await BoardTaskLabel.destroy({ where: { taskId: taskIds }, transaction });
};

/** Автор доски или участник с правом «редактор». */
export const canEditBoard = async (boardId, userId) => {
  const board = await Board.findOne({ where: { id: boardId, userId } });
  if (board) return true;

  const membership = await BoardMember.findOne({ where: { boardId, userId } });
  return membership?.role === "editor";
};

const getAccessMeta = (board, userId) => {
  const isOwner = sameId(board.userId, userId);
  const isEditorMember = (board.members || []).some(
    (member) =>
      sameId(member.id, userId) &&
      (member.BoardMember?.role || "editor") === "editor",
  );
  const canEdit = isOwner || isEditorMember;
  return {
    isOwner,
    canEdit,
    accessRole: isOwner ? "owner" : canEdit ? "editor" : "viewer",
  };
};

export const serializeBoard = (board, userId) => {
  const { isOwner, canEdit, accessRole } = getAccessMeta(board, userId);
  const isBoardMember = board.members.some((member) => sameId(member.id, userId));
  const canViewAllTasks =
    isOwner || board.visibility === "public" || isBoardMember;
  const visibleTasks = canViewAllTasks
    ? board.tasks
    : board.tasks.filter((task) => userOnTask(task, userId));
  const visibleStageIds = new Set(visibleTasks.map((task) => String(task.stageId)));

  return {
    id: String(board.id),
    name: board.name,
    description: board.description || "",
    status: board.status || "active",
    startDate: board.startDate || null,
    dueDate: board.dueDate || null,
    progress: boardProgress(board.tasks),
    background: board.backgroundData || null,
    isOwner,
    canEdit,
    accessRole,
    visibility: board.visibility,
    members: board.members.map(toMember),
    labels: board.labels.map(toLabel),
    stages: board.stages
      .filter((stage) => canViewAllTasks || visibleStageIds.has(String(stage.id)))
      .map((stage) => ({
        id: String(stage.id),
        key: String(stage.id),
        title: stage.title,
      })),
    tasks: visibleTasks.map(serializeBoardTask),
  };
};

export const getAccessibleBoardIds = async (userId) => {
  const [members, assigned, participantLinks] = await Promise.all([
    BoardMember.findAll({ where: { userId }, attributes: ["boardId"] }),
    BoardTask.findAll({ where: { assigneeId: userId }, attributes: ["boardId"] }),
    BoardTaskParticipant.findAll({ where: { userId }, attributes: ["taskId"] }),
  ]);
  const participantTaskIds = participantLinks.map((row) => row.taskId);
  const participantTasks = participantTaskIds.length
    ? await BoardTask.findAll({
        where: { id: participantTaskIds },
        attributes: ["boardId"],
      })
    : [];

  return [
    ...new Set([
      ...members.map((row) => row.boardId),
      ...assigned.map((row) => row.boardId),
      ...participantTasks.map((row) => row.boardId),
    ]),
  ];
};

export const accessibleWhere = async (userId, boardId = null, extraIds = null) => {
  const ids = extraIds ?? (await getAccessibleBoardIds(userId));
  const accessOr = [
    { userId },
    { visibility: "public" },
    ...(ids.length ? [{ id: ids }] : []),
  ];
  return boardId ? { id: boardId, [Op.or]: accessOr } : { [Op.or]: accessOr };
};

export const serializeBoardSummary = (board, userId, listedBoardIds = []) => {
  const { isOwner, canEdit, accessRole } = getAccessMeta(board, userId);
  const listed = new Set(listedBoardIds.map(Number));
  const isListed =
    !isOwner &&
    (listed.has(Number(board.id)) ||
      (board.members || []).some((member) => sameId(member.id, userId)));
  return {
    id: String(board.id),
    name: board.name,
    status: board.status || "active",
    background: board.backgroundData || null,
    visibility: board.visibility,
    isOwner,
    canEdit,
    isListed,
    accessRole,
    progress: boardProgress(board.tasks || []),
  };
};

export const loadBoards = async (userId, boardId = null) => {
  return Board.findAll({
    where: await accessibleWhere(userId, boardId),
    include: boardIncludes,
    order: [["createTime", "ASC"]],
  });
};

export {
  Board,
  BoardLabel,
  BoardMember,
  BoardStage,
  BoardTask,
  BoardTaskParticipant,
  ChecklistItem,
  User,
  sequelize,
  DEFAULT_STAGES,
};
