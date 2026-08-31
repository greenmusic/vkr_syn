import { sequelize } from "../models/index.js";
import { up as alignLegacySchema } from "./migrations/001-align-legacy-schema.js";
import { up as userBitrixId } from "./migrations/002-user-bitrix-id.js";

const MIGRATIONS = [
  { name: "001-align-legacy-schema", up: alignLegacySchema },
  { name: "002-user-bitrix-id", up: userBitrixId },
];

const ensureMigrationsTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const appliedNames = async () => {
  const [rows] = await sequelize.query(
    "SELECT name FROM schema_migrations ORDER BY name ASC",
  );
  return new Set(rows.map((row) => row.name));
};

/** Применяет ещё не записанные миграции. sequelize.sync создаёт новые таблицы. */
export const runMigrations = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureMigrationsTable();

  const applied = await appliedNames();
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    await migration.up(sequelize.getQueryInterface(), sequelize);
    await sequelize.query("INSERT INTO schema_migrations (name) VALUES (?)", {
      replacements: [migration.name],
    });
  }
};
