import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ManagerPendingRequestCard } from "@/components/manager-pending-request-card";

export const dynamic = "force-dynamic";

export default async function ManagerRequestsPage() {
  await requireRole(["MANAGER"]);
  const [pending, admins] = await Promise.all([
    prisma.task.findMany({
      where: {
        reviewStatus: "PENDING_REVIEW",
        creator: { role: "AGENT" },
      },
      include: {
        creator: true,
        project: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { name: "asc" },
    }),
  ]);

  const adminOptions = admins.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Task requests
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Expand a row for full details, then pick Approve, Request changes, or
          Reject—fields appear only for that choice.
        </p>
      </div>

      <ul className="space-y-2">
        {pending.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
            No pending requests from agents.
          </li>
        ) : (
          pending.map((t) => (
            <ManagerPendingRequestCard
              key={t.id}
              task={{
                id: t.id,
                title: t.title,
                notes: t.notes,
                priority: t.priority,
                dueAt: t.dueAt ? t.dueAt.toISOString() : null,
                projectName: t.project?.name ?? null,
                agentName: t.creator?.name ?? null,
                agentEmail: t.creator?.email ?? null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
              }}
              admins={adminOptions}
            />
          ))
        )}
      </ul>
    </div>
  );
}
