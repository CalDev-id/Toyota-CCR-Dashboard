"use client";

import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "@/features/users/server/users";
import CreateUserForm from "@/features/users/components/CreateUserForm";
import UserModals from "@/features/users/components/UserModals";
import UsersTable from "@/features/users/components/UsersTable";
import type { UserItem, UserToast as Toast } from "@/features/users/types";
import { FormEvent, useState } from "react";

type UsersPageProps = {
  initialUsers: UserItem[];
};

export default function UsersPage({ initialUsers }: UsersPageProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [toast, setToast] = useState<Toast | null>(null);
  const isLoading = false;
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const body = await createUserAction(formData);

      setUsers((current) => [body.data, ...current]);
      form.reset();
      setToast({ type: "success", message: "User berhasil dibuat." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to create user",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    setToast(null);
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const actionFormData = new FormData();
      actionFormData.set("name", String(formData.get("editName") ?? ""));
      actionFormData.set("email", String(formData.get("editEmail") ?? ""));
      actionFormData.set("role", String(formData.get("editRole") ?? ""));
      actionFormData.set(
        "password",
        String(formData.get("editPassword") ?? ""),
      );

      const body = await updateUserAction(editingUser.id, actionFormData);
      const updatedUser = body.data;

      setUsers((current) =>
        current.map((user) =>
          user.id === updatedUser.id ? updatedUser : user,
        ),
      );
      setEditingUser(null);
      setToast({ type: "success", message: "User berhasil diupdate." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to update user",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    setToast(null);
    setIsSaving(true);

    try {
      await deleteUserAction(deleteTarget.id);

      setUsers((current) =>
        current.filter((user) => user.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      setToast({ type: "success", message: "User berhasil dihapus." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to delete user",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <CreateUserForm
          toast={toast}
          isSaving={isSaving}
          onSubmit={handleCreateUser}
        />

        <UsersTable
          users={users}
          isLoading={isLoading}
          setEditingUser={setEditingUser}
          setDeleteTarget={setDeleteTarget}
        />

      </section>



      <UserModals
        editingUser={editingUser}
        deleteTarget={deleteTarget}
        isSaving={isSaving}
        setEditingUser={setEditingUser}
        setDeleteTarget={setDeleteTarget}
        handleUpdateUser={handleUpdateUser}
        handleDeleteUser={handleDeleteUser}
      />
    </>
  );
}
