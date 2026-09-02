import type { UserRole } from "@/features/users/types";

export const CCR_ROLES: UserRole[] = ["CCR_OPERATION", "CCR_GROUP_LEADER"];
export const MANAGER_ROLES: UserRole[] = ["ADMIN", ...CCR_ROLES];

const userAllowedPaths = [
  "/",
  "/analysis",
  "/production",
  "/production-achievement",
  "/packom",
];

export function canAccessPath(role: UserRole, pathname: string) {
  if (role === "ADMIN") {
    return true;
  }

  if (
    pathname === "/analysis/input-data" ||
    pathname.startsWith("/analysis/input-data/")
  ) {
    return role !== "USER";
  }

  if (CCR_ROLES.includes(role)) {
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
