export const USER_ROLES = ["ADMIN", "CCR_OPERATION", "CCR_GROUP_LEADER", "USER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserItem = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type UserToast = {
  type: "success" | "error";
  message: string;
};

export type UserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};
