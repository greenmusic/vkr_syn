/**
 * Доски и задачи.
 * Автор может всё; редактор — этапы и задачи; остальные только просмотр
 * (свои задачи и публичные доски).
 */
export {
  getBoards,
  getBoard,
  createBoard,
  updateVisibility,
  updateBoardDetails,
  updateBackground,
  addMember,
  removeMember,
  deleteBoard,
} from "./boards/board.js";
export {
  addStage,
  renameStage,
  deleteStage,
  reorderStages,
} from "./boards/stages.js";
export { createLabel, updateLabel, deleteLabel } from "./boards/labels.js";
export {
  getMyTasks,
  createTask,
  moveTask,
  reorderTask,
  assignTask,
  updateTaskDetails,
  deleteTask,
} from "./boards/tasks.js";
