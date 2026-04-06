import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue, formatDateTime } from "@/lib/format-due";
import { managerDeleteTask } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function ManagerCompletedPage() {
  await requireRole(["MANAGER"]);
  const tasks = await prisma.task.findMany({
    where: {
      reviewStatus: "APPROVED",
      executionStatus: "DONE",
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
          Completed tasks
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Work an admin marked done. Active and in-progress assignments stay on
          the Tasks tab.
        </p>
      </div>

      <ul className="space-y-4">
        {tasks.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
            No completed tasks yet.
          </li>
        ) : (
          tasks.map((t) => (
            <li
              key={t.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none"
            >
              <div className="border-b border-zinc-100 bg-emerald-50/80 px-5 py-3 dark:border-zinc-800 dark:bg-emerald-950/30">
                <p className="text-xs font-medium tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
                  Done
                </p>
                <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200/90">
                  Updated {formatDateTime(t.updatedAt)}
                </p>
              </div>
              <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Request &amp; assignee
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {t.creator?.name ?? "—"}
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span>{t.assignee?.name ?? "Unassigned"}</span>
                  {t.project ? (
                    <>
                      <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600">
                        ·
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t.project.name}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="px-5 py-4">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {t.title}
                </h3>
                {t.notes ? (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {t.notes}
                  </p>
                ) : null}
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div>
                    <dt className="inline font-medium text-zinc-500">Due: </dt>
                    <dd className="inline">{formatDue(t.dueAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-zinc-500">
                      Priority (1–10):{" "}
                    </dt>
                    <dd className="inline">{t.priority}</dd>
                  </div>
                </dl>
                <form action={managerDeleteTask} className="mt-3">
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Delete task
                  </button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
