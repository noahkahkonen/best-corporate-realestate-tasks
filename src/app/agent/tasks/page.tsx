import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";

export const dynamic = "force-dynamic";

export default async function AgentTasksPage() {
  const session = await requireRole(["AGENT"]);
  const approved = await prisma.task.findMany({
    where: {
      creatorId: session.user.id,
      reviewStatus: "APPROVED",
    },
    include: { project: true, assignee: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Approved work
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Requests a manager approved and assigned to an admin. Status updates
          appear here.
        </p>
      </div>

      <ul className="space-y-4">
        {approved.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
            No active tasks yet. When a manager approves a request, it will show
            up here.
          </li>
        ) : (
          approved.map((t) => (
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
                {t.helpNote ? (
                  <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-rose-900 dark:text-rose-100">
                    <span className="font-medium">Help requested:</span>{" "}
                    {t.helpNote}
                  </div>
                ) : null}
              </dl>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
