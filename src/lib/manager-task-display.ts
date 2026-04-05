import type { ExecutionStatus, Priority } from "@prisma/client";

export function executionLabel(s: ExecutionStatus): string {
  return s.replace(/_/g, " ");
}

export function priorityStyles(p: Priority): string {
  switch (p) {
    case "HIGH":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100";
    case "MEDIUM":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100";
    case "LOW":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
    default:
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
  }
}

export function executionBadgeStyles(s: ExecutionStatus): string {
  switch (s) {
    case "DONE":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-100";
    case "NEEDS_HELP":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100";
    case "NOT_STARTED":
    default:
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200";
  }
}
