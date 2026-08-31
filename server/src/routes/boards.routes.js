import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { fail, notFound } from "../utils/http.js";
import { fileToDataUrl, imageUpload } from "../utils/upload.js";
import {
  addMember,
  addStage,
  assignTask,
  createBoard,
  createLabel,
  createTask,
  deleteLabel,
  deleteStage,
  deleteTask,
  getBoard,
  getBoards,
  deleteBoard,
  moveTask,
  removeMember,
  reorderStages,
  reorderTask,
  renameStage,
  updateLabel,
  updateTaskDetails,
  updateBoardDetails,
  updateVisibility,
  updateBackground,
} from "../services/boards.service.js";

const router = Router();
const upload = imageUpload(4 * 1024 * 1024);
router.use(authMiddleware);

const LABEL_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const VISIBILITY = ["private", "public"];

router.delete("/:boardId", async (req, res) => {
  if (!(await deleteBoard(req.params.boardId, req.user.id))) {
    return notFound(res, "Board not found");
  }
  res.status(204).end();
});

router.get("/", async (req, res) => {
  res.json(await getBoards(req.user.id));
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const visibility = String(req.body?.visibility || "private");
  if (!name) return fail(res, 400, "Board name is required");
  if (!VISIBILITY.includes(visibility)) {
    return fail(res, 400, "Invalid board visibility");
  }
  res.status(201).json(await createBoard({ userId: req.user.id, name, visibility }));
});

router.patch("/:boardId/visibility", async (req, res) => {
  const visibility = String(req.body?.visibility || "");
  if (!VISIBILITY.includes(visibility)) {
    return fail(res, 400, "Invalid board visibility");
  }
  const updated = await updateVisibility(req.params.boardId, req.user.id, visibility);
  if (!updated) return notFound(res, "Board not found");
  res.json({ visibility });
});

router.patch("/:boardId/details", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return fail(res, 400, "Board name is required");
  if (name.length > 255) return fail(res, 400, "Board name is too long");

  const updated = await updateBoardDetails(req.params.boardId, req.user.id, {
    name,
    description: req.body?.description,
    status: req.body?.status,
    startDate: req.body?.startDate,
    dueDate: req.body?.dueDate,
  });
  if (!updated) return notFound(res, "Board not found");
  res.json(await getBoard(req.user.id, req.params.boardId));
});

router.patch("/:boardId/background", upload.single("background"), async (req, res) => {
  const background =
    req.body.removeBackground === "true"
      ? null
      : req.file
        ? fileToDataUrl(req.file)
        : undefined;
  if (background === undefined) {
    return fail(res, 400, "Background image is required");
  }
  const updated = await updateBackground(req.params.boardId, req.user.id, background);
  if (!updated) return notFound(res, "Board not found");
  res.json({ background });
});

router.post("/:boardId/members", async (req, res) => {
  if (!req.body?.userId) return fail(res, 400, "User is required");
  const member = await addMember(
    req.params.boardId,
    req.user.id,
    req.body.userId,
    req.body.role,
  );
  if (!member) return notFound(res, "Board or user not found");
  res.status(201).json(member);
});

router.delete("/:boardId/members/:userId", async (req, res) => {
  const removed = await removeMember(
    req.params.boardId,
    req.user.id,
    req.params.userId,
  );
  if (!removed) return notFound(res, "Board member not found");
  res.status(204).end();
});

router.post("/:boardId/stages", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return fail(res, 400, "Stage title is required");
  const stage = await addStage(req.params.boardId, req.user.id, title);
  if (!stage) return notFound(res, "Board not found");
  res.status(201).json({
    id: String(stage.id),
    key: String(stage.id),
    title: stage.title,
  });
});

router.delete("/:boardId/stages/:stageId", async (req, res) => {
  const deleted = await deleteStage(
    req.params.boardId,
    req.user.id,
    req.params.stageId,
  );
  if (!deleted) return notFound(res, "Stage not found");
  res.status(204).end();
});

router.patch("/:boardId/stages/:stageId", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return fail(res, 400, "Stage title is required");
  if (title.length > 255) return fail(res, 400, "Stage title is too long");

  const updated = await renameStage(
    req.params.boardId,
    req.user.id,
    req.params.stageId,
    title,
  );
  if (!updated) return notFound(res, "Stage not found");
  res.json({
    id: String(req.params.stageId),
    key: String(req.params.stageId),
    title,
  });
});

