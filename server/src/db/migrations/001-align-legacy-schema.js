import { DataTypes } from "sequelize";

const describe = async (queryInterface, table) => {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return {};
  }
};

const addColumnIfMissing = async (queryInterface, table, column, definition) => {
  const columns = await describe(queryInterface, table);
  if (!columns[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

export const up = async (queryInterface, sequelize) => {
  const boardColumns = await describe(queryInterface, "boards");
  await addColumnIfMissing(queryInterface, "boards", "background_data", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "boards", "description", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "boards", "status", {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "active",
  });
  await addColumnIfMissing(queryInterface, "boards", "start_date", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "boards", "due_date", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  if (boardColumns.atmosphere) {
    await queryInterface.removeColumn("boards", "atmosphere");
  }

  await addColumnIfMissing(queryInterface, "users", "avatar_data", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });

  if (boardColumns.visibility) {
    await sequelize.query(
      "UPDATE boards SET visibility = 'private' WHERE visibility = 'team'",
    );
    try {
      await queryInterface.changeColumn("boards", "visibility", {
        type: DataTypes.ENUM("private", "public"),
        allowNull: false,
        defaultValue: "private",
      });
    } catch {
      // Already migrated on this database.
    }
  }

  await addColumnIfMissing(queryInterface, "board_tasks", "description", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "board_tasks", "due_date", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "board_tasks", "completed", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  await addColumnIfMissing(queryInterface, "board_tasks", "git_link", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "board_tasks", "priority", {
    type: DataTypes.ENUM("low", "medium", "high", "critical"),
    allowNull: false,
    defaultValue: "medium",
  });
  await addColumnIfMissing(queryInterface, "board_members", "role", {
    type: DataTypes.ENUM("editor", "viewer"),
    allowNull: false,
    defaultValue: "editor",
  });

  await sequelize.query(`
    INSERT IGNORE INTO board_task_participants (task_id, user_id)
    SELECT id, assignee_id FROM board_tasks WHERE assignee_id IS NOT NULL
  `);
};
