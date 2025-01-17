require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const fs = require("fs");

if (!process.env.DATABASE_URL) {
  console.error("Ошибка: DATABASE_URL не установлен");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const sqliteDb = new sqlite3.Database("./database.sqlite");

async function migrateData() {
  try {
    console.log("Начинаем миграцию...");

    // Получаем данные из SQLite
    const categories = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM categories", [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    const products = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM products", [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    console.log(
      `Найдено ${categories.length} категорий и ${products.length} продуктов`
    );

    const client = await pool.connect();
    console.log("Подключено к PostgreSQL");

    // Создаем таблицы с точной структурой ваших моделей
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        title TEXT,
        image TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title TEXT,
        price INTEGER,
        discont_price INTEGER,
        description TEXT,
        image TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Таблицы созданы");

    // Вставляем категории
    for (const category of categories) {
      await client.query(
        "INSERT INTO categories (id, title, image) VALUES ($1, $2, $3)",
        [category.id, category.title, category.image]
      );
    }
    console.log("Категории импортированы");

    // Вставляем продукты
    for (const product of products) {
      await client.query(
        "INSERT INTO products (id, title, price, discont_price, description, image) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          product.id,
          product.title,
          product.price,
          product.discont_price,
          product.description,
          product.image,
        ]
      );
    }
    console.log("Продукты импортированы");

    console.log("Миграция успешно завершена");
    client.release();
  } catch (error) {
    console.error("Ошибка при миграции:", error);
  } finally {
    sqliteDb.close();
    pool.end();
  }
}

migrateData();
