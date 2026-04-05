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
  const items = await prisma.task.findMany({
    where: {
      creatorId: session.user.id,
      OR: [
        { reviewStatus: "CHANGES_REQUESTED" },
        {
          reviewStatus: "APPROVED",
          executionStatus: "NEEDS_HELP",
        },
      ],
    },
    include: { project: true, assignee: true },
    orderBy: { updatedAt: "desc" },
  });

  const managerRevisions = items.filter(
    (t) => t.reviewStatus === "CHANGES_REQUESTED",
  );
  const adminHelp = items.filter(
    (t) =>
      t.reviewStatus === "APPROVED" && t.executionStatus === "NEEDS_HELP",
  );

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Revisions &amp; help
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manager change requests and admin help flags both land here so you
            can respond in one place.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
          Nothing waiting on you yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Revisions &amp; help
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Manager change requests and admin help flags both land here so you can
          respond in one place.
        </p>
      </div>

      {adminHelp.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-rose-900 dark:text-rose-100">
            Admin needs help ({adminHelp.length})
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            The assigned admin is blocked—read their note and coordinate with
            your manager if needed. Your task stays here until the manager
            resolves it from Admin support.
          </p>
          <ul className="mt-4 space-y-4">
            {adminHelp.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-rose-200/90 bg-rose-50/40 p-5 dark:border-rose-900/50 dark:bg-rose-950/20"
              >
                <span className="inline-flex rounded-full bg-rose-600 px-2 py-0.5 text-xs font-medium text-white">
                  Help requested
                </span>
                <p className="mt-3 font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                {t.notes ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.notes}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-zinc-500">
                  Admin: {t.assignee?.name ?? "—"} · Due {formatDue(t.dueAt)}
                  {t.project ? ` · ${t.project.name}` : ""}
                </p>
                {t.helpNote ? (
                  <blockquote className="mt-4 border-l-4 border-rose-400 bg-white/80 py-2 pl-4 pr-2 text-sm text-rose-950 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-100">
                    <span className="font-medium">From admin:</span> {t.helpNote}
                  </blockquote>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500 italic">
                    No details provided.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          Manager requested changes ({managerRevisions.length})
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Update the request and resubmit for review.
        </p>
        <ul className="mt-4 space-y-6">
          {managerRevisions.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              No manager revisions pending.
            </li>
          ) : (
            managerRevisions.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-amber-200/80 bg-white p-5 dark:border-amber-900/40 dark:bg-zinc-900/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex rounded-full bg-amber-600/15 px-2 py-0.5 text-xs font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
                      Revision
                    </span>
                    <p className="mt-2 font-medium text-zinc-900 dark:text-white">
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
      </section>
    </div>
  );
}
