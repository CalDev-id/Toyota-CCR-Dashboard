import type { FormEvent } from "react";
import type { UserToast as Toast } from "@/features/users/types";

type CreateUserFormProps = {
  toast: Toast | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CreateUserForm({ toast, isSaving, onSubmit }: CreateUserFormProps) {
  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#101828]">Create User</h2>
      <p className="mt-1 text-sm text-[#667085]">
        Tambahkan akun untuk akses dashboard Toyota CCR.
      </p>
    
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
  );
}
