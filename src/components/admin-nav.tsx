"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/tasks", label: "Tasks", showAgentBadge: true },
  { href: "/admin/completed", label: "Completed", showAgentBadge: false },
] as const;

type Props = {
  agentReplyUnread?: number;
};

export function AdminNav({ agentReplyUnread = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800"
      aria-label="Admin sections"
    >
      {tabs.map(({ href, label, showAgentBadge }) => {
        const active =
          pathname === href || (href === "/admin/tasks" && pathname === "/admin");
        const badge =
          showAgentBadge && agentReplyUnread > 0 ? agentReplyUnread : null;
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
                aria-label={`${badge} new agent repl${badge === 1 ? "y" : "ies"} in help threads`}
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
