import crypto from "crypto";
import { hashPassword, cookieFlags } from "../utils/security.js";
import { User } from "../models/index.js";
import { frontendOrigin } from "../config.js";

const STATE_COOKIE = "bitrix_oauth_state";

/** OAuth-приложение Bitrix24 задано в .env. */
export const isBitrixConfigured = () =>
  Boolean(
    process.env.BITRIX24_CLIENT_ID &&
      process.env.BITRIX24_CLIENT_SECRET &&
      process.env.BITRIX24_REDIRECT_URI,
  );

/** Публичные настройки для экрана входа (без секретов). */
export const getBitrixPublicConfig = () => ({
  enabled: isBitrixConfigured(),
  domain: normalizePortal(process.env.BITRIX24_DOMAIN) || "",
  allowCustom: process.env.BITRIX24_ALLOW_CUSTOM_PORTAL === "true",
});

/** Хост портала без протокола: company.bitrix24.ru */
export const normalizePortal = (input) => {
  const host = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!host || host.length > 253) return null;
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(host)) return null;
  return host;
};

export const resolvePortal = (requested) => {
  const fromEnv = normalizePortal(process.env.BITRIX24_DOMAIN);
  const fromRequest = normalizePortal(requested);
  if (process.env.BITRIX24_ALLOW_CUSTOM_PORTAL === "true" && fromRequest) {
    return fromRequest;
  }
  return fromEnv || fromRequest;
};

export const buildAuthorizeUrl = (portal, state) => {
  const params = new URLSearchParams({
    client_id: process.env.BITRIX24_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.BITRIX24_REDIRECT_URI,
    state,
  });
  return `https://${portal}/oauth/authorize/?${params.toString()}`;
};

export const createOAuthState = () => crypto.randomBytes(24).toString("hex");

export const setOAuthStateCookie = (res, state, portal) => {
  res.cookie(STATE_COOKIE, `${state}.${portal}`, {
    ...cookieFlags,
    maxAge: 10 * 60 * 1000,
  });
};

export const readOAuthStateCookie = (req) => {
  const raw = String(req.cookies?.[STATE_COOKIE] || "");
  const separator = raw.indexOf(".");
  if (separator < 1) return null;
  return {
    state: raw.slice(0, separator),
    portal: raw.slice(separator + 1),
  };
};

export const clearOAuthStateCookie = (res) => {
  res.clearCookie(STATE_COOKIE, cookieFlags);
};

/** Меняет код OAuth на access_token. */
export const exchangeBitrixCode = async (code) => {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.BITRIX24_CLIENT_ID,
    client_secret: process.env.BITRIX24_CLIENT_SECRET,
    code: String(code),
    redirect_uri: process.env.BITRIX24_REDIRECT_URI,
  });
  const response = await fetch(
    `https://oauth.bitrix.info/oauth/token/?${params.toString()}`,
  );
  const payload = await response.json();
  if (!payload?.access_token) {
    const description = payload?.error_description || payload?.error || "token_error";
    throw new Error(String(description));
  }
  return payload;
};

/** Текущий пользователь портала (user.current). */
export const fetchBitrixCurrentUser = async (tokenPayload) => {
  const { endpoint, auth } = restContext(tokenPayload);
  const payload = await restGet(`${endpoint}user.current.json?auth=${auth}`);
  if (!payload?.result?.ID) {
    throw new Error("Не удалось получить профиль Bitrix24");
  }
  return payload.result;
};

const restContext = (tokenPayload) => ({
  endpoint: String(tokenPayload.client_endpoint || "").replace(/\/?$/, "/"),
  auth: String(tokenPayload.access_token || ""),
});

const restGet = async (url) => {
  const response = await fetch(url);
  return response.json();
};

