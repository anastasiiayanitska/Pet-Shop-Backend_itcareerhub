// database.js
const { Sequelize } = require("sequelize");

let sequelize;

// Проверяем окружение
if (process.env.NODE_ENV === "production") {
  // Используем PostgreSQL в production
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // Локально используем SQLite
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./database.sqlite",
  });
}

module.exports = sequelize;
