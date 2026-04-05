"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { managerCreateApprovedTask } from "@/server/workflow-actions";

type ProjectOption = { id: string; name: string };
type AdminOption = { id: string; name: string };

export function ManagerNewTaskPanel({
  admins,
  projects,
}: {
  admins: AdminOption[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {open
            ? "Creates work that is already approved and goes straight to the admin you pick."
            : "Assign internal work without an agent request review step."}
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          {open ? "Cancel" : "New task"}
        </button>
      </div>
      {open ? (
        <form
          action={async (fd) => {
            await managerCreateApprovedTask(fd);
            setOpen(false);
            router.refresh();
          }}
          className="grid gap-3 p-5 sm:grid-cols-2"
        >
          <label className="sm:col-span-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title
            <input
              name="title"
              required
              placeholder="e.g. Review lease abstract for Building A"
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
            Assign to admin
            <select
              name="assignedToId"
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select…</option>
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
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
              className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              Create task
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
