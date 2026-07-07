"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import CreateUserForm from "@/features/users/components/CreateUserForm";
import UserModals from "@/features/users/components/UserModals";
import UsersTable from "@/features/users/components/UsersTable";
import type { UserItem, UserToast as Toast } from "@/features/users/types";
import { FormEvent, useEffect, useState } from "react";

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  useEffect(() => {
    let isActive = true;

    fetch("/api/users")
      .then(readResponse)
      .then((body) => {
        if (!isActive) {
          return;
        }

        setUsers(body.data as UserItem[]);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setToast({
          type: "error",
          message:
            error instanceof Error ? error.message : "Unable to load users",
        });
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const body = await readResponse(
        await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        }),
      );

      setUsers((current) => [body.data as UserItem, ...current]);
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
      const body = await readResponse(
        await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.get("editName"),
            email: formData.get("editEmail"),
            password: formData.get("editPassword"),
          }),
        }),
      );
      const updatedUser = body.data as UserItem;

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
      await readResponse(
        await fetch(`/api/users/${deleteTarget.id}`, {
          method: "DELETE",
        }),
      );

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
    <DefaultLayout>
      <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
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
    </DefaultLayout>
  );
}