const restPost = async (endpoint, method, auth, fields) => {
  const response = await fetch(
    `${endpoint}${method}.json?auth=${encodeURIComponent(auth)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
  );
  return response.json();
};

const firstPhotoValue = (value) => {
  if (value == null || value === false) return "";
  if (Array.isArray(value)) return firstPhotoValue(value[0]);
  if (typeof value === "object") {
    return firstPhotoValue(
      value.url ||
        value.src ||
        value.URL ||
        value.downloadUrl ||
        value.DOWNLOAD_URL ||
        value.PERSONAL_PHOTO,
    );
  }
  return String(value).trim();
};

const toAbsolutePhotoUrl = (value, portal) => {
  const raw = firstPhotoValue(value);
  if (!raw || /^\d+$/.test(raw)) return null;
  if (/blank\.svg|default[_-]?user|default_avatar/i.test(raw)) return null;
  if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/") && portal) return `https://${portal}${raw}`;
  return null;
};

const collectPhotoUrls = async (profile, portal, tokenPayload) => {
  const urls = [];
  const push = (value) => {
    const url = toAbsolutePhotoUrl(value, portal);
    if (url && !urls.includes(url)) urls.push(url);
  };

  push(profile.PERSONAL_PHOTO);
  push(profile.PERSONAL_PHOTO_URL);

  if (!tokenPayload?.access_token) return urls;

  const { endpoint, auth } = restContext(tokenPayload);
  const userId = profile.ID;

  try {
    const imUser = await restPost(endpoint, "im.user.get", auth, { ID: userId });
    const im = imUser?.result;
    push(im?.avatar_hr);
    push(im?.avatar);
  } catch (error) {
    console.warn("[Bitrix24] im.user.get failed:", error.message);
  }

  try {
    const users = await restPost(endpoint, "user.get", auth, {
      FILTER: { ID: userId },
      IMAGE_RESIZE: "small",
    });
    const detailed = Array.isArray(users?.result) ? users.result[0] : users?.result;
    push(detailed?.PERSONAL_PHOTO);
  } catch (error) {
    console.warn("[Bitrix24] user.get failed:", error.message);
  }

  return urls;
};

const looksLikeImage = (buffer, mime) => {
  if (mime.startsWith("image/") && !mime.includes("svg")) return true;
  if (buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return true;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  return buffer.slice(8, 12).toString() === "WEBP";
};

const downloadImageAsDataUri = async (url, accessToken) => {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "ProjectBoard/1.0",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (!response.ok) return null;
  const mime = String(response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) return null;
  if (!looksLikeImage(buffer, mime)) return null;
  const safeMime =
    mime.startsWith("image/") && mime !== "image/svg+xml" ? mime : "image/jpeg";
  return `data:${safeMime};base64,${buffer.toString("base64")}`;
};

/** Скачивает фото профиля Bitrix и кладёт его как data-URL. */
export const fetchBitrixAvatarData = async (profile, portal, tokenPayload = null) => {
  try {
    const urls = await collectPhotoUrls(profile, portal, tokenPayload);
    if (!urls.length) {
      console.warn("[Bitrix24] Avatar URL not found for user", profile.ID);
      return null;
    }
    for (const url of urls) {
      const dataUri = await downloadImageAsDataUri(url, tokenPayload?.access_token);
      if (dataUri) return dataUri;
    }
    console.warn("[Bitrix24] Avatar download failed for user", profile.ID);
    return null;
  } catch (error) {
    console.warn("[Bitrix24] Avatar fetch error:", error.message);
    return null;
  }
};

const displayName = (profile) => {
  const name = [profile.NAME, profile.LAST_NAME].filter(Boolean).join(" ").trim();
  return (name || profile.EMAIL || `bitrix-${profile.ID}`).slice(0, 100);
};

const profileEmail = (profile, portal) => {
  const email = String(profile.EMAIL || "").trim().toLowerCase();
  if (email.includes("@")) return email;
  return `bitrix-${profile.ID}@${portal}`;
};

/** Находит локального пользователя по bitrixId/email или создаёт нового. */
export const findOrCreateBitrixUser = async (profile, portal, avatarData = null) => {
  const bitrixId = String(profile.ID);
  const email = profileEmail(profile, portal);
  const username = displayName(profile);
  const avatarUpdate = avatarData ? { avatarData } : {};

  const byBitrix = await User.findOne({ where: { bitrixId } });
  if (byBitrix) {
    await byBitrix.update({
      username,
      email: byBitrix.email || email,
      ...avatarUpdate,
    });
    return byBitrix;
  }

  const byEmail = await User.findOne({ where: { email } });
  if (byEmail) {
    await byEmail.update({
      bitrixId,
      username: byEmail.username || username,
      ...avatarUpdate,
    });
    return byEmail;
  }

  const { salt, hash } = hashPassword(crypto.randomBytes(32).toString("hex"));
  return User.create({
    username,
    email,
    password: hash,
    salt,
    bitrixId,
    ...avatarUpdate,
  });
};

/** Хост из ответа oauth.bitrix.info (domain или client_endpoint). */
export const normalizeHostFromToken = (tokenPayload) => {
  const domain = String(tokenPayload.domain || "").toLowerCase();
  if (domain) return domain.replace(/\/.*$/, "");
  try {
    return new URL(tokenPayload.client_endpoint).hostname;
  } catch {
    return "";
  }
};

/** Только относительный путь своего SPA. После Bitrix не оставляем на /login. */
export const safeAppPath = (value) => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  if (value === "/login" || value.startsWith("/login?")) return "/";
  return value;
};

/** Редирект только на свой фронтенд (FRONTEND_URL). */
export const frontendRedirect = (pathAndQuery) =>
  `${frontendOrigin}${pathAndQuery}`;

