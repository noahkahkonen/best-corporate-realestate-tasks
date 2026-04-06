"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExecutionStatus } from "@prisma/client";
import { formatDue } from "@/lib/format-due";
import {
  executionBadgeStyles,
  executionLabel,
  priorityStyles,
} from "@/lib/manager-task-display";
import {
  managerDeleteTask,
  managerUpdateAssignment,
} from "@/server/workflow-actions";
import { PrioritySelect } from "@/components/priority-select";

export type AdminOption = { id: string; name: string };

type Props = {
  taskId: string;
  creatorName: string | null;
  assigneeName: string | null;
  projectName: string | null;
  title: string;
  notes: string | null;
  executionStatus: ExecutionStatus;
  priority: number;
  /** Serialized across the server/client boundary as ISO string when needed */
  dueAt: Date | string | null;
  assignedToId: string | null;
  admins: AdminOption[];
};

function toDate(d: Date | string | null): Date | null {
  if (d == null) return null;
  return typeof d === "string" ? new Date(d) : d;
}

export function ManagerActiveAssignmentCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const dueDate = toDate(props.dueAt);
  const dueInputValue = dueDate
    ? dueDate.toISOString().slice(0, 10)
    : "";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/90 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            Request &amp; assignee
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-white">
              {props.creatorName ?? "Unknown agent"}
            </span>
            <span className="text-zinc-400">→</span>
            <span>{props.assigneeName ?? "Unassigned"}</span>
            {props.projectName ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {props.projectName}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${executionBadgeStyles(props.executionStatus)}`}
        >
          {executionLabel(props.executionStatus)}
        </span>
      </div>

      <div className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
              {props.title}
            </h4>
            {props.notes ? (
              <p className="mt-1.5 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                {props.notes}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 font-medium ${priorityStyles(props.priority)}`}
              >
                P{props.priority}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                Due {formatDue(dueDate)}
              </span>
            </div>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Update assignment
          </p>
          <form
            key={`${props.taskId}-${dueInputValue}-${props.assignedToId ?? ""}-${props.priority}`}
            action={async (formData) => {
              await managerUpdateAssignment(formData);
              setEditing(false);
              router.refresh();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={props.taskId} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Assign to
                <select
                  name="assignedToId"
                  defaultValue={props.assignedToId ?? ""}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">Keep current</option>
                  {props.admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Priority (1–10)
                <PrioritySelect
                  name="priority"
                  defaultValue={props.priority}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Due date
                <input
                  type="date"
                  name="dueAt"
                  defaultValue={dueInputValue}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <form
        action={managerDeleteTask}
        className="border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800"
      >
        <input type="hidden" name="id" value={props.taskId} />
        <button
          type="submit"
          className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
        >
          Delete task
        </button>
      </form>
    </div>
  );
}
