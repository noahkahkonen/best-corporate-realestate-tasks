"use client";

import { useState } from "react";
import {
  managerCreateUser,
  type CreateUserResult,
} from "@/server/account-actions";

export function ManagerCreateUser() {
  const [result, setResult] = useState<CreateUserResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const res = await managerCreateUser(fd);
    setPending(false);
    setResult(res);
    if (res.ok) {
      e.currentTarget.reset();
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Create account
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Add a teammate with their email. We generate a one-time password—copy it
        and send it to them securely. They will be asked to set a new password
        when they first sign in.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[200px] flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Full name
          <input
            name="name"
            required
            placeholder="Jane Doe"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="block min-w-[220px] flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
          <select
            name="role"
            defaultValue="AGENT"
            className="mt-1 w-full min-w-[140px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="AGENT">Agent</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      {result?.ok === true ? (
        <div
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          <p className="font-medium">Account created — copy this password now</p>
          <p className="mt-2 break-all font-mono text-base">{result.password}</p>
          <p className="mt-2 text-xs text-emerald-800/90 dark:text-emerald-200/80">
            This screen is the only time we show it. Send it to{" "}
            <strong>{result.email}</strong> through your normal secure channel,
            then ask them to sign in and set a new password.
          </p>
        </div>
      ) : result?.ok === false ? (
        <p className="mt-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
          {result.error}
        </p>
      ) : null}
    </section>
  );
}
