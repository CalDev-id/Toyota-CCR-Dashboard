import { auth } from "@/auth";
import UsersPageClient from "@/features/users/components/UsersPageClient";
import { getUsers } from "@/features/users/services/users.service";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/users");
  }

  const users = await getUsers();

  return <UsersPageClient initialUsers={users} />;
}
