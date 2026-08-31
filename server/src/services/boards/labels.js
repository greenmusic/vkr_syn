import { BoardLabel, canEditBoard, toLabel } from "./shared.js";

export const createLabel = async (boardId, ownerId, title, color) => {
  if (!(await canEditBoard(boardId, ownerId))) return null;
  const lastLabel = await BoardLabel.findOne({
    where: { boardId },
    order: [
      ["position", "DESC"],
      ["id", "DESC"],
    ],
  });
  const label = await BoardLabel.create({
    boardId,
    title,
    color,
    position: (lastLabel?.position ?? -1) + 1,
  });
  return toLabel(label);
};

export const updateLabel = async (boardId, userId, labelId, { title, color }) => {
  if (!(await canEditBoard(boardId, userId))) return null;
  const label = await BoardLabel.findOne({ where: { id: labelId, boardId } });
  if (!label) return false;
  await label.update({
    title: title !== undefined ? title : label.title,
    color: color !== undefined ? color : label.color,
  });
  return toLabel(label);
};

export const deleteLabel = async (boardId, userId, labelId) => {
  if (!(await canEditBoard(boardId, userId))) return false;
  const deleted = await BoardLabel.destroy({ where: { id: labelId, boardId } });
  return deleted > 0;
};
