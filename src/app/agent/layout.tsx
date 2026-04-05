import { auth } from "@/auth";
import { logout } from "@/server/logout";
import { AgentNav } from "@/components/agent-nav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const [pendingCount, tasksCount, revisionsCount] = userId
    ? await Promise.all([
        prisma.task.count({
          where: { creatorId: userId, reviewStatus: "PENDING_REVIEW" },
        }),
        prisma.task.count({
          where: { creatorId: userId, reviewStatus: "APPROVED" },
        }),
        prisma.task.count({
          where: { creatorId: userId, reviewStatus: "CHANGES_REQUESTED" },
        }),
      ])
    : [0, 0, 0];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="pb-6">
          <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
            Agent portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Requests &amp; tasks
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Submit new work, track what is in progress, and handle revisions
            when your manager sends something back.
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
      <AgentNav
        pendingCount={pendingCount}
        tasksCount={tasksCount}
        revisionsCount={revisionsCount}
      />
      <div className="pt-8">{children}</div>
    </div>
  );
}