router.put("/:boardId/stages/order", async (req, res) => {
  const stageIds = Array.isArray(req.body?.stageIds) ? req.body.stageIds : [];
  if (!stageIds.length) return fail(res, 400, "Stage order is required");
  const result = await reorderStages(req.params.boardId, req.user.id, stageIds);
  if (result === false) return notFound(res, "Board not found");
  if (result === null) return fail(res, 400, "Invalid stage order");
  res.json({ stageIds: stageIds.map(String) });
});

router.post("/:boardId/labels", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const color = String(req.body?.color || "").trim();
  if (!title) return fail(res, 400, "Label title is required");
  if (!LABEL_COLOR.test(color)) return fail(res, 400, "Invalid label color");
  const label = await createLabel(req.params.boardId, req.user.id, title, color);
  if (!label) return notFound(res, "Board not found");
  res.status(201).json(label);
});

router.patch("/:boardId/labels/:labelId", async (req, res) => {
  const title =
    req.body?.title !== undefined ? String(req.body.title).trim() : undefined;
  const color =
    req.body?.color !== undefined ? String(req.body.color).trim() : undefined;
  if (title !== undefined && !title) return fail(res, 400, "Label title is required");
  if (color !== undefined && !LABEL_COLOR.test(color)) {
    return fail(res, 400, "Invalid label color");
  }
  const result = await updateLabel(
    req.params.boardId,
    req.user.id,
    req.params.labelId,
    { title, color },
  );
  if (!result) return notFound(res, "Label not found");
  res.json(result);
});

router.delete("/:boardId/labels/:labelId", async (req, res) => {
  const deleted = await deleteLabel(
    req.params.boardId,
    req.user.id,
    req.params.labelId,
  );
  if (!deleted) return notFound(res, "Label not found");
  res.status(204).end();
});

router.post("/:boardId/tasks", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title || !req.body?.stageId) {
    return fail(res, 400, "Task title and stage are required");
  }
  const task = await createTask(
    req.params.boardId,
    req.user.id,
    title,
    req.body.stageId,
  );
  if (!task) return notFound(res, "Board or stage not found");
  res.status(201).json(task);
});

router.patch("/:boardId/tasks/:taskId", async (req, res) => {
  if (!req.body?.stageId) return fail(res, 400, "Stage is required");
  const updated = Number.isInteger(req.body?.position)
    ? await reorderTask(
        req.params.boardId,
        req.user.id,
        req.params.taskId,
        req.body.stageId,
        req.body.position,
      )
    : await moveTask(
        req.params.boardId,
        req.user.id,
        req.params.taskId,
        req.body.stageId,
      );
  if (!updated) return notFound(res, "Task not found");
  res.json({ id: String(req.params.taskId), status: String(req.body.stageId) });
});

router.patch("/:boardId/tasks/:taskId/assignee", async (req, res) => {
  const result = await assignTask(
    req.params.boardId,
    req.user.id,
    req.params.taskId,
    Array.isArray(req.body?.participantIds)
      ? req.body.participantIds
      : req.body?.assigneeId
        ? [req.body.assigneeId]
        : [],
  );
  if (result === null) return notFound(res, "Board or task not found");
  if (result === undefined) return notFound(res, "Participant not found");
  res.json(result);
});

router.patch("/:boardId/tasks/:taskId/details", async (req, res) => {
  if (!String(req.body?.title || "").trim()) {
    return fail(res, 400, "Task title is required");
  }
  const result = await updateTaskDetails(
    req.params.boardId,
    req.user.id,
    req.params.taskId,
    {
      title: req.body.title,
      description: req.body?.description,
      dueDate: req.body?.dueDate,
      gitLink: req.body?.gitLink,
      priority: req.body?.priority,
      completed: Boolean(req.body?.completed),
      participantIds: Array.isArray(req.body?.participantIds)
        ? req.body.participantIds
        : [],
      labelIds: Array.isArray(req.body?.labelIds) ? req.body.labelIds : [],
      checklist: Array.isArray(req.body?.checklist) ? req.body.checklist : [],
    },
  );
  if (result === null) return notFound(res, "Board or task not found");
  if (result === undefined) return notFound(res, "Participant not found");
  res.json(result);
});

router.delete("/:boardId/tasks/:taskId", async (req, res) => {
  const deleted = await deleteTask(
    req.params.boardId,
    req.user.id,
    req.params.taskId,
  );
  if (!deleted) return notFound(res, "Task not found");
  res.status(204).end();
});

router.get("/:boardId", async (req, res) => {
  const board = await getBoard(req.user.id, req.params.boardId);
  if (!board) return notFound(res, "Board not found");
  res.json(board);
});

export default router;
