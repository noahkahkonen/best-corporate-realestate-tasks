import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue, formatDateTime } from "@/lib/format-due";
import { adminDeleteAssignedTask } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function AdminCompletedPage() {
  const session = await requireRole(["ADMIN"]);
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: session.user.id,
      reviewStatus: "APPROVED",
      executionStatus: "DONE",
    },
    include: { creator: true, project: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Completed tasks
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Work you marked done. Delete to remove from your history.
        </p>
      </div>

      <ul className="space-y-3">
        {tasks.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
            No completed tasks yet.
          </li>
        ) : (
          tasks.map((t) => (
            <li
              key={t.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80"
            >
              <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    Done
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-900/80 dark:text-emerald-200/90">
                    {formatDateTime(t.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <p className="text-[10px] font-semibold uppercase text-zinc-500">
                  Request
                </p>
                <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {t.creator?.name ?? "—"}
                  </span>
                  {t.project ? (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-600"> · </span>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t.project.name}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="px-4 py-3">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {t.title}
                </h3>
                {t.notes ? (
                  <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.notes}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-zinc-500">
                  P{t.priority} · Due {formatDue(t.dueAt)}
                </p>
                <form action={adminDeleteAssignedTask} className="mt-3">
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
