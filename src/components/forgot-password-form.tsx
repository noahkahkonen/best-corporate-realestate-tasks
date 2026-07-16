"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/server/password-reset-actions";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await requestPasswordReset(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Check your email
        </h1>
        <p className="text-sm text-zinc-500">
          If an account exists for that address, we sent a password reset link.
          It expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Forgot password
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter your account email and we&apos;ll send you a reset link.
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
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link
        href="/login"
        className="block text-center text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Back to sign in
      </Link>
    </form>
  );
}
