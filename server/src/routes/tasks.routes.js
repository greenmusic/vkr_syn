import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getMyTasks } from "../services/boards.service.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  res.json(await getMyTasks(req.user.id));
});

export default router;
