import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue, formatDateTime } from "@/lib/format-due";
import { adminDeleteAssignedTask } from "@/server/workflow-actions";
import { AdminPagination } from "@/components/admin-pagination";
import {
  ADMIN_TASKS_PER_PAGE,
  parsePageParam,
} from "@/lib/admin-paging";

export const dynamic = "force-dynamic";

export default async function AdminCompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole(["ADMIN"]);
  const params = await searchParams;
  const requestedPage = parsePageParam(params.page);

  const where = {
    assignedToId: session.user.id,
    reviewStatus: "APPROVED" as const,
    executionStatus: "DONE" as const,
  };

  const total = await prisma.task.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TASKS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);

  const tasks = await prisma.task.findMany({
    where,
    include: { creator: true, project: true },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * ADMIN_TASKS_PER_PAGE,
    take: ADMIN_TASKS_PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Completed tasks
          <span className="ml-1 font-normal text-zinc-500">({total})</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Work you marked done. Up to {ADMIN_TASKS_PER_PAGE} per page. Delete to
          remove from your history.
        </p>
      </div>

      <ul className="space-y-2">
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
              <div className="flex items-start justify-between gap-2 border-b border-emerald-100 bg-emerald-50/80 px-3 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    Done
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-emerald-900/80 dark:text-emerald-200/90">
                    {formatDateTime(t.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
                <p className="text-[10px] font-semibold uppercase text-zinc-500">
                  Request
                </p>
                <p className="mt-0.5 text-xs leading-tight text-zinc-700 dark:text-zinc-300">
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
              <div className="px-3 py-2">
                <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                  {t.title}
                </h3>
                {t.notes ? (
                  <p className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                    {t.notes}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-zinc-500">
                  P{t.priority} · Due {formatDue(t.dueAt)}
                </p>
                <form action={adminDeleteAssignedTask} className="mt-2">
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Delete task
                  </button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
      <AdminPagination pathname="/admin/completed" page={page} total={total} />
    </div>
  );
}
