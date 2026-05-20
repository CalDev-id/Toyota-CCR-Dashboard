"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function getSafeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Email atau password tidak valid.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f9fafb] px-4 py-10 text-[#101828]">
      <section className="w-full max-w-[420px] rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-16 place-items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-white">
            <Image
              src="/images/tmmin_logo.png"
              alt="TMMIN logo"
              width={800}
              height={344}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#101828]">
              Toyota CCR
            </h1>
            <p className="text-sm font-medium text-[#667085]">
              PPIC & Warehouse
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Login</h2>
          <p className="mt-2 text-sm text-[#667085]">
            Masuk untuk mengakses dashboard CCR.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              autoComplete="email"
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
              autoComplete="current-password"
              required
              className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none transition focus:border-[#465fff] focus:ring-4 focus:ring-[#ecf3ff]"
              placeholder="Masukkan password"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-sm font-medium text-[#b42318]">
              {error}
            </p>
          ) : null}

          <button
            className="h-11 w-full rounded-lg bg-[#465fff] px-4 text-sm font-semibold text-white transition hover:bg-[#3b50db] disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
