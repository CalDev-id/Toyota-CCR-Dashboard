"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import { FormEvent, useEffect, useState } from "react";

type UserItem = {
  id: number;
  name: string;
  email: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

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
        <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#101828]">Create User</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Tambahkan akun untuk akses dashboard Toyota CCR.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleCreateUser}>
            <div>
              <label
                className="text-sm font-medium text-[#344054]"
                htmlFor="name"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                placeholder="Admin CCR"
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[#344054]"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[#344054]"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                placeholder="Minimal 8 karakter"
              />
            </div>

            {toast ? (
              <p
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  toast.type === "success"
                    ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
                    : "border-[#fecdca] bg-[#fef3f2] text-[#b42318]"
                }`}
              >
                {toast.message}
              </p>
            ) : null}

            <button
              className="h-11 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3b50db] disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Create User"}
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm">
          <div className="border-b border-[#e4e7ec] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#101828]">Users</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Akun yang bisa login ke dashboard.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-[#f9fafb] text-xs font-medium uppercase tracking-wide text-[#667085]">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-6 text-[#667085]" colSpan={3}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4 font-medium text-[#101828]">
                        {user.name}
                      </td>
                      <td className="px-5 py-4 text-[#667085]">
                        {user.email}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                        <button
                          className="h-9 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] transition hover:bg-[#f9fafb]"
                          type="button"
                          onClick={() => setEditingUser(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="h-9 rounded-lg border border-[#fecdca] px-3 text-sm font-medium text-[#b42318] transition hover:bg-[#fef3f2]"
                          type="button"
                          onClick={() => setDeleteTarget(user)}
                        >
                          Delete
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-6 text-[#667085]" colSpan={3}>
                      Belum ada user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {editingUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 px-4">
          <section className="w-full max-w-[460px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#101828]">
                  Edit User
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Update nama, email, atau password user.
                </p>
              </div>
              <button
                className="grid size-9 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085] transition hover:bg-[#f9fafb] hover:text-[#101828]"
                type="button"
                aria-label="Close edit user"
                onClick={() => setEditingUser(null)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleUpdateUser}>
              <div>
                <label
                  className="text-sm font-medium text-[#344054]"
                  htmlFor="editName"
                >
                  Name
                </label>
                <input
                  id="editName"
                  name="editName"
                  defaultValue={editingUser.name}
                  required
                  className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[#344054]"
                  htmlFor="editEmail"
                >
                  Email
                </label>
                <input
                  id="editEmail"
                  name="editEmail"
                  type="email"
                  defaultValue={editingUser.email}
                  required
                  className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[#344054]"
                  htmlFor="editPassword"
                >
                  New Password
                </label>
                <input
                  id="editPassword"
                  name="editPassword"
                  type="password"
                  minLength={8}
                  className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                  placeholder="Kosongkan jika tidak diganti"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="h-11 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
                  type="button"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="h-11 rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3b50db] disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 px-4">
          <section className="w-full max-w-[420px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-xl">
            <div className="grid size-11 place-items-center rounded-full bg-[#fef3f2] text-[#d92d20]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path
                  d="M12 8v4.5M12 16h.01M4.75 19.25h14.5L12 4.75 4.75 19.25Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#101828]">
              Delete User
            </h2>
            <p className="mt-2 text-sm text-[#667085]">
              Yakin mau hapus user {deleteTarget.name} ({deleteTarget.email})?
              User ini tidak akan bisa login lagi setelah dihapus.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-11 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="h-11 rounded-lg bg-[#d92d20] px-4 text-sm font-semibold text-white transition hover:bg-[#b42318] disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                onClick={handleDeleteUser}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </DefaultLayout>
  );
}
