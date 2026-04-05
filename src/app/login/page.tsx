import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { prisma } from "@/lib/prisma";
import {
  SEED_MANAGER_EMAIL,
  SEED_MANAGER_PASSWORD,
} from "@/lib/seed-credentials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — BCR Tasks",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const { updated } = await searchParams;
  let userCount: number | null = null;
  let dbError = false;
  try {
    userCount = await prisma.user.count();
  } catch {
    dbError = true;
    userCount = null;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      {updated === "1" ? (
        <div
          className="mb-6 w-full max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Password updated. Sign in with your new password.
        </div>
      ) : null}
      {dbError ? (
        <div
          className="mb-6 w-full max-w-sm rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          Cannot reach the database. Check{" "}
          <code className="rounded bg-rose-100 px-1 dark:bg-rose-900">
            DATABASE_URL
          </code>{" "}
          on this environment.
        </div>
      ) : userCount === 0 ? (
        <div
          className="mb-6 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <p className="font-medium">No user accounts yet.</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            Run the seed against <strong>this</strong> database (e.g. locally:{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900">
              npm run db:seed
            </code>
            ; production: same command with your production{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900">
              DATABASE_URL
            </code>
            ).
          </p>
        </div>
      ) : null}
      <LoginForm />
      {process.env.NODE_ENV === "development" &&
      !dbError &&
      userCount !== null &&
      userCount > 0 ? (
        <p className="mt-6 max-w-sm text-center text-xs text-zinc-500">
          Dev seed: agent &amp; admin —{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            password
          </code>
          . Manager —{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            {SEED_MANAGER_EMAIL}
          </code>{" "}
          /{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            {SEED_MANAGER_PASSWORD}
          </code>
        </p>
      ) : null}
    </main>
  );
}
