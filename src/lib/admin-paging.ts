/** How many assignment rows to show per page on admin Tasks / Completed. */
export const ADMIN_TASKS_PER_PAGE = 5;

export function parsePageParam(raw: string | undefined): number {
  const n = parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}
