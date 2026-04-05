import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import {
  managerApprove,
  managerDeny,
  managerRequestChanges,
  managerUpdateAssignment,
} from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

function formatDue(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default async function ManagerPage() {
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
  const approved = tasks.filter((t) => t.reviewStatus === "APPROVED");
  const denied = tasks.filter((t) => t.reviewStatus === "DENIED");
  const needsHelp = tasks.filter(
    (t) =>
      t.executionStatus === "NEEDS_HELP" && t.reviewStatus === "APPROVED",
  );

  return (
    <div className="space-y-10">
      {needsHelp.length > 0 && (
        <section className="rounded-2xl border-2 border-rose-300 bg-rose-500/5 p-6 dark:border-rose-700">
          <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
            Admins need help
          </h2>
          <ul className="mt-3 space-y-3">
            {needsHelp.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-rose-200 bg-white p-4 text-sm dark:border-rose-900 dark:bg-zinc-950"
              >
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Assigned: {t.assignee?.name ?? "—"}
                </p>
                {t.helpNote ? (
                  <p className="mt-2 text-rose-800 dark:text-rose-200">
                    {t.helpNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Pending review ({pending.length})
        </h2>
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

                <form action={managerApprove} className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
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

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Approved &amp; in progress ({approved.length})
        </h2>
        <ul className="mt-4 space-y-4">
          {approved.length === 0 ? (
            <li className="text-sm text-zinc-500">No active assignments.</li>
          ) : (
            approved.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {t.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Admin: {t.assignee?.name ?? "Unassigned"} · Execution:{" "}
                      {t.executionStatus.replace(/_/g, " ")} · Priority{" "}
                      {t.priority} · Due {formatDue(t.dueAt)}
                    </p>
                  </div>
                </div>
                <form
                  action={managerUpdateAssignment}
                  className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">
                    Reassign
                    <select
                      name="assignedToId"
                      defaultValue={t.assignedToId ?? ""}
                      className="ml-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">Keep current</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">
                    Priority
                    <select
                      name="priority"
                      defaultValue={t.priority}
                      className="ml-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">
                    Due
                    <input
                      type="date"
                      name="dueAt"
                      defaultValue={
                        t.dueAt ? t.dueAt.toISOString().slice(0, 10) : ""
                      }
                      className="ml-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
                  >
                    Update
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>

      {denied.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Denied ({denied.length})
          </h2>
          <ul className="mt-4 space-y-2">
            {denied.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <span className="font-medium">{t.title}</span>
                {t.managerNote ? (
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {" "}
                    — {t.managerNote}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
