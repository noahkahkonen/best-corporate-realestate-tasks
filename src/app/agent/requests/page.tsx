import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { formatDue } from "@/lib/format-due";
import {
  createProject,
  createTaskRequest,
  deleteMyTaskRequest,
} from "@/server/workflow-actions";

export const dynamic = "force-dynamic";

export default async function AgentRequestsPage() {
  const session = await requireRole(["AGENT"]);
  const [pending, denied, projects] = await Promise.all([
    prisma.task.findMany({
      where: {
        creatorId: session.user.id,
        reviewStatus: "PENDING_REVIEW",
      },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        creatorId: session.user.id,
        reviewStatus: "DENIED",
      },
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
          Awaiting review ({pending.length})
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your manager has not decided on these yet.
        </p>
        <ul className="mt-4 space-y-4">
          {pending.length === 0 ? (
            <li className="text-sm text-zinc-500">None right now.</li>
          ) : (
            pending.map((t) => (
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
                      Due {formatDue(t.dueAt)}
                      {t.project ? ` · ${t.project.name}` : ""}
                    </p>
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
          <ul className="mt-4 space-y-3">
            {denied.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <p className="font-medium text-zinc-900 dark:text-white">
                  {t.title}
                </p>
                {t.managerNote ? (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Reason:
                    </span>{" "}
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
