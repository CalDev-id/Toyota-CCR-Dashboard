export type UserItem = {
  id: number;
  name: string;
  email: string;
};

export type UserToast = {
  type: "success" | "error";
  message: string;
};

export type UserPayload = {
  name: string;
  email: string;
  password: string;
};
