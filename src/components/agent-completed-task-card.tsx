"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDue } from "@/lib/format-due";
import { agentRequestRedo } from "@/server/workflow-actions";

export type CompletedTaskPayload = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  projectName: string | null;
  assigneeName: string | null;
};

export function AgentCompletedTaskCard({ task }: { task: CompletedTaskPayload }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;

  return (
    <li className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
        aria-expanded={open}
      >
        <span className="mt-0.5 text-zinc-400">
          {open ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-900 dark:text-white">
            {task.title}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {task.assigneeName ?? "Admin"} · Due {formatDue(dueDate)}
            {task.projectName ? ` · ${task.projectName}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">
          Done
        </span>
      </button>

      {open ? (
        <div className="border-t border-zinc-100 px-3 pb-3 pl-10 pt-2 dark:border-zinc-800">
          {task.notes ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{task.notes}</p>
          ) : null}
          <form
            action={async (fd) => {
              await agentRequestRedo(fd);
              setOpen(false);
              router.refresh();
            }}
            className="mt-3 space-y-2"
          >
            <input type="hidden" name="id" value={task.id} />
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Ask your manager to redo this work
              <textarea
                name="redoRequestNote"
                required
                rows={3}
                placeholder="Explain what needs to be done again or what changed…"
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <p className="text-xs text-zinc-500">
              This sends the request back to your manager as a{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                redo
              </span>
              — they will see it on Task requests.
            </p>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Submit redo request
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
