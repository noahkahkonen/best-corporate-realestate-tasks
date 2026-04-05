import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";
import {
  deleteMyTaskRequest,
  resubmitTaskRequest,
} from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function AgentRevisionsPage() {
  const session = await requireRole(["AGENT"]);
  const revisions = await prisma.task.findMany({
    where: {
      creatorId: session.user.id,
      reviewStatus: "CHANGES_REQUESTED",
    },
    include: { project: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Revisions needed
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your manager asked for changes. Update the details below and resubmit
          for review.
        </p>
      </div>

      <ul className="space-y-6">
        {revisions.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
            Nothing waiting on you. When a manager sends a request back for
            edits, it will appear here.
          </li>
        ) : (
          revisions.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-amber-200/80 bg-white p-5 dark:border-amber-900/40 dark:bg-zinc-900/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {t.title}
                  </p>
                  {t.notes ? (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {t.notes}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    Due {formatDue(t.dueAt)}
                    {t.project ? ` · ${t.project.name}` : ""}
                  </p>
                  {t.managerNote ? (
                    <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                      <span className="font-medium">Manager:</span>{" "}
                      {t.managerNote}
                    </p>
                  ) : null}
                </div>
                <form action={deleteMyTaskRequest}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="text-sm text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Delete
                  </button>
                </form>
              </div>

              <form
                action={resubmitTaskRequest}
                className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700"
              >
                <input type="hidden" name="id" value={t.id} />
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Title
                  <input
                    name="title"
                    defaultValue={t.title}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Details
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={t.notes ?? ""}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Priority
                  <select
                    name="priority"
                    defaultValue={t.priority}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Due date
                  <input
                    type="date"
                    name="dueAt"
                    defaultValue={
                      t.dueAt ? t.dueAt.toISOString().slice(0, 10) : ""
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Resubmit for review
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
