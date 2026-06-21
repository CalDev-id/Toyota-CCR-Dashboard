import { createReadStream, existsSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const defaultSqlFile = "/Users/cal/Downloads/v_cylblock_detail_problem_202605181311.sql";
const sqlFile = process.argv[2] ?? defaultSqlFile;
const envFile = ".env";

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const database = url.pathname.slice(1);
const mysqlArgs = [
  "-h",
  url.hostname,
  "-P",
  url.port || "3306",
  "-u",
  decodeURIComponent(url.username),
];

const password = decodeURIComponent(url.password);
if (password) {
  mysqlArgs.push(`-p${password}`);
}

mysqlArgs.push("-D", database);

const ddl = `
SET SESSION sql_mode = '';

CREATE TABLE IF NOT EXISTS v_cylblock_detail_problem (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`DATE\` DATE NULL,
  PLANT VARCHAR(50) NULL,
  SHIFT VARCHAR(20) NULL,
  SHIFT2 VARCHAR(20) NULL,
  SHOP VARCHAR(100) NULL,
  TT_min DECIMAL(10,2) NULL,
  JAM VARCHAR(100) NULL,
  Problem_AV TEXT NULL,
  LS_AV_Unit VARCHAR(20) NULL,
  LS_AV_min DECIMAL(10,2) NULL,
  Problem_PE TEXT NULL,
  LS_PE_Unit VARCHAR(20) NULL,
  LS_PE_min DECIMAL(10,2) NULL,
  Problem_RQ TEXT NULL,
  Defect_C DECIMAL(10,2) NULL,
  Defect_M DECIMAL(10,2) NULL,
  Defect_C_min DECIMAL(10,2) NULL,
  Defect_M_min DECIMAL(10,2) NULL,
  funique VARCHAR(100) NULL,
  fdate_modified DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_v_cylblock_detail_problem_date (\`DATE\`),
  INDEX idx_v_cylblock_detail_problem_funique (funique),
  INDEX idx_v_cylblock_detail_problem_modified (fdate_modified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const create = spawnSync("mysql", [...mysqlArgs, "-e", ddl], { stdio: "inherit" });
if (create.status !== 0) {
  process.exit(create.status ?? 1);
}

const importSql = spawn("mysql", [...mysqlArgs, "--init-command=SET SESSION sql_mode = ''"], {
  stdio: ["pipe", "inherit", "inherit"],
});

createReadStream(sqlFile).pipe(importSql.stdin);

importSql.on("close", (code) => {
  process.exit(code ?? 1);
});

importSql.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
