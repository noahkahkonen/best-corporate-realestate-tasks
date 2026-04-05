import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";
import { AgentCompletedTaskCard } from "@/components/agent-completed-task-card";

export const dynamic = "force-dynamic";

export default async function AgentTasksPage() {
  const session = await requireRole(["AGENT"]);
  const [current, completed] = await Promise.all([
    prisma.task.findMany({
      where: {
        creatorId: session.user.id,
        reviewStatus: "APPROVED",
        executionStatus: { notIn: ["NEEDS_HELP", "DONE"] },
      },
      include: { project: true, assignee: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        creatorId: session.user.id,
        reviewStatus: "APPROVED",
        executionStatus: "DONE",
      },
      include: { project: true, assignee: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Current tasks
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Active work an admin is handling (not yet marked done).
          </p>
        </div>

        <ul className="space-y-4">
          {current.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              No current tasks. When a manager approves a request, it will show
              here until the admin marks it done.
            </li>
          ) : (
            current.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                {t.notes ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.notes}
                  </p>
                ) : null}
                <dl className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div>
                    <dt className="inline font-medium text-zinc-500">Admin: </dt>
                    <dd className="inline">
                      {t.assignee?.name ?? "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-zinc-500">
                      Execution:{" "}
                    </dt>
                    <dd className="inline">
                      {t.executionStatus.replace(/_/g, " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-zinc-500">
                      Priority:{" "}
                    </dt>
                    <dd className="inline">{t.priority}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-zinc-500">Due: </dt>
                    <dd className="inline">{formatDue(t.dueAt)}</dd>
                  </div>
                  {t.project ? (
                    <div>
                      <dt className="inline font-medium text-zinc-500">
                        Project:{" "}
                      </dt>
                      <dd className="inline">{t.project.name}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Completed tasks
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Work the admin marked done. Request a redo to send it back to your
            manager with a note—they will see it as a redo on Task requests.
          </p>
        </div>

        <ul className="space-y-2">
          {completed.length === 0 ? (
            <li className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              No completed tasks yet.
            </li>
          ) : (
            completed.map((t) => (
              <AgentCompletedTaskCard
                key={t.id}
                task={{
                  id: t.id,
                  title: t.title,
                  notes: t.notes,
                  dueAt: t.dueAt ? t.dueAt.toISOString() : null,
                  projectName: t.project?.name ?? null,
                  assigneeName: t.assignee?.name ?? null,
                }}
              />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
