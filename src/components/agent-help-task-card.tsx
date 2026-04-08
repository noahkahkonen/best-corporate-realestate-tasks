"use client";

import type { HelpMessage, Project, User } from "@prisma/client";
import { formatDue } from "@/lib/format-due";
import { agentReplyToHelp, agentResolveHelp } from "@/server/workflow-actions";

type Msg = HelpMessage & { author: Pick<User, "id" | "name" | "role"> };

type Props = {
  taskId: string;
  title: string;
  notes: string | null;
  priority: number;
  dueAt: Date | null;
  helpNote: string | null;
  assignee: Pick<User, "id" | "name"> | null;
  project: Pick<Project, "name"> | null;
  messagesAsc: Msg[];
};

export function AgentHelpTaskCard(props: Props) {
  const hasLegacyAdminOnly =
    props.messagesAsc.length === 0 &&
    props.helpNote != null &&
    props.helpNote.trim() !== "";

  return (
    <li className="rounded-xl border border-rose-200/90 bg-rose-50/40 p-5 dark:border-rose-900/50 dark:bg-rose-950/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="inline-flex rounded-full bg-rose-600 px-2 py-0.5 text-xs font-medium text-white">
          Needs help
        </span>
        <p className="text-xs text-zinc-500">
          P{props.priority} · Due {formatDue(props.dueAt)}
          {props.project ? ` · ${props.project.name}` : ""}
        </p>
      </div>

      <p className="mt-3 font-medium text-zinc-900 dark:text-white">
        {props.title}
      </p>
      {props.notes ? (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {props.notes}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-500">
        Assigned admin: {props.assignee?.name ?? "—"}
      </p>

      <div className="mt-4 space-y-3 border-t border-rose-200/60 pt-4 dark:border-rose-900/40">
        <p className="text-xs font-semibold tracking-wide text-rose-900 uppercase dark:text-rose-200">
          Messages
        </p>

        {hasLegacyAdminOnly ? (
          <div className="rounded-lg border border-rose-200/80 bg-white/90 px-3 py-2 text-sm text-zinc-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-50">
            <p className="text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-300">
              {props.assignee?.name ?? "Admin"}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{props.helpNote}</p>
          </div>
        ) : null}

        {props.messagesAsc.map((m) => (
          <div
            key={m.id}
            className={
              m.author.role === "AGENT"
                ? "rounded-lg border border-indigo-200/80 bg-indigo-50/90 px-3 py-2 text-sm text-zinc-800 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-50"
                : "rounded-lg border border-rose-200/80 bg-white/90 px-3 py-2 text-sm text-zinc-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-50"
            }
          >
            <p className="text-[10px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              {m.author.role === "AGENT" ? "You" : m.author.name}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            <p className="mt-1 text-[10px] text-zinc-400">
              {m.createdAt.toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        ))}
      </div>

      <form action={agentReplyToHelp} className="mt-4 space-y-2">
        <input type="hidden" name="id" value={props.taskId} />
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Message back
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Reply to the admin…"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Send message
        </button>
      </form>

      <form action={agentResolveHelp} className="mt-4 border-t border-rose-200/60 pt-4 dark:border-rose-900/40">
        <input type="hidden" name="id" value={props.taskId} />
        <button
          type="submit"
          className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
        >
          Resolve & return to in progress
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Marks the issue handled and moves the admin&apos;s task back to{" "}
          <span className="font-medium">In progress</span>.
        </p>
      </form>
    </li>
  );
}
