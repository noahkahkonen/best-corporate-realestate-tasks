import type { HelpMessage, Task } from "@prisma/client";

export type TaskWithLastMessage = Pick<
  Task,
  "creatorId" | "assignedToId" | "helpNote" | "executionStatus"
> & {
  helpMessages: Pick<HelpMessage, "authorId">[];
};

/** Last speaker is admin (assignee) — agent should respond. */
export function helpThreadNeedsAgentReply(
  t: TaskWithLastMessage | null | undefined,
): boolean {
  if (!t || t.executionStatus !== "NEEDS_HELP") return false;
  const last = t.helpMessages[0];
  if (last) return last.authorId === t.assignedToId;
  return Boolean(t.helpNote?.trim());
}

/** Last speaker is agent (creator) — admin should read the reply. */
export function helpThreadHasUnreadAgentReplyForAdmin(
  t: TaskWithLastMessage | null | undefined,
): boolean {
  if (!t || t.executionStatus !== "NEEDS_HELP") return false;
  const last = t.helpMessages[0];
  if (last) return last.authorId === t.creatorId;
  return false;
}
