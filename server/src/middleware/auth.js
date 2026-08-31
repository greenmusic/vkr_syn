import { verifyToken } from "../utils/security.js";

/** Достаёт пользователя из cookie auth_token. Без токена — 401. */
export const authMiddleware = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ error: "Authorization token is missing" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
