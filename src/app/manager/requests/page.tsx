import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue, formatDateTime } from "@/lib/format-due";
import {
  managerApprove,
  managerDeny,
  managerRequestChanges,
} from "@/server/workflow-actions";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Task requests from agents
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Review each request. Approve to assign an admin, send back for edits,
          or reject with a reason.
        </p>
      </div>

      <ul className="space-y-8">
        {pending.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
            No pending requests from agents.
          </li>
        ) : (
          pending.map((t) => {
            const agent = t.creator;
            return (
              <li
                key={t.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80"
              >
                <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Requested by
                  </p>
                  <p className="mt-1 font-medium text-zinc-900 dark:text-white">
                    {agent?.name ?? "Unknown"}{" "}
                    {agent?.email ? (
                      <span className="font-normal text-zinc-600 dark:text-zinc-400">
                        · {agent.email}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Submitted {formatDateTime(t.createdAt)} · Updated{" "}
                    {formatDateTime(t.updatedAt)}
                  </p>
                </div>

                <div className="px-5 py-5">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {t.title}
                  </h3>
                  {t.notes ? (
                    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Details
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{t.notes}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No extra details.</p>
                  )}
                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <div>
                      <dt className="inline font-medium text-zinc-500">
                        Suggested priority:{" "}
                      </dt>
                      <dd className="inline">{t.priority}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-zinc-500">
                        Due:{" "}
                      </dt>
                      <dd className="inline">{formatDue(t.dueAt)}</dd>
                    </div>
                    {t.project ? (
                      <div>
                        <dt className="inline font-medium text-zinc-500">
                          Project:{" "}
                        </dt>
                        <dd className="inline">{t.project.name}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/30 px-5 py-5 dark:border-zinc-800 dark:bg-zinc-950/30">
                  <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Your decision
                  </p>

                  <form
                    action={managerApprove}
                    className="flex flex-wrap items-end gap-3 rounded-xl border border-emerald-200/80 bg-white p-4 dark:border-emerald-900/50 dark:bg-zinc-900/60"
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <span className="w-full text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      Approve and assign to an admin
                    </span>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Admin
                      <select
                        name="assignedToId"
                        required
                        className="ml-2 mt-0.5 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                        className="ml-2 mt-0.5 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                        className="ml-2 mt-0.5 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Approve
                    </button>
                  </form>

                  <form
                    action={managerRequestChanges}
                    className="rounded-xl border border-amber-200/80 bg-white p-4 dark:border-amber-900/40 dark:bg-zinc-900/60"
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <label className="block text-sm font-medium text-amber-950 dark:text-amber-100">
                      Request changes from the agent
                      <textarea
                        name="managerNote"
                        required
                        rows={2}
                        placeholder="Explain what they should update or clarify…"
                        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <button
                      type="submit"
                      className="mt-3 rounded-lg border border-amber-400 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-500/25 dark:border-amber-700 dark:text-amber-100"
                    >
                      Send back for changes
                    </button>
                  </form>

                  <form
                    action={managerDeny}
                    className="rounded-xl border border-rose-200/80 bg-white p-4 dark:border-rose-900/40 dark:bg-zinc-900/60"
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <label className="block text-sm font-medium text-rose-900 dark:text-rose-100">
                      Reject this request
                      <textarea
                        name="managerNote"
                        required
                        rows={2}
                        placeholder="Reason the request is rejected (required)…"
                        className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <button
                      type="submit"
                      className="mt-3 rounded-lg border border-rose-300 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-500/20 dark:border-rose-800 dark:text-rose-100"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
