import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { User } from "../models/index.js";
import { fail, notFound } from "../utils/http.js";
import { serializeUser } from "../utils/serialize.js";
import { fileToDataUrl, imageUpload } from "../utils/upload.js";

const router = Router();
const upload = imageUpload(2 * 1024 * 1024);
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return notFound(res, "User not found");
  res.json(serializeUser(user));
});

router.patch("/", upload.single("avatar"), async (req, res) => {
  const username = String(req.body?.username || "").trim();
  if (!username) return fail(res, 400, "Username is required");
  if (username.length > 100) return fail(res, 400, "Username is too long");

  const user = await User.findByPk(req.user.id);
  if (!user) return notFound(res, "User not found");

  const updates = { username };
  if (req.file) updates.avatarData = fileToDataUrl(req.file);
  if (req.body.removeAvatar === "true") updates.avatarData = null;

  await user.update(updates);
  res.json(serializeUser(user));
});

export default router;
