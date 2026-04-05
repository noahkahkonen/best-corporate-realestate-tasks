"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Priority, Project, Task, TaskStatus } from "@prisma/client";
import {
  Calendar,
  Flag,
  Folder,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  moveTaskStatus,
  updateTask,
} from "@/app/actions";

const columns: { status: TaskStatus; label: string; hint: string }[] = [
  { status: "TODO", label: "To do", hint: "New and unstarted" },
  { status: "IN_PROGRESS", label: "In progress", hint: "Active work" },
  { status: "DONE", label: "Done", hint: "Completed" },
];

function priorityLabel(p: Priority) {
  switch (p) {
    case "LOW":
      return "Low";
    case "HIGH":
      return "High";
    default:
      return "Medium";
  }
}

function priorityClass(p: Priority) {
  switch (p) {
    case "LOW":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "HIGH":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  }
}

function formatDue(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(d);
}

type TaskWithProject = Task & { project: Project | null };

export function TaskBoard({
  initialTasks,
  projects,
}: {
  initialTasks: TaskWithProject[];
  projects: Project[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithProject[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const t of tasks) {
      map[t.status].push(t);
    }
    for (const k of Object.keys(map) as TaskStatus[]) {
      map[k].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
    }
    return map;
  }, [tasks]);

  function optimisticMove(id: string, status: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t)),
    );
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(() => moveTaskStatus(fd));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-72">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            <Folder className="size-4" aria-hidden />
            Projects
          </h2>
          <ul className="space-y-1 text-sm">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">
                    {p.name}
                  </span>
                </span>
                <form action={deleteProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-md p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete project"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={createProject} className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <label className="sr-only" htmlFor="new-project-name">
              New project name
            </label>
            <input
              id="new-project-name"
              name="name"
              placeholder="New project name"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <label className="sr-only" htmlFor="new-project-color">
              Color
            </label>
            <div className="flex gap-2">
              <input
                id="new-project-color"
                name="color"
                type="color"
                defaultValue="#4f46e5"
                className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700"
                title="Project color"
              />
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Plus className="size-4" />
                Add project
              </button>
            </div>
          </form>
        </div>

        <NewTaskPanel projects={projects} />
      </aside>

      <div className="grid min-h-[420px] flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <section
            key={col.status}
            className="flex min-h-0 flex-col rounded-2xl border border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/40"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/task-id");
              if (id) optimisticMove(id, col.status);
            }}
          >
            <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {col.label}
              </h3>
              <p className="text-xs text-zinc-500">{col.hint}</p>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                {byStatus[col.status].length} tasks
              </p>
            </header>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {byStatus[col.status].map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/task-id", task.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="group cursor-grab rounded-xl border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex gap-2">
                    <GripVertical
                      className="mt-0.5 size-4 shrink-0 text-zinc-300 group-hover:text-zinc-400"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h4 className="font-medium leading-snug text-zinc-900 dark:text-zinc-50">
                          {task.title}
                        </h4>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityClass(task.priority)}`}
                        >
                          <Flag className="mr-1 inline size-3 align-text-bottom" />
                          {priorityLabel(task.priority)}
                        </span>
                      </div>
                      {task.notes ? (
                        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {task.notes}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {task.project ? (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: task.project.color }}
                            />
                            {task.project.name}
                          </span>
                        ) : null}
                        {task.dueAt ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            Due {formatDue(task.dueAt)}
                          </span>
                        ) : null}
                      </div>

                      <details className="pt-1 text-sm">
                        <summary className="cursor-pointer text-indigo-600 hover:underline dark:text-indigo-400">
                          Edit
                        </summary>
                        <form
                          action={updateTask}
                          className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950"
                        >
                          <input type="hidden" name="id" value={task.id} />
                          <label className="block text-xs font-medium text-zinc-500">
                            Title
                            <input
                              name="title"
                              defaultValue={task.title}
                              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </label>
                          <label className="block text-xs font-medium text-zinc-500">
                            Notes
                            <textarea
                              name="notes"
                              defaultValue={task.notes ?? ""}
                              rows={2}
                              className="mt-1 w-full resize-none rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-xs font-medium text-zinc-500">
                              Status
                              <select
                                name="status"
                                defaultValue={task.status}
                                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                              >
                                <option value="TODO">To do</option>
                                <option value="IN_PROGRESS">In progress</option>
                                <option value="DONE">Done</option>
                              </select>
                            </label>
                            <label className="block text-xs font-medium text-zinc-500">
                              Priority
                              <select
                                name="priority"
                                defaultValue={task.priority}
                                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                              </select>
                            </label>
                          </div>
                          <label className="block text-xs font-medium text-zinc-500">
                            Due date
                            <input
                              type="date"
                              name="dueAt"
                              defaultValue={
                                task.dueAt
                                  ? task.dueAt.toISOString().slice(0, 10)
                                  : ""
                              }
                              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                            />
                          </label>
                          <label className="block text-xs font-medium text-zinc-500">
                            Project
                            <select
                              name="projectId"
                              defaultValue={task.projectId ?? ""}
                              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                            >
                              <option value="">None</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                            >
                              Save
                            </button>
                            <button
                              type="submit"
                              formAction={deleteTask}
                              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-zinc-600 dark:hover:bg-rose-950/40"
                            >
                              Delete
                            </button>
                          </div>
                        </form>
                      </details>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {pending ? (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <Loader2 className="size-4 animate-spin" />
          Saving…
        </div>
      ) : null}
    </div>
  );
}

function NewTaskPanel({ projects }: { projects: Project[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        <Plus className="size-4" aria-hidden />
        New task
      </h2>
      <form action={createTask} className="space-y-3">
        <label className="block text-xs font-medium text-zinc-500">
          Title
          <input
            name="title"
            required
            placeholder="e.g. Review lease draft"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Notes
          <textarea
            name="notes"
            rows={2}
            placeholder="Optional details"
            className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-zinc-500">
            Status
            <select
              name="status"
              defaultValue="TODO"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Priority
            <select
              name="priority"
              defaultValue="MEDIUM"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-500">
          Due date
          <input
            type="date"
            name="dueAt"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Project
          <select
            name="projectId"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add task
        </button>
      </form>
    </div>
  );
}
