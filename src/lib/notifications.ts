import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatDue } from "@/lib/format-due";

/**
 * Notification triggers for the request → review → execution workflow.
 *
 * Each function re-reads what it needs by id rather than taking it from the
 * caller, because these run inside `after()` once the mutation has committed.
 * All of them are best-effort: `sendEmail` never throws, and a task that has
 * been deleted or reassigned in the meantime simply produces no mail.
 */

function taskFacts(task: {
  priority: number;
  dueAt: Date | null;
  project?: { name: string } | null;
}): string {
  const parts = [`Priority ${task.priority} of 10`, `due ${formatDue(task.dueAt)}`];
  if (task.project?.name) parts.push(`project ${task.project.name}`);
  return `${parts.join(" · ")}.`;
}

async function managerEmails(): Promise<string[]> {
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    select: { email: true },
  });
  return managers.map((m) => m.email);
}

/** Agent submitted or resubmitted a request — the manager review queue has work. */
export async function notifyManagersOfRequest(
  taskId: string,
  kind: "new" | "resubmitted",
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { creator: true, project: true },
  });
  if (!task) return;

  const to = await managerEmails();
  const who = task.creator?.name ?? "An agent";
  const verb = kind === "new" ? "submitted a new request" : "resubmitted a request";

  await sendEmail(to, {
    subject:
      kind === "new"
        ? `New request: ${task.title}`
        : `Resubmitted request: ${task.title}`,
    heading: task.title,
    body: [
      `${who} ${verb} for review.`,
      taskFacts(task),
    ],
    quote: task.notes,
    link: { label: "Review request", path: "/manager/requests" },
  });
}

/** Agent asked for completed work to be reopened. */
export async function notifyManagersOfRedoRequest(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { creator: true, project: true },
  });
  if (!task) return;

  const to = await managerEmails();
  const who = task.creator?.name ?? "An agent";

  await sendEmail(to, {
    subject: `Revision requested: ${task.title}`,
    heading: task.title,
    body: [
      `${who} asked to reopen this completed task.`,
      taskFacts(task),
    ],
    quote: task.redoRequestNote,
    link: { label: "Review revision request", path: "/manager/requests" },
  });
}

/** Task approved and assigned, or created already-assigned by a manager. */
export async function notifyAdminOfAssignment(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, creator: true, project: true },
  });
  if (!task?.assignee) return;

  const assignedBy = task.creator?.name;

  await sendEmail([task.assignee.email], {
    subject: `New task assigned: ${task.title}`,
    heading: task.title,
    body: [
      assignedBy
        ? `${assignedBy} assigned this task to you.`
        : "This task has been assigned to you.",
      taskFacts(task),
    ],
    quote: task.notes,
    link: { label: "Open task", path: "/admin/tasks" },
  });
}

/** Manager responded to a request without approving it — the agent should hear why. */
export async function notifyAgentOfManagerResponse(
  taskId: string,
  kind: "changes" | "denied",
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { creator: true },
  });
  if (!task?.creator) return;

  await sendEmail([task.creator.email], {
    subject:
      kind === "changes"
        ? `Changes requested: ${task.title}`
        : `Request denied: ${task.title}`,
    heading: task.title,
    body: [
      kind === "changes"
        ? "Your manager reviewed this request and asked for changes before it can be approved."
        : "Your manager reviewed this request and denied it.",
    ],
    quote: task.managerNote,
    link:
      kind === "changes"
        ? { label: "Revise and resubmit", path: "/agent/revisions" }
        : { label: "View your requests", path: "/agent/requests" },
  });
}

/** Admin flagged NEEDS_HELP — the agent who requested the work should weigh in. */
export async function notifyAgentOfHelpRequest(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { creator: true, assignee: true },
  });
  if (!task?.creator) return;

  const who = task.assignee?.name ?? "The assigned admin";

  await sendEmail([task.creator.email], {
    subject: `Help needed: ${task.title}`,
    heading: task.title,
    body: [`${who} needs help with your request and is waiting on your reply.`],
    quote: task.helpNote,
    link: { label: "Reply in help thread", path: "/agent/help" },
  });
}

/** Agent replied in the help thread — the assigned admin is unblocked. */
export async function notifyAdminOfHelpReply(
  taskId: string,
  body: string,
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { creator: true, assignee: true },
  });
  if (!task?.assignee) return;

  const who = task.creator?.name ?? "The agent";

  await sendEmail([task.assignee.email], {
    subject: `Reply on: ${task.title}`,
    heading: task.title,
    body: [`${who} replied to your help request.`],
    quote: body,
    link: { label: "Open help thread", path: "/admin/tasks" },
  });
}
