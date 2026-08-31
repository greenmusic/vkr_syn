import { DataTypes } from "sequelize";
import sequelize from "../db/sequelize.js";

export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    avatarData: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      field: "avatar_data",
    },
    password: { type: DataTypes.STRING(255), allowNull: false },
    salt: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    bitrixId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      field: "bitrix_id",
    },
    createTime: { type: DataTypes.DATE, field: "create_time" },
  },
  { tableName: "users", timestamps: false },
);

export const Board = sequelize.define(
  "Board",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
    startDate: { type: DataTypes.DATE, allowNull: true, field: "start_date" },
    dueDate: { type: DataTypes.DATE, allowNull: true, field: "due_date" },
    backgroundData: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      field: "background_data",
    },
    visibility: {
      type: DataTypes.ENUM("private", "public"),
      allowNull: false,
      defaultValue: "private",
    },
    createTime: { type: DataTypes.DATE, field: "create_time" },
  },
  { tableName: "boards", timestamps: false },
);

export const BoardStage = sequelize.define(
  "BoardStage",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false, field: "board_id" },
    title: { type: DataTypes.STRING(255), allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "board_stages", timestamps: false },
);

export const BoardTask = sequelize.define(
  "BoardTask",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false, field: "board_id" },
    stageId: { type: DataTypes.INTEGER, allowNull: false, field: "stage_id" },
    title: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    dueDate: { type: DataTypes.DATE, allowNull: true, field: "due_date" },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    assigneeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "assignee_id",
    },
    gitLink: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "git_link",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "medium",
    },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createTime: { type: DataTypes.DATE, field: "create_time" },
  },
  { tableName: "board_tasks", timestamps: false },
);

export const ChecklistItem = sequelize.define(
  "ChecklistItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    taskId: { type: DataTypes.INTEGER, allowNull: false, field: "task_id" },
    title: { type: DataTypes.STRING(500), allowNull: false },
    completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "task_checklist_items", timestamps: false },
);
BoardTask.hasMany(ChecklistItem, { foreignKey: "taskId", as: "checklist", onDelete: "CASCADE" });
ChecklistItem.belongsTo(BoardTask, { foreignKey: "taskId", as: "task" });

export const BoardLabel = sequelize.define(
  "BoardLabel",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    boardId: { type: DataTypes.INTEGER, allowNull: false, field: "board_id" },
    title: { type: DataTypes.STRING(100), allowNull: false },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "#0085ff",
    },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "board_labels", timestamps: false },
);

export const BoardTaskLabel = sequelize.define(
  "BoardTaskLabel",
  {
    taskId: { type: DataTypes.INTEGER, primaryKey: true, field: "task_id" },
    labelId: { type: DataTypes.INTEGER, primaryKey: true, field: "label_id" },
  },
  { tableName: "board_task_labels", timestamps: false },
);

export const BoardMember = sequelize.define(
  "BoardMember",
  {
    boardId: { type: DataTypes.INTEGER, primaryKey: true, field: "board_id" },
    userId: { type: DataTypes.INTEGER, primaryKey: true, field: "user_id" },
    role: {
      type: DataTypes.ENUM("editor", "viewer"),
      allowNull: false,
      defaultValue: "editor",
    },
    createTime: { type: DataTypes.DATE, field: "create_time" },
  },
  { tableName: "board_members", timestamps: false },
);

export const BoardTaskParticipant = sequelize.define(
  "BoardTaskParticipant",
  {
    taskId: { type: DataTypes.INTEGER, primaryKey: true, field: "task_id" },
    userId: { type: DataTypes.INTEGER, primaryKey: true, field: "user_id" },
  },
  { tableName: "board_task_participants", timestamps: false },
);

User.hasMany(Board, { foreignKey: "userId", as: "ownedBoards" });
Board.belongsTo(User, { foreignKey: "userId", as: "owner" });
Board.hasMany(BoardStage, {
  foreignKey: "boardId",
  as: "stages",
  onDelete: "CASCADE",
});
BoardStage.belongsTo(Board, { foreignKey: "boardId", as: "board" });
Board.hasMany(BoardLabel, {
  foreignKey: "boardId",
  as: "labels",
  onDelete: "CASCADE",
});
BoardLabel.belongsTo(Board, { foreignKey: "boardId", as: "board" });
BoardTask.belongsToMany(BoardLabel, {
  through: BoardTaskLabel,
  foreignKey: "taskId",
  otherKey: "labelId",
  as: "labels",
});
BoardLabel.belongsToMany(BoardTask, {
  through: BoardTaskLabel,
  foreignKey: "labelId",
  otherKey: "taskId",
  as: "tasks",
});
Board.hasMany(BoardTask, {
  foreignKey: "boardId",
  as: "tasks",
  onDelete: "CASCADE",
});
BoardTask.belongsTo(Board, { foreignKey: "boardId", as: "board" });
BoardStage.hasMany(BoardTask, { foreignKey: "stageId", as: "tasks" });
BoardTask.belongsTo(BoardStage, { foreignKey: "stageId", as: "stage" });
BoardTask.belongsTo(User, { foreignKey: "assigneeId", as: "assignee" });
User.hasMany(BoardTask, { foreignKey: "assigneeId", as: "assignedTasks" });
BoardTask.belongsToMany(User, {
  through: BoardTaskParticipant,
  foreignKey: "taskId",
  otherKey: "userId",
  as: "participants",
});
User.belongsToMany(BoardTask, {
  through: BoardTaskParticipant,
  foreignKey: "userId",
  otherKey: "taskId",
  as: "participatingTasks",
});
Board.belongsToMany(User, {
  through: BoardMember,
  foreignKey: "boardId",
  otherKey: "userId",
  as: "members",
});
User.belongsToMany(Board, {
  through: BoardMember,
  foreignKey: "userId",
  otherKey: "boardId",
  as: "memberBoards",
});

export { sequelize };
