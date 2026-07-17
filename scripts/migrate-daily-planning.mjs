import { readFile } from "node:fs/promises";
import * as mariadb from "mariadb";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const url = new URL(databaseUrl);
const migrations = [
  "../database/migrations/20260717_daily_planning_app_db.sql",
];
const connection = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), multipleStatements: true });

try {
  for (const migration of migrations) {
    const sql = await readFile(new URL(migration, import.meta.url), "utf8");
    await connection.query(sql);
  }
  console.log("Daily Planning migration completed.");
} finally {
  await connection.end();
}
