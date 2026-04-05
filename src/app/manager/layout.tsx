import { logout } from "@/server/logout";
import { ManagerNav } from "@/components/manager-nav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [taskRequestCount, supportCount] = await Promise.all([
    prisma.task.count({
      where: {
        reviewStatus: "PENDING_REVIEW",
        creator: { role: "AGENT" },
      },
    }),
    prisma.task.count({
      where: {
        reviewStatus: "APPROVED",
        executionStatus: "NEEDS_HELP",
      },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="pb-6">
          <p className="text-xs font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
            Manager portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Review &amp; assign
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Approve agent requests, create tasks, assign work to admins, and use
            Admin support when someone flags a blocker.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pb-6">
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <ManagerNav taskRequestCount={taskRequestCount} supportCount={supportCount} />
      <div className="pt-8">{children}</div>
    </div>
  );
}
