import { prisma } from "@/lib/prisma";
import type { UserItem, UserPayload } from "@/features/users/types";
import bcrypt from "bcryptjs";

const minPasswordLength = 8;

export function parseUserId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  return id;
}

export function parseUserPayload(payload: unknown, mode: "create" | "update"): UserPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid request body");
  }

  const body = payload as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) {
    throw new Error("Name is required");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required");
  }

  if (
    (mode === "create" && password.length < minPasswordLength) ||
    (mode === "update" && password && password.length < minPasswordLength)
  ) {
    throw new Error(`Password must be at least ${minPasswordLength} characters`);
  }

  return { name, email, password };
}

function serializeUser(user: { id: number; name: string; email: string }): UserItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return users.map(serializeUser);
}

export async function createUser(payload: UserPayload) {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return serializeUser(user);
}

export async function updateUser(id: number, payload: UserPayload) {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
      NOT: { id },
    },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: payload.name,
      email: payload.email,
      ...(payload.password
        ? { passwordHash: await bcrypt.hash(payload.password, 12) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return serializeUser(user);
}

export async function deleteUser(id: number) {
  await prisma.user.delete({
    where: { id },
  });

  return { id };
}
