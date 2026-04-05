import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ManagerActiveAssignmentCard } from "@/components/manager-active-assignment-card";
import { ManagerNewTaskPanel } from "@/components/manager-new-task-panel";

export const dynamic = "force-dynamic";

export default async function ManagerTasksPage() {
  await requireRole(["MANAGER"]);
  const [tasks, admins, projects] = await Promise.all([
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
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const approved = tasks.filter((t) => t.reviewStatus === "APPROVED");
  const denied = tasks.filter((t) => t.reviewStatus === "DENIED");
  const activeApproved = approved.filter(
    (t) =>
      t.executionStatus !== "NEEDS_HELP" && t.executionStatus !== "DONE",
  );

  const adminOptions = admins.map((a) => ({ id: a.id, name: a.name }));
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-10">
      <ManagerNewTaskPanel admins={adminOptions} projects={projectOptions}>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Tasks
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Track active assignments, see finished work on{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Completed
            </span>
            , and use{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Admin support
            </span>{" "}
            when an admin needs help.
          </p>
        </div>
      </ManagerNewTaskPanel>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Active assignments
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Approved work in progress—not in a help state and not yet marked
              done ({activeApproved.length}). Click{" "}
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                Edit
              </span>{" "}
              to change assignment, priority, or due date. Finished work is on
              the Completed tab.
            </p>
          </div>
        </div>

        {activeApproved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No active assignments
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              Approve agent requests from Task requests or use New task above.
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
