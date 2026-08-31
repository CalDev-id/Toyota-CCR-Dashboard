import { readFile } from "node:fs/promises";
import * as mariadb from "mariadb";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const url = new URL(databaseUrl);
const migrations = [
  "../database/migrations/20260721_user_app_db.sql",
  "../database/migrations/20260717_daily_planning_app_db.sql",
  "../database/migrations/20260730_daily_planning_slot_remark.sql",
  "../database/migrations/20260731_daily_slot_parameters.sql",
  "../database/migrations/20260807_daily_manual_plan.sql",
  "../database/migrations/20260807_daily_hidden_ot.sql",
  "../database/migrations/20260814_daily_planning_history.sql",
  "../database/migrations/20260814_daily_planning_soft_delete.sql",
  "../database/migrations/20260818_ramadan_schedule.sql",
  "../database/migrations/20260818_ramadan_schedule_day_breaks.sql",
  "../database/migrations/20260818_ramadan_schedule_day_start.sql",
  "../database/migrations/20260821_asakai_stock.sql",
  "../database/migrations/20260828_asakai_shipment.sql",
  "../database/migrations/20260828_asakai_shipment_source_sheet.sql",
  "../database/migrations/20260829_lsr_import.sql",
  "../database/migrations/20260830_lsr_asakai_filter.sql",
  "../database/migrations/20260807_daily_monthly_signature.sql",
  "../database/migrations/20260721_production_realtime_status.sql",
  "../database/migrations/20260724_line_stop_decisions.sql",
  "../database/migrations/20260727_add_no_production_line_stop_decision.sql",
  "../database/migrations/20260831_linestop_db.sql",
  "../database/migrations/20260831_drop_linestop_active.sql",
  "../database/migrations/20260831_linestop_master_followup.sql",
  "../database/migrations/20260831_linestop_uncategorized_2.sql",
];
const connection = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), multipleStatements: true });

try {
  const lockResult = await connection.query("SELECT GET_LOCK('toyota_ccr_app_migrations', 60) AS acquired");
  if (Number(lockResult[0]?.acquired) !== 1) throw new Error("Unable to acquire database migration lock");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const appliedRows = await connection.query("SELECT name FROM app_schema_migrations");
  const applied = new Set(appliedRows.map((row) => String(row.name)));

  for (const migration of migrations) {
    const name = migration.split("/").at(-1);
    if (!name || applied.has(name)) continue;
    const sql = await readFile(new URL(migration, import.meta.url), "utf8");
    await connection.query(sql);
    await connection.query("INSERT INTO app_schema_migrations (name) VALUES (?)", [name]);
  }
  console.log("App database migrations completed.");
} finally {
  await connection.query("SELECT RELEASE_LOCK('toyota_ccr_app_migrations')").catch(() => undefined);
  await connection.end();
}
