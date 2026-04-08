"use server";

import { revalidatePath } from "next/cache";
import type { ExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { parsePriorityFromForm } from "@/lib/priority";

const paths = ["/agent", "/agent/help", "/manager", "/admin"];

function revalidateAll() {
  for (const p of paths) revalidatePath(p, "layout");
}

function parseOptionalDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Agent: submit a new task request for manager review */
export async function createTaskRequest(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const projectIdRaw = formData.get("projectId");
  const projectId =
    projectIdRaw && String(projectIdRaw) !== "" ? String(projectIdRaw) : null;

  await prisma.task.create({
    data: {
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      priority: parsePriorityFromForm(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      creatorId: session.user.id,
      reviewStatus: "PENDING_REVIEW",
      executionStatus: "NOT_STARTED",
      projectId,
    },
  });
  revalidateAll();
}

/** Agent: ask manager to reopen completed work (shows as redo in manager queue) */
export async function agentRequestRedo(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const id = String(formData.get("id") ?? "").trim();
  const redoRequestNote = String(formData.get("redoRequestNote") ?? "").trim();
  if (!id || !redoRequestNote) return;

  const task = await prisma.task.findFirst({
    where: { id, creatorId: session.user.id },
  });
  if (!task || task.reviewStatus !== "APPROVED" || task.executionStatus !== "DONE")
    return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "PENDING_REVIEW",
      isRedoRequest: true,
      redoRequestNote,
      executionStatus: "NOT_STARTED",
      helpNote: null,
      managerNote: null,
    },
  });
  revalidateAll();
}

/** Agent: edit and resubmit after manager asked for changes */
export async function resubmitTaskRequest(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const task = await prisma.task.findFirst({
    where: { id, creatorId: session.user.id },
  });
  if (!task || task.reviewStatus !== "CHANGES_REQUESTED") return;

  const title = String(formData.get("title") ?? "").trim();
  await prisma.task.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      notes: String(formData.get("notes") ?? "").trim() || null,
      priority: parsePriorityFromForm(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      reviewStatus: "PENDING_REVIEW",
      managerNote: null,
    },
  });
  revalidateAll();
}

function agentMayDeleteOwnTask(task: {
  reviewStatus: string;
  executionStatus: string;
}): boolean {
  if (task.reviewStatus === "APPROVED") {
    return task.executionStatus === "DONE";
  }
  if (
    task.reviewStatus === "PENDING_REVIEW" ||
    task.reviewStatus === "CHANGES_REQUESTED" ||
    task.reviewStatus === "DENIED"
  ) {
    return true;
  }
  return false;
}

/** Agent: delete own task (pending/changes/denied, or completed approved work) */
export async function deleteMyTaskRequest(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const task = await prisma.task.findFirst({
    where: { id, creatorId: session.user.id },
  });
  if (!task || !agentMayDeleteOwnTask(task)) return;

  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

/** Manager: delete any task */
export async function managerDeleteTask(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

/** Admin: delete a task assigned to you */
export async function adminDeleteAssignedTask(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const task = await prisma.task.findFirst({
    where: { id, assignedToId: session.user.id },
  });
  if (!task) return;
  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

export async function createProject(formData: FormData) {
  const session = await requireRole(["AGENT", "MANAGER"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const color = String(formData.get("color") ?? "").trim() || "#4f46e5";
  await prisma.project.create({ data: { name, color } });
  revalidateAll();
}

/** Manager: create an approved task assigned directly to an admin (no agent review step) */
export async function managerCreateApprovedTask(formData: FormData) {
  const session = await requireRole(["MANAGER"]);
  const title = String(formData.get("title") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();
  if (!title || !assignedToId) return;

  const adminUser = await prisma.user.findFirst({
    where: { id: assignedToId, role: "ADMIN" },
  });
  if (!adminUser) return;

  const projectIdRaw = formData.get("projectId");
  const projectId =
    projectIdRaw && String(projectIdRaw) !== "" ? String(projectIdRaw) : null;
  if (projectId) {
    const p = await prisma.project.findUnique({ where: { id: projectId } });
    if (!p) return;
  }

  await prisma.task.create({
    data: {
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      priority: parsePriorityFromForm(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      creatorId: session.user.id,
      assignedToId,
      projectId,
      reviewStatus: "APPROVED",
      executionStatus: "NOT_STARTED",
    },
  });
  revalidateAll();
}

/** Pending review queue is only for tasks submitted by agents */
async function pendingAgentTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { creator: true },
  });
  if (!task || task.reviewStatus !== "PENDING_REVIEW") return null;
  if (!task.creatorId || task.creator?.role !== "AGENT") return null;
  return task;
}

/** Manager: approve and assign to an admin */
export async function managerApprove(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();
  if (!id || !assignedToId) return;

  const existing = await pendingAgentTask(id);
  if (!existing) return;

  const adminUser = await prisma.user.findFirst({
    where: { id: assignedToId, role: "ADMIN" },
  });
  if (!adminUser) return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "APPROVED",
      assignedToId,
      priority: parsePriorityFromForm(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      executionStatus: "NOT_STARTED",
      managerNote: null,
      isRedoRequest: false,
      redoRequestNote: null,
    },
  });
  revalidateAll();
}

/** Manager: ask agent to revise */
export async function managerRequestChanges(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const managerNote = String(formData.get("managerNote") ?? "").trim();
  if (!id || !managerNote) return;

  const existing = await pendingAgentTask(id);
  if (!existing) return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "CHANGES_REQUESTED",
      managerNote,
      executionStatus: "NOT_STARTED",
      isRedoRequest: false,
      redoRequestNote: null,
    },
  });
  revalidateAll();
}

