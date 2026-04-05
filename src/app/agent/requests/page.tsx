import type { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";
import { AgentNewRequestPanel } from "@/components/agent-new-request-panel";
import { deleteMyTaskRequest } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

function statusLabel(status: ReviewStatus): string {
  switch (status) {
    case "PENDING_REVIEW":
      return "Awaiting review";
    case "DENIED":
      return "Denied";
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes requested";
  }
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums";
  if (status === "PENDING_REVIEW") {
    return (
      <span
        className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100`}
      >
        {statusLabel(status)}
      </span>
    );
  }
  if (status === "DENIED") {
    return (
      <span
        className={`${base} bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100`}
      >
        {statusLabel(status)}
      </span>
    );
  }
  return (
    <span className={`${base} bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100`}>
      {statusLabel(status)}
    </span>
  );
}

export default async function AgentRequestsPage() {
  const session = await requireRole(["AGENT"]);
  const [requests, projects] = await Promise.all([
    prisma.task.findMany({
      where: {
        creatorId: session.user.id,
        reviewStatus: { in: ["PENDING_REVIEW", "DENIED"] },
      },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Your requests
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every submission listed with its current status. Use{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Current tasks
          </span>{" "}
          for approved work and{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Revisions
          </span>{" "}
          when your manager sends something back.
        </p>
      </div>

      <AgentNewRequestPanel projects={projectOptions} />

      <section>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          All requests ({requests.length})
        </h3>
        <ul className="mt-4 space-y-4">
          {requests.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              No requests yet. Use <strong>New request</strong> above to create
              one.
            </li>
          ) : (
            requests.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 gap-y-1">
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {t.title}
                      </p>
                      <StatusBadge status={t.reviewStatus} />
                    </div>
                    {t.notes ? (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {t.notes}
                      </p>
                    ) : null}
                    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <div>
                        <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                          Due:{" "}
                        </dt>
                        <dd className="inline">{formatDue(t.dueAt)}</dd>
                      </div>
                      {t.project ? (
                        <div>
                          <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                            Project:{" "}
                          </dt>
                          <dd className="inline">{t.project.name}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {t.reviewStatus === "DENIED" && t.managerNote ? (
                      <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-100">
                        <span className="font-medium">Reason:</span>{" "}
                        {t.managerNote}
                      </p>
                    ) : null}
                  </div>
                  {t.reviewStatus === "PENDING_REVIEW" ? (
                    <form action={deleteMyTaskRequest} className="shrink-0">
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="text-sm text-rose-600 hover:underline dark:text-rose-400"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
