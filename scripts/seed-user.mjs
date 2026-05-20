import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

process.loadEnvFile?.(".env");

const name = process.env.SEED_USER_NAME?.trim() || "Admin CCR";
const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_USER_PASSWORD ?? "";
const databaseUrl = (process.env.DATABASE_URL ?? "").replace(
  /^mysql:/,
  "mariadb:",
);

if (!email) {
  throw new Error("SEED_USER_EMAIL is required");
}

if (password.length < 8) {
  throw new Error("SEED_USER_PASSWORD must be at least 8 characters");
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
    },
    create: {
      name,
      email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  console.log(`Seeded user ${user.email} (${user.name})`);
} finally {
  await prisma.$disconnect();
}
