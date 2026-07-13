import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForReportPrisma = globalThis as unknown as {
  reportPrisma?: PrismaClient;
};

function getMariaDbUrl() {
  const databaseUrl = process.env.REPORT_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("REPORT_DATABASE_URL is required for report database queries");
  }

  return databaseUrl.replace(/^mysql:/, "mariadb:");
}

export function getReportPrisma() {
  if (!globalForReportPrisma.reportPrisma) {
    const adapter = new PrismaMariaDb(getMariaDbUrl());
    globalForReportPrisma.reportPrisma = new PrismaClient({ adapter });
  }

  return globalForReportPrisma.reportPrisma;
}
