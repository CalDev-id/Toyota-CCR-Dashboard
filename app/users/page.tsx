import UsersPageClient from "@/features/users/components/UsersPageClient";
import { getUsers } from "@/features/users/server/users";
import { requirePageAccess } from "@/lib/authorization";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const role = await requirePageAccess("/users");

  if (role !== "ADMIN") {
    redirect("/");
  }

  const users = await getUsers();

  return <UsersPageClient initialUsers={users} />;
}
