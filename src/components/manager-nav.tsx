"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/manager/tasks", label: "Tasks" },
  { href: "/manager/requests", label: "Requests" },
  { href: "/manager/accounts", label: "Accounts" },
] as const;

export function ManagerNav() {
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
      aria-label="Manager sections"
    >
      {tabs.map(({ href, label }) => {
        const active =
          pathname === href || (href === "/manager/tasks" && pathname === "/manager");
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "border-b-2 border-amber-600 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-400 dark:text-amber-100"
                : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
