"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  countKey: "requests" | "support" | null;
};

const tabs: Tab[] = [
  { href: "/manager/tasks", label: "Tasks", countKey: null },
  { href: "/manager/completed", label: "Completed", countKey: null },
  { href: "/manager/requests", label: "Task requests", countKey: "requests" },
  { href: "/manager/support", label: "Admin support", countKey: "support" },
  { href: "/manager/accounts", label: "Accounts", countKey: null },
];

export function ManagerNav({
  taskRequestCount,
  supportCount,
}: {
  taskRequestCount: number;
  supportCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800"
      aria-label="Manager sections"
    >
      {tabs.map(({ href, label, countKey }) => {
        const active =
          pathname === href ||
          (href === "/manager/tasks" && pathname === "/manager");
        const count =
          countKey === "requests"
            ? taskRequestCount
            : countKey === "support"
              ? supportCount
              : null;
        const aria =
          countKey === "requests"
            ? `${count} pending task request${count === 1 ? "" : "s"}`
            : countKey === "support"
              ? `${count} admin help request${count === 1 ? "" : "s"}`
              : "";

        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "inline-flex items-center gap-2 border-b-2 border-amber-600 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-400 dark:text-amber-100"
                : "inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
            }
          >
            <span>{label}</span>
            {count !== null ? (
              <span
                className={
                  count > 0
                    ? "min-w-[1.375rem] rounded-full bg-amber-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white tabular-nums dark:bg-amber-500"
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
