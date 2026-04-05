import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { AgentCompletedTaskCard } from "@/components/agent-completed-task-card";

export const dynamic = "force-dynamic";

export default async function AgentCompletedPage() {
  const session = await requireRole(["AGENT"]);
  const completed = await prisma.task.findMany({
    where: {
      creatorId: session.user.id,
      reviewStatus: "APPROVED",
      executionStatus: "DONE",
    },
    include: { project: true, assignee: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
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
    </div>
  );
}
