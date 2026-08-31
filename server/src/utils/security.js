import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookieSecure } from "../config.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

/** Хэширует пароль (PBKDF2). Если соль не передана — создаёт новую. */
export const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex"),
) => {
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
};

/** Сверяет пароль с сохранённым хэшем. */
export const verifyPassword = (password, salt, hash) =>
  crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex") ===
  hash;

/** JWT сессии: в токене только id и отображаемые поля, без пароля. */
export const generateToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const cookieFlags = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: "lax",
  path: "/",
};

/** HttpOnly-cookie с JWT. Secure — см. COOKIE_SECURE / NODE_ENV. */
export const authCookieOptions = {
  ...cookieFlags,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
