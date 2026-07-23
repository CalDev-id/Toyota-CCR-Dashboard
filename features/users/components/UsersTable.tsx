import type { UserItem } from "@/features/users/types";

type UsersTableProps = {
  users: UserItem[];
  isLoading: boolean;
  setEditingUser: (user: UserItem) => void;
  setDeleteTarget: (user: UserItem) => void;
};

export default function UsersTable({ users, isLoading, setEditingUser, setDeleteTarget }: UsersTableProps) {
  return (
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
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e7ec]">
            {isLoading ? (
              <tr>
                <td className="px-5 py-6 text-[#667085]" colSpan={4}>
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
                  <td className="px-5 py-4 text-[#667085]">{user.role}</td>
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
                <td className="px-5 py-6 text-[#667085]" colSpan={4}>
                  Belum ada user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
