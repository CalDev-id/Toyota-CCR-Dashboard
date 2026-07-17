import { readFile } from "node:fs/promises";
import * as mariadb from "mariadb";
import "dotenv/config";

const databaseUrl = process.env.REPORT_DATABASE_URL;
if (!databaseUrl) throw new Error("REPORT_DATABASE_URL is required");

const url = new URL(databaseUrl);
const migrations = [
  "../database/migrations/20260714_daily_planning.sql",
  "../database/migrations/20260714_monthly_ratio_single_column.sql",
  "../database/migrations/20260714_daily_planning_config.sql",
  "../database/migrations/20260714_daily_slot_parameters.sql",
  "../database/migrations/20260714_daily_parameter_override.sql",
  "../database/migrations/20260714_monthly_oee_daily_override.sql",
  "../database/migrations/20260714_daily_plan_header_detail.sql",
  "../database/migrations/20260715_daily_monthly_sync.sql",
  "../database/migrations/20260716_assy_monthly_parameters.sql",
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
