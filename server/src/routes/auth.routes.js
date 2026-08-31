import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  authCookieOptions,
  cookieFlags,
  generateToken,
  hashPassword,
  verifyPassword,
} from "../utils/security.js";
import { fail } from "../utils/http.js";
import { serializeUser } from "../utils/serialize.js";
import { User } from "../models/index.js";
import {
  buildAuthorizeUrl,
  clearOAuthStateCookie,
  createOAuthState,
  exchangeBitrixCode,
  fetchBitrixAvatarData,
  fetchBitrixCurrentUser,
  findOrCreateBitrixUser,
  frontendRedirect,
  getBitrixPublicConfig,
  isBitrixConfigured,
  normalizeHostFromToken,
  readOAuthStateCookie,
  resolvePortal,
  safeAppPath,
  setOAuthStateCookie,
} from "../services/bitrix24.auth.js";

const router = Router();
const setAuthCookie = (res, token) => res.cookie("auth_token", token, authCookieOptions);
const issueSession = (res, user) => {
  const safeUser = serializeUser(user);
  setAuthCookie(res, generateToken(safeUser));
  return safeUser;
};

router.post("/register", async (req, res) => {
  const cleanUsername = String(req.body?.username || "").trim();
  const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!cleanUsername || !cleanEmail || password.length < 6) {
    return fail(res, 400, "Invalid username, email or password");
  }

  const existingUser = await User.findOne({ where: { email: cleanEmail } });
  if (existingUser) {
    return fail(res, 409, "User with this email already exists");
  }

  const { salt, hash } = hashPassword(password);
  const user = await User.create({
    username: cleanUsername,
    email: cleanEmail,
    password: hash,
    salt,
  });
  res.status(201).json({
    message: "User registered successfully",
    user: issueSession(res, user),
  });
});

router.post("/login", async (req, res) => {
  const { email, password: inputPassword } = req.body || {};
  if (!email || !inputPassword) {
    return fail(res, 400, "email and password are required");
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ where: { email: cleanEmail } });
  const passwordOk = verifyPassword(
    String(inputPassword),
    user?.salt || "0".repeat(32),
    user?.password || "0".repeat(128),
  );
  if (!user || !passwordOk) {
    return fail(res, 401, "Invalid email or password");
  }

  res.json({ message: "Login successful", user: issueSession(res, user) });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return fail(res, 401, "User not found");
  res.json(serializeUser(user));
});

router.get("/bitrix24/config", (_req, res) => {
  res.json(getBitrixPublicConfig());
});

router.get("/bitrix24/start", (req, res) => {
  if (!isBitrixConfigured()) {
    return res.redirect(frontendRedirect("/login?error=bitrix_not_configured"));
  }

  const portal = resolvePortal(req.query.portal);
  if (!portal) {
    return res.redirect(frontendRedirect("/login?error=bitrix_portal"));
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, state, portal);
  res.cookie("bitrix_oauth_redirect", safeAppPath(req.query.redirect), {
    ...cookieFlags,
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(buildAuthorizeUrl(portal, state));
});

router.get("/bitrix24/callback", async (req, res) => {
  const failOAuth = (code) => {
    clearOAuthStateCookie(res);
    return res.redirect(frontendRedirect(`/login?error=${code}`));
  };

  if (!isBitrixConfigured()) return failOAuth("bitrix_not_configured");
  if (req.query.error) return failOAuth("bitrix_denied");

  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  const stored = readOAuthStateCookie(req);
  if (!code || !stored || stored.state !== state) return failOAuth("bitrix_state");

  try {
    const tokenPayload = await exchangeBitrixCode(code);
    const profile = await fetchBitrixCurrentUser(tokenPayload);
    const portal = normalizeHostFromToken(tokenPayload) || stored.portal;
    const avatarData = await fetchBitrixAvatarData(profile, portal, tokenPayload);
    const user = await findOrCreateBitrixUser(profile, portal, avatarData);
    issueSession(res, user);
    clearOAuthStateCookie(res);
    res.clearCookie("bitrix_oauth_redirect", cookieFlags);
    return res.redirect(frontendRedirect(safeAppPath(req.cookies?.bitrix_oauth_redirect)));
  } catch (error) {
    console.error("[Bitrix24] OAuth error:", error.message);
    return failOAuth("bitrix_token");
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("auth_token", cookieFlags);
  res.json({ message: "Logout successful" });
});

export default router;
