"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDue, formatDateTime } from "@/lib/format-due";
import {
  managerApprove,
  managerDeleteTask,
  managerDeny,
  managerRequestChanges,
} from "@/server/workflow-actions";
import { PrioritySelect } from "@/components/priority-select";

export type PendingTaskPayload = {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  dueAt: string | null;
  projectName: string | null;
  agentName: string | null;
  agentEmail: string | null;
  createdAt: string;
  updatedAt: string;
  isRedoRequest: boolean;
  redoRequestNote: string | null;
};

type AdminOption = { id: string; name: string };

type Action = "approve" | "changes" | "reject" | null;

export function ManagerPendingRequestCard({
  task,
  admins,
}: {
  task: PendingTaskPayload;
  admins: AdminOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState<Action>(null);

  const dueDate = task.dueAt ? new Date(task.dueAt) : null;

  function pickAction(next: Exclude<Action, null>) {
    setAction((a) => (a === next ? null : next));
  }

  return (
    <li className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80">
      <button
        type="button"
        onClick={() => {
          setExpanded((e) => !e);
          if (expanded) setAction(null);
        }}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 text-zinc-400">
          {expanded ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-zinc-900 dark:text-white">
              {task.title}
            </span>
            {task.isRedoRequest ? (
              <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-rose-700">
                Redo
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            <span className="text-zinc-700 dark:text-zinc-300">
              {task.agentName ?? "Unknown"}
            </span>
            {" · "}
            P{task.priority} · Due {formatDue(dueDate)}
            {task.projectName ? ` · ${task.projectName}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {expanded ? "Hide" : "Details"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="space-y-2 px-3 pb-2 pl-10 pt-1 text-sm">
            {task.agentEmail ? (
              <p className="text-xs text-zinc-500">{task.agentEmail}</p>
            ) : null}
            <p className="text-xs text-zinc-500">
              Submitted {formatDateTime(new Date(task.createdAt))} · Updated{" "}
              {formatDateTime(new Date(task.updatedAt))}
            </p>
            {task.isRedoRequest ? (
              <div className="rounded-md border border-rose-200 bg-rose-50/90 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Agent redo request
                </p>
                {task.redoRequestNote ? (
                  <p className="mt-1 whitespace-pre-wrap">{task.redoRequestNote}</p>
                ) : (
                  <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
                    (No note provided)
                  </p>
                )}
              </div>
            ) : null}
            {task.notes ? (
              <div className="rounded-md border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Details
                </p>
                <p className="mt-1 whitespace-pre-wrap">{task.notes}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No extra details.</p>
            )}
            <form action={managerDeleteTask}>
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
              >
                Delete request
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 bg-zinc-50/80 px-3 py-2.5 pl-10 dark:border-zinc-800 dark:bg-zinc-900/40">
            <span className="mr-1 self-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Decision
            </span>
            <button
              type="button"
              onClick={() => pickAction("approve")}
              className={
                action === "approve"
                  ? "rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                  : "rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/80"
              }
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => pickAction("changes")}
              className={
                action === "changes"
                  ? "rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                  : "rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/70"
              }
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={() => pickAction("reject")}
              className={
                action === "reject"
                  ? "rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                  : "rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/70"
              }
            >
              Reject
            </button>
          </div>

          {action === "approve" ? (
            <form
              key={`approve-${task.id}`}
              action={managerApprove}
              className="space-y-3 border-t border-emerald-200/60 bg-emerald-50/40 px-3 py-3 pl-10 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            >
              <input type="hidden" name="id" value={task.id} />
              <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                Assign and set final priority &amp; due
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Admin
                  <select
                    name="assignedToId"
                    required
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="">Select…</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Priority (1–10)
                  <PrioritySelect
                    name="priority"
                    defaultValue={task.priority}
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Due
                  <input
                    type="date"
                    name="dueAt"
                    defaultValue={
                      task.dueAt ? task.dueAt.slice(0, 10) : ""
                    }
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Confirm approval
              </button>
            </form>
          ) : null}

          {action === "changes" ? (
            <form
              key={`changes-${task.id}`}
              action={managerRequestChanges}
              className="space-y-2 border-t border-amber-200/60 bg-amber-50/40 px-3 py-3 pl-10 dark:border-amber-900/40 dark:bg-amber-950/20"
            >
              <input type="hidden" name="id" value={task.id} />
              <label className="block text-xs font-medium text-amber-950 dark:text-amber-100">
                What should the agent change?
                <textarea
                  name="managerNote"
                  required
                  rows={3}
                  placeholder="Be specific so they can resubmit quickly…"
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
              >
                Send back to agent
              </button>
            </form>
          ) : null}

          {action === "reject" ? (
            <form
              key={`reject-${task.id}`}
              action={managerDeny}
              className="space-y-2 border-t border-rose-200/60 bg-rose-50/40 px-3 py-3 pl-10 dark:border-rose-900/40 dark:bg-rose-950/20"
            >
              <input type="hidden" name="id" value={task.id} />
              <label className="block text-xs font-medium text-rose-900 dark:text-rose-100">
                Reason for rejection
                <textarea
                  name="managerNote"
                  required
                  rows={3}
                  placeholder="Required — explain why this request is denied…"
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
              >
                Confirm rejection
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
