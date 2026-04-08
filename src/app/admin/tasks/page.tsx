import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { AdminAssignmentCard } from "@/components/admin-assignment-card";
import { AdminPagination } from "@/components/admin-pagination";
import {
  ADMIN_TASKS_PER_PAGE,
  parsePageParam,
} from "@/lib/admin-paging";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage({
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
    executionStatus: { not: "DONE" as const },
  };

  const total = await prisma.task.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TASKS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);

  const tasks = await prisma.task.findMany({
    where,
    include: {
      creator: true,
      project: true,
      helpMessages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    skip: (page - 1) * ADMIN_TASKS_PER_PAGE,
    take: ADMIN_TASKS_PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Active assignments{" "}
          <span className="font-normal text-zinc-500">({total})</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sorted by priority (lowest number first). Up to {ADMIN_TASKS_PER_PAGE}{" "}
          on this screen—use Next for more. Mark done here; finished work moves
          to Completed.
        </p>
        <ul className="mt-2 space-y-2">
          {tasks.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              No active assignments. Managers assign work after approval.
            </li>
          ) : (
            tasks.map((t) => (
              <li key={`${t.id}-${t.updatedAt.toISOString()}`}>
                <AdminAssignmentCard
                  taskId={t.id}
                  title={t.title}
                  notes={t.notes}
                  executionStatus={t.executionStatus}
                  priority={t.priority}
                  dueAt={t.dueAt}
                  creatorName={t.creator?.name ?? null}
                  projectName={t.project?.name ?? null}
                  helpNote={t.helpNote}
                  helpMessages={t.helpMessages}
                />
              </li>
            ))
          )}
        </ul>
        <AdminPagination pathname="/admin/tasks" page={page} total={total} />
      </section>
    </div>
  );
}
