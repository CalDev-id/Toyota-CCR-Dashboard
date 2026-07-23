import "server-only";

import { auth } from "@/auth";
import { canAccessPath } from "@/lib/access-control";
import type { UserRole } from "@/features/users/types";
import { redirect } from "next/navigation";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return session.user.role;
}

export async function requireRoles(...allowedRoles: UserRole[]) {
  const role = await getCurrentUserRole();

  if (!role) {
    throw new Error("Unauthenticated");
  }

  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }

  return role;
}

export async function requirePageAccess(pathname: string) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  if (!canAccessPath(session.user.role, pathname)) {
    redirect("/");
  }

  return session.user.role;
}
