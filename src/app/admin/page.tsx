import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { adminUpdateExecution } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

function formatDue(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default async function AdminPage() {
  const session = await requireRole(["ADMIN"]);
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: session.user.id,
      reviewStatus: "APPROVED",
    },
    include: { creator: true, project: true },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Assigned to you ({tasks.length})
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sorted by priority (10 = highest) within your queue.
        </p>
        <ul className="mt-4 space-y-5">
          {tasks.length === 0 ? (
            <li className="text-sm text-zinc-500">
              No tasks assigned yet. Managers will assign work after they
              approve requests.
            </li>
          ) : (
            tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                {t.notes ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.notes}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-zinc-500">
                  Requested by {t.creator?.name ?? "—"} · P{t.priority} · Due{" "}
                  {formatDue(t.dueAt)}
                  {t.project ? ` · ${t.project.name}` : ""}
                </p>

                <form
                  key={`${t.id}-${t.updatedAt.toISOString()}`}
                  action={adminUpdateExecution}
                  className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Your status
                    <select
                      name="executionStatus"
                      defaultValue={t.executionStatus}
                      className="mt-1 w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="NOT_STARTED">Not started</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="DONE">Done</option>
                      <option value="NEEDS_HELP">Needs help</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Note (required if requesting help)
                    <textarea
                      name="helpNote"
                      rows={2}
                      placeholder="What do you need from a manager?"
                      defaultValue={t.helpNote ?? ""}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Save status
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
