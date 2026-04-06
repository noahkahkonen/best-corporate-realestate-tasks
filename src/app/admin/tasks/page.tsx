import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { AdminAssignmentCard } from "@/components/admin-assignment-card";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const session = await requireRole(["ADMIN"]);
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: session.user.id,
      reviewStatus: "APPROVED",
      executionStatus: { not: "DONE" },
    },
    include: { creator: true, project: true },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Active assignments{" "}
          <span className="font-normal text-zinc-500">({tasks.length})</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sorted by priority (10 = highest). Mark done on this tab; finished
          work moves to Completed.
        </p>
        <ul className="mt-3 space-y-3">
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
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
