"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  countKey: "pending" | "tasks" | "help" | "revisions" | null;
};

const tabs: Tab[] = [
  { href: "/agent/requests", label: "Your requests", countKey: "pending" },
  { href: "/agent/tasks", label: "Current tasks", countKey: "tasks" },
  { href: "/agent/completed", label: "Completed", countKey: null },
  { href: "/agent/help", label: "Help", countKey: "help" },
  { href: "/agent/revisions", label: "Revisions", countKey: "revisions" },
];

type Props = {
  pendingCount: number;
  tasksCount: number;
  helpCount: number;
  revisionsCount: number;
};

export function AgentNav({
  pendingCount,
  tasksCount,
  helpCount,
  revisionsCount,
}: Props) {
  const pathname = usePathname();

  const countFor = (key: Tab["countKey"]) => {
    if (key === "pending") return pendingCount;
    if (key === "tasks") return tasksCount;
    if (key === "help") return helpCount;
    if (key === "revisions") return revisionsCount;
    return null;
  };

  return (
    <nav
      className="-mb-px flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800"
      aria-label="Agent sections"
    >
      {tabs.map(({ href, label, countKey }) => {
        const active =
          pathname === href ||
          (href === "/agent/requests" && pathname === "/agent");
        const count = countFor(countKey);
        const aria =
          countKey === "pending"
            ? `${count} pending request${count === 1 ? "" : "s"}`
            : countKey === "tasks"
              ? `${count} current task${count === 1 ? "" : "s"}`
              : countKey === "help"
                ? `${count} help request${count === 1 ? "" : "s"} awaiting your reply`
                : `${count} revision${count === 1 ? "" : "s"}`;

        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "inline-flex items-center gap-2 border-b-2 border-indigo-600 px-4 py-3 text-sm font-medium text-indigo-800 dark:border-indigo-400 dark:text-indigo-100"
                : "inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
            }
          >
            <span>{label}</span>
            {count !== null ? (
              <span
                className={
                  count > 0
                    ? "min-w-[1.375rem] rounded-full bg-indigo-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white tabular-nums dark:bg-indigo-500"
                    : "min-w-[1.375rem] rounded-full bg-zinc-200 px-1.5 py-0.5 text-center text-xs font-medium text-zinc-600 tabular-nums dark:bg-zinc-700 dark:text-zinc-400"
                }
                aria-label={aria}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
