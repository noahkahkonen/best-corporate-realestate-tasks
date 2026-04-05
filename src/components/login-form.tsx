"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError(
        res?.error === "CredentialsSignin"
          ? "Invalid email or password."
          : "Sign-in failed. Check AUTH_SECRET and DATABASE_URL on the server.",
      );
      return;
    }
    if (!res.ok) {
      setError("Sign-in failed. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Use your company portal account (agent, manager, or admin).
        </p>
      </div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
