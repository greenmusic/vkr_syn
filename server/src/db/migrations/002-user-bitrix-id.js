import { DataTypes } from "sequelize";

export const up = async (queryInterface) => {
  let columns = {};
  try {
    columns = await queryInterface.describeTable("users");
  } catch {
    return;
  }
  if (!columns.bitrix_id) {
    await queryInterface.addColumn("users", "bitrix_id", {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    });
  }
};
