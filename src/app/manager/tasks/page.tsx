import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ManagerActiveAssignmentCard } from "@/components/manager-active-assignment-card";
import { managerResolveHelpRequest } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function ManagerTasksPage() {
  await requireRole(["MANAGER"]);
  const [tasks, admins] = await Promise.all([
    prisma.task.findMany({
      include: {
        creator: true,
        assignee: true,
        project: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { name: "asc" },
    }),
  ]);

  const approved = tasks.filter((t) => t.reviewStatus === "APPROVED");
  const denied = tasks.filter((t) => t.reviewStatus === "DENIED");
  const needsHelp = approved.filter(
    (t) => t.executionStatus === "NEEDS_HELP",
  );
  const activeApproved = approved.filter(
    (t) => t.executionStatus !== "NEEDS_HELP",
  );

  const adminOptions = admins.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Tasks
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Monitor work that has been approved and assigned. Jump to blocked
          items first, then adjust ownership, priority, or due dates as needed.
        </p>
      </div>

      {needsHelp.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-b from-rose-50/90 to-white shadow-sm dark:border-rose-900/60 dark:from-rose-950/40 dark:to-zinc-950">
          <div className="border-b border-rose-200/80 bg-rose-500/10 px-5 py-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-rose-950 dark:text-rose-50">
                Admins need help
              </h3>
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums dark:bg-rose-700">
                {needsHelp.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-rose-900/80 dark:text-rose-200/90">
              Review the note, then return the task to{" "}
              <span className="font-medium">In progress</span> when the admin
              can continue, or use Edit on the card below to reassign.
            </p>
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
                      Agent: {t.creator.name}
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
                    Clears the help flag so the admin can keep working.
                  </span>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Active assignments
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Approved work that is not in a help state ({activeApproved.length}
              ). Click <span className="font-medium text-zinc-600 dark:text-zinc-300">Edit</span>{" "}
              to change assignment, priority, or due date.
            </p>
          </div>
        </div>

        {activeApproved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No active assignments
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              When you approve requests from the Task requests tab, they will
              appear here for tracking and updates.
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {activeApproved.map((t) => (
              <li key={`${t.id}-${t.updatedAt.toISOString()}`}>
                <ManagerActiveAssignmentCard
                  taskId={t.id}
                  creatorName={t.creator?.name ?? null}
                  assigneeName={t.assignee?.name ?? null}
                  projectName={t.project?.name ?? null}
                  title={t.title}
                  notes={t.notes}
                  executionStatus={t.executionStatus}
                  priority={t.priority}
                  dueAt={t.dueAt}
                  assignedToId={t.assignedToId}
                  admins={adminOptions}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {denied.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Denied requests
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              For reference—already handled on the Task requests tab.
            </p>
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {denied.map((t) => (
              <li key={t.id} className="px-5 py-4 text-sm">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </span>
                {t.managerNote ? (
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    {t.managerNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
