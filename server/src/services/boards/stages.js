import {
  BoardStage,
  BoardTask,
  canEditBoard,
  destroyTaskRelations,
  sequelize,
} from "./shared.js";

export const addStage = async (boardId, ownerId, title) => {
  if (!(await canEditBoard(boardId, ownerId))) return null;
  const lastStage = await BoardStage.findOne({
    where: { boardId },
    order: [
      ["position", "DESC"],
      ["id", "DESC"],
    ],
  });
  return BoardStage.create({
    boardId,
    title,
    position: (lastStage?.position ?? -1) + 1,
  });
};

export const renameStage = async (boardId, userId, stageId, title) => {
  if (!(await canEditBoard(boardId, userId))) return null;
  const [updated] = await BoardStage.update(
    { title },
    { where: { id: stageId, boardId } },
  );
  return updated > 0;
};

export const deleteStage = async (boardId, userId, stageId) => {
  if (!(await canEditBoard(boardId, userId))) return false;

  return sequelize.transaction(async (transaction) => {
    const stage = await BoardStage.findOne({
      where: { id: stageId, boardId },
      transaction,
    });
    if (!stage) return false;

    const tasks = await BoardTask.findAll({
      where: { boardId, stageId },
      attributes: ["id"],
      transaction,
    });
    const taskIds = tasks.map((task) => task.id);
    if (taskIds.length) {
      await destroyTaskRelations(taskIds, transaction);
      await BoardTask.destroy({
        where: { id: taskIds, boardId, stageId },
        transaction,
      });
    }
    await stage.destroy({ transaction });
    return true;
  });
};

export const reorderStages = async (boardId, ownerId, stageIds) => {
  if (!(await canEditBoard(boardId, ownerId))) return false;
  const stages = await BoardStage.findAll({
    where: { boardId },
    attributes: ["id"],
  });
  const storedIds = stages.map((stage) => String(stage.id));
  if (
    stageIds.length !== storedIds.length ||
    stageIds.some((id) => !storedIds.includes(String(id)))
  )
    return null;
  await Promise.all(
    stageIds.map((stageId, position) =>
      BoardStage.update({ position }, { where: { id: stageId, boardId } }),
    ),
  );
  return true;
};