/** Manager: deny request */
export async function managerDeny(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const managerNote = String(formData.get("managerNote") ?? "").trim();
  if (!id || !managerNote) return;

  const existing = await pendingAgentTask(id);
  if (!existing) return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "DENIED",
      managerNote,
      executionStatus: "NOT_STARTED",
      isRedoRequest: false,
      redoRequestNote: null,
    },
  });
  revalidateAll();
}

/** Manager: update assignment / priority on approved work */
export async function managerUpdateAssignment(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.reviewStatus !== "APPROVED") return;

  if (assignedToId) {
    const adminUser = await prisma.user.findFirst({
      where: { id: assignedToId, role: "ADMIN" },
    });
    if (!adminUser) return;
  }

  await prisma.task.update({
    where: { id },
    data: {
      ...(assignedToId ? { assignedToId } : {}),
      priority: parsePriorityFromForm(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
    },
  });
  revalidateAll();
}

/** Manager: clear NEEDS_HELP and return work to in progress for the assigned admin */
export async function managerResolveHelpRequest(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.reviewStatus !== "APPROVED") return;
  if (task.executionStatus !== "NEEDS_HELP") return;

  await prisma.$transaction([
    prisma.helpMessage.deleteMany({ where: { taskId: id } }),
    prisma.task.update({
      where: { id },
      data: {
        executionStatus: "IN_PROGRESS",
        helpNote: null,
      },
    }),
  ]);
  revalidateAll();
}

/** Agent: reply in the help thread while the task is NEEDS_HELP */
export async function agentReplyToHelp(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const id = String(formData.get("id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !body) return;

  const task = await prisma.task.findFirst({
    where: {
      id,
      creatorId: session.user.id,
      reviewStatus: "APPROVED",
      executionStatus: "NEEDS_HELP",
    },
  });
  if (!task) return;

  await prisma.helpMessage.create({
    data: {
      taskId: id,
      authorId: session.user.id,
      body,
    },
  });
  revalidateAll();
}

/** Agent: problem solved — return the assigned admin to in progress */
export async function agentResolveHelp(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const task = await prisma.task.findFirst({
    where: {
      id,
      creatorId: session.user.id,
      reviewStatus: "APPROVED",
      executionStatus: "NEEDS_HELP",
    },
  });
  if (!task) return;

  await prisma.$transaction([
    prisma.helpMessage.deleteMany({ where: { taskId: id } }),
    prisma.task.update({
      where: { id },
      data: {
        executionStatus: "IN_PROGRESS",
        helpNote: null,
      },
    }),
  ]);
  revalidateAll();
}

/** Admin: report execution status */
export async function adminUpdateExecution(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const task = await prisma.task.findFirst({
    where: { id, assignedToId: session.user.id },
  });
  if (!task || task.reviewStatus !== "APPROVED") return;

  const executionStatus = String(
    formData.get("executionStatus") ?? "",
  ) as ExecutionStatus;
  const allowed: ExecutionStatus[] = [
    "NOT_STARTED",
    "IN_PROGRESS",
    "DONE",
    "NEEDS_HELP",
  ];
  if (!allowed.includes(executionStatus)) return;

  const helpNote =
    executionStatus === "NEEDS_HELP"
      ? String(formData.get("helpNote") ?? "").trim() || null
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data: {
        executionStatus,
        helpNote,
      },
    });

    if (executionStatus === "NEEDS_HELP" && helpNote) {
      await tx.helpMessage.create({
        data: {
          taskId: id,
          authorId: session.user.id,
          body: helpNote,
        },
      });
    }
  });
  revalidateAll();
}
