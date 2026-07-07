"use server";

import { auth } from "@/auth";
import {
  createUser,
  deleteUser,
  parseUserId,
  parseUserPayload,
  updateUser,
} from "@/features/users/services/users.service";
import { revalidatePath } from "next/cache";

function requireUserPayload(formData: FormData, mode: "create" | "update") {
  return parseUserPayload(Object.fromEntries(formData), mode);
}

async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthenticated");
  }

  return session;
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
  const session = await requireSession();
  const userId = parseUserId(String(id));

  if (session.user.id === String(userId)) {
    throw new Error("You cannot delete your own active account");
  }

  const deletedUser = await deleteUser(userId);

  revalidatePath("/users");

  return { data: deletedUser };
}
