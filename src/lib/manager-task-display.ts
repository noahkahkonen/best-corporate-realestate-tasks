import type { ExecutionStatus } from "@prisma/client";

export function executionLabel(s: ExecutionStatus): string {
  return s.replace(/_/g, " ");
}

/** Visual weight by numeric priority (1–10). */
export function priorityStyles(p: number): string {
  const n = Math.min(10, Math.max(1, Math.round(p)));
  if (n <= 4) {
    return "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100";
  }
  if (n <= 7) {
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100";
  }
  return "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100";
}

export function executionBadgeStyles(s: ExecutionStatus): string {
  switch (s) {
    case "DONE":
      return "bg-emerald-100 text-emerald-900 ring-emerald-300/70 dark:bg-emerald-950/90 dark:text-emerald-50 dark:ring-emerald-700/60";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-900 ring-sky-300/70 dark:bg-sky-950/90 dark:text-sky-50 dark:ring-sky-700/60";
    case "NEEDS_HELP":
      return "bg-rose-100 text-rose-900 ring-rose-300/70 dark:bg-rose-950/90 dark:text-rose-50 dark:ring-rose-700/60";
    case "NOT_STARTED":
    default:
      return "bg-zinc-200 text-zinc-900 ring-zinc-400/50 dark:bg-zinc-700 dark:text-zinc-100 dark:ring-zinc-500/50";
  }
}
