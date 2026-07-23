import type { FormEvent } from "react";
import type { UserItem } from "@/features/users/types";

type UserModalsProps = {
  editingUser: UserItem | null;
  deleteTarget: UserItem | null;
  isSaving: boolean;
  setEditingUser: (user: UserItem | null) => void;
  setDeleteTarget: (user: UserItem | null) => void;
  handleUpdateUser: (event: FormEvent<HTMLFormElement>) => void;
  handleDeleteUser: () => void;
};

export default function UserModals({
  editingUser,
  deleteTarget,
  isSaving,
  setEditingUser,
  setDeleteTarget,
  handleUpdateUser,
  handleDeleteUser,
}: UserModalsProps) {
  return (
    <>
      {editingUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/45 px-4">
          <section className="w-full max-w-[460px] rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#101828]">
                  Edit User
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Update nama, email, role, atau password user.
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
                  htmlFor="editRole"
                >
                  Role
                </label>
                <div className="relative mt-2">
                  <select
                    id="editRole"
                    name="editRole"
                    defaultValue={editingUser.role}
                    className="h-11 w-full appearance-none rounded-lg border border-[#d0d5dd] bg-white px-3 pr-11 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="CCR">CCR</option>
                    <option value="USER">USER</option>
                  </select>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-[#667085]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
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
    </>
  );
}
