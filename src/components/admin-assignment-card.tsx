"use client";

import type { ExecutionStatus } from "@prisma/client";
import { formatDue } from "@/lib/format-due";
import {
  executionBadgeStyles,
  executionLabel,
  priorityStyles,
} from "@/lib/manager-task-display";
import {
  adminDeleteAssignedTask,
  adminUpdateExecution,
} from "@/server/workflow-actions";

type Props = {
  taskId: string;
  title: string;
  notes: string | null;
  executionStatus: ExecutionStatus;
  priority: number;
  dueAt: Date | string | null;
  creatorName: string | null;
  projectName: string | null;
  helpNote: string | null;
};

function toDate(d: Date | string | null): Date | null {
  if (d == null) return null;
  return typeof d === "string" ? new Date(d) : d;
}

export function AdminAssignmentCard(props: Props) {
  const dueDate = toDate(props.dueAt);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/90 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            Request
          </p>
          <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-white">
              {props.creatorName ?? "—"}
            </span>
            {props.projectName ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-600"> · </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {props.projectName}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${executionBadgeStyles(props.executionStatus)}`}
        >
          {executionLabel(props.executionStatus)}
        </span>
      </div>

      <div className="px-4 py-3">
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

        <form
          key={`${props.taskId}-exec`}
          action={adminUpdateExecution}
          className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
        >
          <input type="hidden" name="id" value={props.taskId} />
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Your status
            <select
              name="executionStatus"
              defaultValue={props.executionStatus}
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="NOT_STARTED">Not started</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
              <option value="NEEDS_HELP">Needs help</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note (required if requesting help)
            <textarea
              name="helpNote"
              rows={2}
              placeholder="What do you need from a manager?"
              defaultValue={props.helpNote ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Save status
          </button>
        </form>
        <form action={adminDeleteAssignedTask} className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <input type="hidden" name="id" value={props.taskId} />
          <button
            type="submit"
            className="text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
          >
            Delete task
          </button>
        </form>
      </div>
    </div>
  );
}
