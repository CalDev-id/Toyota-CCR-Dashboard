"use server";

import { auth } from "@/auth";
import { USER_ROLES, type UserItem, type UserPayload, type UserRole } from "@/features/users/types";
import { requireRoles } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const minPasswordLength = 8;

function parseUserId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  return id;
}

function parseUserPayload(payload: unknown, mode: "create" | "update"): UserPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid request body");
  }

  const body = payload as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const role = String(body.role ?? "");

  if (!name) {
    throw new Error("Name is required");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required");
  }

  if (!USER_ROLES.includes(role as UserRole)) {
    throw new Error("Valid role is required");
  }

  if (mode === "create" && password !== confirmPassword) {
    throw new Error("Password confirmation does not match");
  }

  if (
    (mode === "create" && password.length < minPasswordLength) ||
    (mode === "update" && password && password.length < minPasswordLength)
  ) {
    throw new Error(`Password must be at least ${minPasswordLength} characters`);
  }

  return { name, email, password, role: role as UserRole };
}

function requireUserPayload(formData: FormData, mode: "create" | "update") {
  return parseUserPayload(Object.fromEntries(formData), mode);
}

async function requireSession() {
  await requireRoles("ADMIN");
}

function serializeUser(user: { id: number; name: string; email: string; role: UserRole }): UserItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function getUsers() {
  await requireRoles("ADMIN");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return users.map(serializeUser);
}

async function createUser(payload: UserPayload) {
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
      role: payload.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return serializeUser(user);
}

async function updateUser(id: number, payload: UserPayload) {
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
      role: payload.role,
      ...(payload.password
        ? { passwordHash: await bcrypt.hash(payload.password, 12) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return serializeUser(user);
}

async function deleteUser(id: number) {
  await prisma.user.delete({
    where: { id },
  });

  return { id };
}

export async function createUserAction(formData: FormData) {
  await requireSession();

  const payload = requireUserPayload(formData, "create");
  const user = await createUser(payload);

  revalidatePath("/users");

  return { data: user };
}

export async function updateUserAction(id: number, formData: FormData) {
  await requireSession();

  const userId = parseUserId(String(id));
  const payload = requireUserPayload(formData, "update");
  const user = await updateUser(userId, payload);

  revalidatePath("/users");

  return { data: user };
}

export async function deleteUserAction(id: number) {
  await requireSession();
  const session = await auth();
  const userId = parseUserId(String(id));

  if (session?.user?.id === String(userId)) {
    throw new Error("You cannot delete your own active account");
  }

  const deletedUser = await deleteUser(userId);

  revalidatePath("/users");

  return { data: deletedUser };
}
