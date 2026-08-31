import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  corsOrigins,
  isProduction,
  listenHost,
  listenPort,
  serveClient,
  clientDistDir,
} from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { errorMiddleware } from "./utils/http.js";
import authRoutes from "./routes/auth.routes.js";
import boardsRoutes from "./routes/boards.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import usersRoutes from "./routes/users.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";

const app = express();

if (process.env.TRUST_PROXY !== "false") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", authRoutes);
app.use("/api/boards", boardsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tasks", tasksRoutes);

if (serveClient) {
  app.use(
    express.static(clientDistDir, {
      index: false,
      maxAge: isProduction ? "7d" : 0,
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    if (path.extname(req.path)) return next();
    const indexFile = path.join(clientDistDir, "index.html");
    if (!fs.existsSync(indexFile)) return next();
    res.sendFile(indexFile);
  });
}

app.use(errorMiddleware);

if (!process.env.JWT_SECRET) {
  if (isProduction) throw new Error("JWT_SECRET обязателен в production");
  console.warn("[security] JWT_SECRET не задан — для разработки используется запасной ключ.");
}

if (isProduction && !process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL обязателен в production (публичный URL сайта)");
}

await runMigrations();
app.listen(listenPort, listenHost, () => {
  console.log(`Сервер: http://${listenHost}:${listenPort}`);
  if (serveClient) {
    console.log(`Статика: ${clientDistDir}`);
  } else {
    console.log("Сборка клиента не найдена — только API. Соберите client (npm run build).");
  }
});
