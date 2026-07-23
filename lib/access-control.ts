import type { UserRole } from "@/features/users/types";

export const MANAGER_ROLES: UserRole[] = ["ADMIN", "CCR"];

const userAllowedPaths = [
  "/",
  "/analysis",
  "/production",
  "/production-achievement",
];

export function canAccessPath(role: UserRole, pathname: string) {
  if (role === "ADMIN") {
    return true;
  }

  if (role === "CCR") {
    return pathname !== "/users" && !pathname.startsWith("/users/");
  }

  return userAllowedPaths.some((path) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function canManage(role: UserRole) {
  return MANAGER_ROLES.includes(role);
}
