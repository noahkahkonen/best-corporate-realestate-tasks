import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ManagerActiveAssignmentCard } from "@/components/manager-active-assignment-card";

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
  const activeApproved = approved.filter(
    (t) =>
      t.executionStatus !== "NEEDS_HELP" && t.executionStatus !== "DONE",
  );

  const adminOptions = admins.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Active assignments{" "}
          <span className="font-normal text-zinc-500">({activeApproved.length})</span>
        </h3>

        {activeApproved.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No active assignments
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-500">
              Approve agent requests from Task requests or use New task above.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
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
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Denied requests
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              For reference—handled on Task requests.
            </p>
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {denied.map((t) => (
              <li key={t.id} className="px-4 py-3 text-sm">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </span>
                {t.managerNote ? (
                  <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">
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
