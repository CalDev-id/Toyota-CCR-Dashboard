"use client";

import type { FormEvent } from "react";
import type { UserToast as Toast } from "@/features/users/types";
import { useState } from "react";

type CreateUserFormProps = {
  toast: Toast | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CreateUserForm({ toast, isSaving, onSubmit }: CreateUserFormProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

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
          <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              minLength={8}
              required
              className="h-11 w-full rounded-lg border border-[#d0d5dd] px-3 pr-11 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
              placeholder="Minimal 8 karakter"
            />
            <button
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#667085] transition hover:text-[#344054]"
              type="button"
              aria-label={isPasswordVisible ? "Sembunyikan password" : "Lihat password"}
              onClick={() => setIsPasswordVisible((visible) => !visible)}
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#344054]" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="relative mt-2">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={isConfirmPasswordVisible ? "text" : "password"}
              minLength={8}
              required
              className="h-11 w-full rounded-lg border border-[#d0d5dd] px-3 pr-11 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
              placeholder="Ulangi password"
            />
            <button
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#667085] transition hover:text-[#344054]"
              type="button"
              aria-label={isConfirmPasswordVisible ? "Sembunyikan password" : "Lihat password"}
              onClick={() => setIsConfirmPasswordVisible((visible) => !visible)}
            >
              {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#344054]" htmlFor="role">
            Role
          </label>
          <div className="relative mt-2">
            <select
              id="role"
              name="role"
              defaultValue="USER"
              className="h-11 w-full appearance-none rounded-lg border border-[#d0d5dd] bg-white px-3 pr-11 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="CCR">CCR</option>
              <option value="USER">USER</option>
            </select>
            <ChevronDownIcon />
          </div>
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 3 18 18M10.7 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.2 17.2 0 0 1-3.2 3.8M6.1 6.1A17.2 17.2 0 0 0 2.5 12S6 18 12 18c1.3 0 2.5-.3 3.5-.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
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
  );
}
