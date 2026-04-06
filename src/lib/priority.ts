/** Task urgency: 1 = lowest, 10 = highest (per assignee queue). */

export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 10;
export const PRIORITY_DEFAULT = 5;

export function clampPriority(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return PRIORITY_DEFAULT;
  return Math.min(
    PRIORITY_MAX,
    Math.max(PRIORITY_MIN, Math.round(n)),
  );
}

export function parsePriorityFromForm(
  v: FormDataEntryValue | null,
): number {
  const n = parseInt(String(v ?? PRIORITY_DEFAULT), 10);
  return clampPriority(n);
}
