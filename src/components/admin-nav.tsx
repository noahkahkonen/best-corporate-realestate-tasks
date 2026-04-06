"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/completed", label: "Completed" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800"
      aria-label="Admin sections"
    >
      {tabs.map(({ href, label }) => {
        const active =
          pathname === href || (href === "/admin/tasks" && pathname === "/admin");
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
