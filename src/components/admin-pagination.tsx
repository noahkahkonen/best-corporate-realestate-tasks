import Link from "next/link";
import { ADMIN_TASKS_PER_PAGE } from "@/lib/admin-paging";

type Props = {
  pathname: string;
  page: number;
  total: number;
  pageSize?: number;
};

export function AdminPagination({
  pathname,
  page,
  total,
  pageSize = ADMIN_TASKS_PER_PAGE,
}: Props) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize + 1;
  const end = Math.min(p * pageSize, total);

  const hrefFor = (next: number) =>
    next <= 1 ? pathname : `${pathname}?page=${next}`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
      <p>
        Showing{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-200">
          {start}–{end}
        </span>{" "}
        of{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-200">
          {total}
        </span>
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {p > 1 ? (
            <Link
              href={hrefFor(p - 1)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg px-3 py-1.5 text-sm text-zinc-400">
              Previous
            </span>
          )}
          <span className="text-xs tabular-nums text-zinc-500">
            Page {p} / {totalPages}
          </span>
          {p < totalPages ? (
            <Link
              href={hrefFor(p + 1)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg px-3 py-1.5 text-sm text-zinc-400">
              Next
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
