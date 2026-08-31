import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(serverRoot, ".env") });

export const isProduction = process.env.NODE_ENV === "production";

export const listenHost = process.env.HOST || "0.0.0.0";

export const listenPort = Number(process.env.PORT) || 5000;

export const frontendOrigin = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/$/, "");

export const corsOrigins = frontendOrigin
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

/** Secure-cookie: HTTPS. Для HTTP во внешней сети задайте COOKIE_SECURE=false. */
export const cookieSecure =
  process.env.COOKIE_SECURE === "true" ||
  (process.env.COOKIE_SECURE !== "false" && isProduction);

export const clientDistDir = path.resolve(
  process.env.CLIENT_DIST || path.join(serverRoot, "../client/dist"),
);

export const serveClient =
  process.env.SERVE_CLIENT !== "false" &&
  fs.existsSync(path.join(clientDistDir, "index.html"));
