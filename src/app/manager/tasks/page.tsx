import type { ExecutionStatus, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";
import { managerUpdateAssignment } from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

function executionLabel(s: ExecutionStatus): string {
  return s.replace(/_/g, " ");
}

function priorityStyles(p: Priority): string {
  switch (p) {
    case "HIGH":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100";
    case "MEDIUM":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100";
    case "LOW":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
    default:
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
  }
}

function executionBadgeStyles(s: ExecutionStatus): string {
  switch (s) {
    case "DONE":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-100";
    case "NEEDS_HELP":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100";
    case "NOT_STARTED":
    default:
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200";
  }
}

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
  const needsHelp = approved.filter(
    (t) => t.executionStatus === "NEEDS_HELP",
  );
  const activeApproved = approved.filter(
    (t) => t.executionStatus !== "NEEDS_HELP",
  );

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Tasks
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Monitor work that has been approved and assigned. Jump to blocked
          items first, then adjust ownership, priority, or due dates as needed.
        </p>
      </div>

      {needsHelp.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-b from-rose-50/90 to-white shadow-sm dark:border-rose-900/60 dark:from-rose-950/40 dark:to-zinc-950">
          <div className="border-b border-rose-200/80 bg-rose-500/10 px-5 py-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-rose-950 dark:text-rose-50">
                Admins need help
              </h3>
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums dark:bg-rose-700">
                {needsHelp.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-rose-900/80 dark:text-rose-200/90">
              These assignments are flagged—review the note and unblock or
              reassign.
            </p>
          </div>
          <ul className="divide-y divide-rose-100 dark:divide-rose-900/40">
            {needsHelp.map((t) => (
              <li key={t.id} className="px-5 py-5">
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-white px-2 py-1 text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                    Admin: {t.assignee?.name ?? "—"}
                  </span>
                  {t.creator ? (
                    <span className="rounded-md bg-white px-2 py-1 text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                      Agent: {t.creator.name}
                    </span>
                  ) : null}
                </div>
                {t.helpNote ? (
                  <blockquote className="mt-4 border-l-4 border-rose-400 bg-rose-50/80 py-2 pl-4 pr-2 text-sm leading-relaxed text-rose-950 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-100">
                    {t.helpNote}
                  </blockquote>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500 italic">
                    No help note provided.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Active assignments
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Approved work that is not in a help state ({activeApproved.length}
              ).
            </p>
          </div>
        </div>

        {activeApproved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No active assignments
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              When you approve requests from the Task requests tab, they will
              appear here for tracking and updates.
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {activeApproved.map((t) => (
              <li
                key={t.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none"
              >
                <div className="border-b border-zinc-100 bg-zinc-50/90 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Request &amp; assignee
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {t.creator?.name ?? "Unknown agent"}
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span>{t.assignee?.name ?? "Unassigned"}</span>
                    {t.project ? (
                      <>
                        <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600">
                          ·
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {t.project.name}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="px-5 py-5">
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {t.title}
                  </h4>
                  {t.notes ? (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {t.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${executionBadgeStyles(t.executionStatus)}`}
                    >
                      {executionLabel(t.executionStatus)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles(t.priority)}`}
                    >
                      {t.priority} priority
                    </span>
                    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      Due {formatDue(t.dueAt)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Update assignment
                  </p>
                  <form
                    action={managerUpdateAssignment}
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
                  >
                    <input type="hidden" name="id" value={t.id} />
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Assign to
                      <select
                        name="assignedToId"
                        defaultValue={t.assignedToId ?? ""}
                        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">Keep current</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Priority
                      <select
                        name="priority"
                        defaultValue={t.priority}
                        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <div className="flex items-end sm:col-span-2 lg:col-span-1">
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {denied.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Denied requests
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              For reference—already handled on the Task requests tab.
            </p>
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {denied.map((t) => (
              <li key={t.id} className="px-5 py-4 text-sm">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </span>
                {t.managerNote ? (
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
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
