"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ExecutionStatus, Role } from "@prisma/client";
import { formatDue } from "@/lib/format-due";
import { priorityStyles } from "@/lib/manager-task-display";
import { adminUpdateExecution } from "@/server/workflow-actions";

type HelpMsg = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string; role: Role };
};

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
  helpMessages?: HelpMsg[];
};

function toDate(d: Date | string | null): Date | null {
  if (d == null) return null;
  return typeof d === "string" ? new Date(d) : d;
}

export function AdminAssignmentCard(props: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const dueDate = toDate(props.dueAt);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>(
    props.executionStatus,
  );
  const [showHelp, setShowHelp] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusLocked = props.executionStatus === "NEEDS_HELP";

  useEffect(() => {
    setExecutionStatus(props.executionStatus);
  }, [props.executionStatus]);

  useEffect(() => {
    if (props.executionStatus === "NEEDS_HELP") {
      setShowHelp(false);
    }
  }, [props.executionStatus]);

  function submitForm() {
    queueMicrotask(() => formRef.current?.requestSubmit());
  }

  function cancelHelp() {
    setHelpError(null);
    setShowHelp(false);
    setExecutionStatus(props.executionStatus);
  }

  function sendHelp() {
    setHelpError(null);
    const form = formRef.current;
    if (!form) return;
    const ta = form.querySelector<HTMLTextAreaElement>(
      'textarea[name="helpNote"]',
    );
    const note = (ta?.value ?? "").trim();
    if (!note) {
      setHelpError("Add a short note for your manager.");
      return;
    }
    const fd = new FormData(form);
    fd.set("executionStatus", "NEEDS_HELP");
    fd.set("helpNote", note);
    startTransition(() => {
      void adminUpdateExecution(fd).then(() => {
        setExecutionStatus("NEEDS_HELP");
        setShowHelp(false);
      });
    });
  }

  return (
    <form
      ref={formRef}
      action={adminUpdateExecution}
      key={props.taskId}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none"
    >
      <input type="hidden" name="id" value={props.taskId} />

      <div className="flex items-start gap-3 border-b border-zinc-100 bg-zinc-50/90 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
        <span
          className={`inline-flex shrink-0 self-start rounded-md px-2 py-1 text-xs font-semibold ${priorityStyles(props.priority)}`}
        >
          P{props.priority}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
            From (Agent)
          </p>
          <p className="mt-0.5 text-xs leading-tight text-zinc-700 dark:text-zinc-300">
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
          <h4 className="mt-1.5 text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
            {props.title}
          </h4>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <p className="text-[11px] whitespace-nowrap text-zinc-500 dark:text-zinc-400">
            Due {formatDue(dueDate)}
          </p>
          <label className="sr-only" htmlFor={`status-${props.taskId}`}>
            Status
          </label>
          <select
            id={`status-${props.taskId}`}
            name="executionStatus"
            value={executionStatus}
            disabled={statusLocked}
            title={
              statusLocked
                ? "Status is locked until an agent resolves this help request."
                : undefined
            }
            onChange={(e) => {
              const v = e.target.value as ExecutionStatus;
              setExecutionStatus(v);
              setHelpError(null);
              if (v === "NEEDS_HELP") {
                setShowHelp(true);
                return;
              }
              submitForm();
            }}
            className="max-w-[11rem] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:opacity-60"
          >
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
            <option value="NEEDS_HELP">Needs help</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 py-2">
        {props.notes ? (
          <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
            {props.notes}
          </p>
        ) : null}

        {statusLocked &&
        (props.helpMessages?.length || props.helpNote?.trim()) ? (
          <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              Help thread
            </p>
            {props.helpMessages && props.helpMessages.length > 0 ? (
              <ul className="space-y-2">
                {props.helpMessages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      m.author.role === "AGENT"
                        ? "rounded-md border border-indigo-200/80 bg-indigo-50/80 px-2 py-1.5 text-xs text-zinc-800 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-50"
                        : "rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2 py-1.5 text-xs text-zinc-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-50"
                    }
                  >
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                      {m.author.role === "AGENT"
                        ? `Agent (${m.author.name})`
                        : `You (${m.author.name})`}
                    </span>
                    <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ul>
            ) : props.helpNote?.trim() ? (
              <p className="rounded-md border border-emerald-200/80 bg-emerald-50/80 px-2 py-1.5 text-xs text-zinc-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-50">
                <span className="font-medium">You</span>
                <span className="mt-0.5 block whitespace-pre-wrap">
                  {props.helpNote}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {showHelp ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Note to Agent
              <textarea
                name="helpNote"
                rows={3}
                placeholder="What do you need from the agent?"
                defaultValue={props.helpNote ?? ""}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs leading-snug dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            {helpError ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {helpError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelHelp}
                disabled={isPending}
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendHelp}
                disabled={isPending}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
              >
                {isPending ? "Sending…" : "Send help"}
              </button>
            </div>
          </div>
        ) : statusLocked ? (
          <p className="pt-1 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
            Needs help — awaiting agent on their portal.
          </p>
        ) : (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setHelpError(null);
                setShowHelp(true);
              }}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500"
            >
              Get Help
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
