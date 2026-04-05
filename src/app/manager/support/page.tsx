import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { managerResolveHelpRequest } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function ManagerSupportPage() {
  await requireRole(["MANAGER"]);
  const needsHelp = await prisma.task.findMany({
    where: {
      reviewStatus: "APPROVED",
      executionStatus: "NEEDS_HELP",
    },
    include: {
      creator: true,
      assignee: true,
      project: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Admin support
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          When an admin flags a task as needing help, it appears here. Review
          their note, coordinate with the agent on the Revisions tab if needed,
          then return the task to in progress when unblocked.
        </p>
      </div>

      {needsHelp.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No help requests right now
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Admins can mark a task as “Needs help” from their portal. You will
            see it here and agents will see it under Revisions.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-b from-rose-50/90 to-white shadow-sm dark:border-rose-900/60 dark:from-rose-950/40 dark:to-zinc-950">
          <div className="border-b border-rose-200/80 bg-rose-500/10 px-5 py-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-rose-950 dark:text-rose-50">
                Needs help ({needsHelp.length})
              </h3>
            </div>
          </div>
          <ul className="divide-y divide-rose-100 dark:divide-rose-900/40">
            {needsHelp.map((t) => (
              <li key={t.id} className="px-5 py-5">
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-white px-2 py-1 text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                    Admin: {t.assignee?.name ?? "—"}
                  </span>
                  {t.creator ? (
                    <span className="rounded-md bg-white px-2 py-1 text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                      {t.creator.role === "AGENT" ? "Agent" : "Created by"}:{" "}
                      {t.creator.name}
                    </span>
                  ) : null}
                  {t.project ? (
                    <span className="rounded-md bg-white px-2 py-1 text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                      {t.project.name}
                    </span>
                  ) : null}
                </div>
                {t.helpNote ? (
                  <blockquote className="mt-4 border-l-4 border-rose-400 bg-rose-50/80 py-2 pl-4 pr-2 text-sm leading-relaxed text-rose-950 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-100">
                    {t.helpNote}
                  </blockquote>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500 italic">
                    No help note provided.
                  </p>
                )}
                <form
                  action={managerResolveHelpRequest}
                  className="mt-4 flex flex-wrap items-center gap-3"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    Resolve &amp; return to in progress
                  </button>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Clears the help flag for the admin; agents see this on
                    Revisions until resolved.
                  </span>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
