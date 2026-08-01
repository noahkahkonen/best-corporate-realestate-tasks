"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/tasks", label: "Tasks", badgeKey: "help" },
  { href: "/admin/completed", label: "Completed", badgeKey: null },
  { href: "/admin/drone-shots", label: "Drone Shots", badgeKey: "drone" },
] as const;

type Props = {
  agentReplyUnread?: number;
  droneCount?: number;
};

export function AdminNav({ agentReplyUnread = 0, droneCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800"
      aria-label="Admin sections"
    >
      {tabs.map(({ href, label, badgeKey }) => {
        const active =
          pathname === href || (href === "/admin/tasks" && pathname === "/admin");
        const count = badgeKey === "help" ? agentReplyUnread : badgeKey === "drone" ? droneCount : 0;
        const badge = badgeKey && count > 0 ? count : null;
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "inline-flex items-center gap-2 border-b-2 border-emerald-600 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-400 dark:text-emerald-100"
                : "inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
            }
          >
            <span>{label}</span>
            {badge !== null ? (
              <span
                className="min-w-[1.375rem] rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white tabular-nums dark:bg-rose-500"
                aria-label={
                  badgeKey === "drone"
                    ? `${badge} drone shoot${badge === 1 ? "" : "s"} outstanding`
                    : `${badge} new agent repl${badge === 1 ? "y" : "ies"} in help threads`
                }
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
