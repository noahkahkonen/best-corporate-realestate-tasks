import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";
import {
  managerApprove,
  managerDeny,
  managerRequestChanges,
} from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function ManagerRequestsPage() {
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

  const pending = tasks.filter((t) => t.reviewStatus === "PENDING_REVIEW");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Pending review ({pending.length})
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Agent submissions awaiting your approval, changes, or denial.
        </p>
        <ul className="mt-4 space-y-6">
          {pending.length === 0 ? (
            <li className="text-sm text-zinc-500">No pending requests.</li>
          ) : (
            pending.map((t) => (
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
                  From {t.creator?.name ?? "Unknown"} · Suggested priority{" "}
                  {t.priority} · Due {formatDue(t.dueAt)}
                  {t.project ? ` · ${t.project.name}` : ""}
                </p>

                <form
                  action={managerApprove}
                  className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Assign to admin
                    <select
                      name="assignedToId"
                      required
                      className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">Select…</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Priority
                    <select
                      name="priority"
                      defaultValue={t.priority}
                      className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Due
                    <input
                      type="date"
                      name="dueAt"
                      defaultValue={
                        t.dueAt ? t.dueAt.toISOString().slice(0, 10) : ""
                      }
                      className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Approve &amp; assign
                  </button>
                </form>

                <form
                  action={managerRequestChanges}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <label className="flex min-w-[220px] flex-1 flex-col text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Request changes
                    <input
                      name="managerNote"
                      required
                      placeholder="What should the agent fix?"
                      className="mt-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-amber-300 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-100"
                  >
                    Send back
                  </button>
                </form>

                <form
                  action={managerDeny}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <label className="flex min-w-[220px] flex-1 flex-col text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Deny (reason required)
                    <input
                      name="managerNote"
                      required
                      placeholder="Reason for denial"
                      className="mt-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-rose-200 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-800 dark:text-rose-200"
                  >
                    Deny
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
