import { Router } from "express";
import { Op } from "sequelize";
import { authMiddleware } from "../middleware/auth.js";
import { User } from "../models/index.js";
import { serializeUser } from "../utils/serialize.js";

const router = Router();
router.use(authMiddleware);

const escapeLike = (value) =>
  String(value).replace(/[%_\\]/g, (char) => `\\${char}`);

router.get("/", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const where = query
    ? {
        [Op.or]: [
          { username: { [Op.like]: `%${escapeLike(query)}%` } },
          { email: { [Op.like]: `%${escapeLike(query)}%` } },
        ],
      }
    : undefined;

    const users = await User.findAll({
    where,
    attributes: ["id", "username", "email", "avatarData"],
    order: [["username", "ASC"]],
    limit: query ? 20 : 100,
  });
  res.json(users.map(serializeUser));
});

export default router;
