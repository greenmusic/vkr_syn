import { Op } from "sequelize";
import {
  Board,
  BoardLabel,
  BoardStage,
  BoardTask,
  BoardTaskParticipant,
  ChecklistItem,
  User,
  canEditBoard,
  destroyTaskRelations,
  safeHttpUrl,
  sequelize,
  serializeBoardTask,
  assigneeFields,
  toTaskPerson,
  byPosition,
} from "./shared.js";

const USER_FIELDS = ["id", "username", "email", "avatarData"];

const resolveUsers = async (ids) => {
  const uniqueIds = [...new Set((ids || []).map(String).filter(Boolean))];
  const users = uniqueIds.length
    ? await User.findAll({ where: { id: uniqueIds }, attributes: USER_FIELDS })
    : [];
  if (users.length !== uniqueIds.length) return null;
  return users;
};

const assignmentPayload = (users) => ({
  participants: users.map(toTaskPerson),
  ...assigneeFields(users[0]),
});

/** Задачи, где пользователь исполнитель или участник — страница «Мои задачи». */
export const getMyTasks = async (userId) => {
  const participantLinks = await BoardTaskParticipant.findAll({
    where: { userId },
    attributes: ["taskId"],
  });
  const participantTaskIds = participantLinks.map((row) => row.taskId);
  const tasks = await BoardTask.findAll({
    where: {
      [Op.or]: [
        { assigneeId: userId },
        ...(participantTaskIds.length ? [{ id: participantTaskIds }] : []),
      ],
    },
    include: [
      { model: Board, as: "board", attributes: ["id", "name"] },
      { model: BoardStage, as: "stage", attributes: ["id", "title"] },
    ],
    order: [
      ["dueDate", "ASC"],
      ["id", "ASC"],
    ],
  });

  return tasks.map((task) => ({
    id: String(task.id),
    title: task.title,
    completed: Boolean(task.completed),
    dueDate: task.dueDate || null,
    priority: task.priority || "medium",
    boardId: String(task.boardId),
    boardName: task.board?.name || "",
    stageTitle: task.stage?.title || "Без этапа",
  }));
};

/** Создаёт задачу в этапе. Нужно право редактирования доски. */
export const createTask = async (boardId, ownerId, title, stageId) => {
  const canEdit = await canEditBoard(boardId, ownerId);
  const stage = await BoardStage.findOne({
    where: { id: stageId, boardId },
  });
  if (!canEdit || !stage) return null;
  const task = await BoardTask.create({ boardId, stageId, title });
  return serializeBoardTask(task);
};

export const moveTask = async (boardId, ownerId, taskId, stageId) => {
  if (!(await canEditBoard(boardId, ownerId))) return false;
  const [updated] = await BoardTask.update(
    { stageId },
    { where: { id: taskId, boardId } },
  );
  return updated > 0;
};

export const reorderTask = async (
  boardId,
  ownerId,
  taskId,
  stageId,
  position,
) => {
  if (!(await canEditBoard(boardId, ownerId))) return false;

  const [task, targetStage] = await Promise.all([
    BoardTask.findOne({ where: { id: taskId, boardId } }),
    BoardStage.findOne({ where: { id: stageId, boardId } }),
  ]);
  if (!task || !targetStage) return false;

  const sourceStageId = task.stageId;
  const sourceTasks = await BoardTask.findAll({
    where: { boardId, stageId: sourceStageId },
    order: byPosition,
  });
  const targetTasks =
    sourceStageId === targetStage.id
      ? sourceTasks.filter((item) => item.id !== task.id)
      : await BoardTask.findAll({
          where: { boardId, stageId: targetStage.id },
          order: byPosition,
        });
  const targetPosition = Math.max(
    0,
    Math.min(Number(position), targetTasks.length),
  );
  targetTasks.splice(targetPosition, 0, task);

  if (sourceStageId !== targetStage.id) {
    await task.update({ stageId: targetStage.id });
    await Promise.all(
      sourceTasks
        .filter((item) => item.id !== task.id)
        .map((item, index) => item.update({ position: index })),
    );
  }
  await Promise.all(
    targetTasks.map((item, index) => item.update({ position: index })),
  );
  return true;
};

export const assignTask = async (boardId, ownerId, taskId, participantIds) => {
  const canEdit = await canEditBoard(boardId, ownerId);
  const task = await BoardTask.findOne({
    where: { id: taskId, boardId },
  });
  if (!canEdit || !task) return null;
  const users = await resolveUsers(participantIds);
  if (!users) return undefined;

  await task.setParticipants(users);
  await task.update({ assigneeId: users[0]?.id || null });
  return assignmentPayload(users);
};

/** Сохраняет поля задачи, участников, метки и чеклист. */
export const updateTaskDetails = async (boardId, userId, taskId, details) => {
  const canEdit = await canEditBoard(boardId, userId);
  const task = await BoardTask.findOne({ where: { id: taskId, boardId } });
  if (!canEdit || !task) return null;

  const users = await resolveUsers(details.participantIds);
  if (!users) return undefined;

  const labelIds = [...new Set((details.labelIds || []).map(String).filter(Boolean))];
  const labels = labelIds.length
    ? await BoardLabel.findAll({ where: { id: labelIds, boardId } })
    : [];

  const checklist = (details.checklist || [])
    .map((item, position) => ({
      title: String(item.title || "").trim(),
      completed: Boolean(item.completed),
      position,
    }))
    .filter((item) => item.title);

  await task.update({
    title: String(details.title || "").trim(),
    description: String(details.description || "").trim(),
    dueDate: details.dueDate || null,
    gitLink: safeHttpUrl(details.gitLink),
    priority: ["low", "medium", "high", "critical"].includes(details.priority)
      ? details.priority
      : "medium",
    completed: Boolean(details.completed),
    assigneeId: users[0]?.id || null,
  });
  await task.setParticipants(users);
  await task.setLabels(labels);
  await ChecklistItem.destroy({ where: { taskId: task.id } });
  await ChecklistItem.bulkCreate(
    checklist.map((item) => ({ ...item, taskId: task.id })),
  );
  const savedChecklist = await ChecklistItem.findAll({
    where: { taskId: task.id },
    order: byPosition,
  });

  return {
    ...serializeBoardTask({
      ...task.get({ plain: true }),
      assignee: users[0],
      participants: users,
      labels,
      checklist: savedChecklist,
    }),
  };
};

export const deleteTask = async (boardId, ownerId, taskId) => {
  if (!(await canEditBoard(boardId, ownerId))) return false;
  return sequelize.transaction(async (transaction) => {
    const task = await BoardTask.findOne({
      where: { id: taskId, boardId },
      attributes: ["id"],
      transaction,
    });
    if (!task) return false;
    await destroyTaskRelations([task.id], transaction);
    await BoardTask.destroy({ where: { id: taskId, boardId }, transaction });
    return true;
  });
};
