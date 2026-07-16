"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/server/password-reset-actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await resetPassword(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/login?updated=1");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Choose a new password
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          At least 8 characters. You&apos;ll sign in with it from now on.
        </p>
      </div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        New password
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {pending ? "Saving…" : "Set new password"}
      </button>
      <Link
        href="/forgot-password"
        className="block text-center text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Link expired? Request a new one
      </Link>
    </form>
  );
}
