import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getMariaDbUrl() {
  return (process.env.DATABASE_URL ?? "").replace(/^mysql:/, "mariadb:");
}

const adapter = new PrismaMariaDb(getMariaDbUrl());

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
