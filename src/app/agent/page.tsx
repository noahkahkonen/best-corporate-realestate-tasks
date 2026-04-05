import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import {
  createProject,
  createTaskRequest,
  deleteMyTaskRequest,
  resubmitTaskRequest,
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

export default async function AgentPage() {
  const session = await requireRole(["AGENT"]);
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { creatorId: session.user.id },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          New request
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Submitted requests go to a manager for review before an admin is
          assigned.
        </p>
        <form action={createTaskRequest} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title
            <input
              name="title"
              required
              placeholder="e.g. Pull comps for 123 Main St"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="sm:col-span-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Details
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Priority (your suggestion)
            <select
              name="priority"
              defaultValue="MEDIUM"
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
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="sm:col-span-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Project (optional)
            <select
              name="projectId"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Submit request
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Projects
        </h2>
        <form action={createProject} className="mt-3 flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="New project name"
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="color"
            type="color"
            defaultValue="#4f46e5"
            className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700"
            title="Color"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Add project
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Your requests
        </h2>
        <ul className="mt-4 space-y-4">
          {tasks.length === 0 ? (
            <li className="text-sm text-zinc-500">No requests yet.</li>
          ) : (
            tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/80"
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
                      Review:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {t.reviewStatus.replace(/_/g, " ")}
                      </span>
                      {" · "}
                      Due {formatDue(t.dueAt)}
                      {t.project ? ` · ${t.project.name}` : ""}
                    </p>
                    {t.managerNote ? (
                      <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                        <span className="font-medium">Manager:</span>{" "}
                        {t.managerNote}
                      </p>
                    ) : null}
                  </div>
                  {(t.reviewStatus === "PENDING_REVIEW" ||
                    t.reviewStatus === "CHANGES_REQUESTED") && (
                    <form action={deleteMyTaskRequest}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="text-sm text-rose-600 hover:underline dark:text-rose-400"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                </div>
                {t.reviewStatus === "CHANGES_REQUESTED" && (
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
                        rows={2}
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
                          t.dueAt
                            ? t.dueAt.toISOString().slice(0, 10)
                            : ""
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
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
