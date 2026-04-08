import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { AgentHelpTaskCard } from "@/components/agent-help-task-card";

export const dynamic = "force-dynamic";

export default async function AgentHelpPage() {
  const session = await requireRole(["AGENT"]);

  const tasks = await prisma.task.findMany({
    where: {
      creatorId: session.user.id,
      reviewStatus: "APPROVED",
      executionStatus: "NEEDS_HELP",
    },
    include: {
      project: true,
      assignee: true,
      helpMessages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Help from admins
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          When an assigned admin requests help, the task appears here. Message
          back in the thread, then resolve when the problem is fixed—their task
          returns to <span className="font-medium">In progress</span>.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
          No admin help requests right now.
        </div>
      ) : (
        <ul className="space-y-6">
          {tasks.map((t) => (
            <AgentHelpTaskCard
              key={t.id}
              taskId={t.id}
              title={t.title}
              notes={t.notes}
              priority={t.priority}
              dueAt={t.dueAt}
              helpNote={t.helpNote}
              assignee={t.assignee}
              project={t.project}
              messagesAsc={t.helpMessages}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
