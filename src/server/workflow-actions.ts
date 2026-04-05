"use server";

import { revalidatePath } from "next/cache";
import type { ExecutionStatus, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const paths = ["/agent", "/manager", "/admin"];

function revalidateAll() {
  for (const p of paths) revalidatePath(p);
}

function parsePriority(v: FormDataEntryValue | null): Priority {
  const s = String(v ?? "MEDIUM");
  if (s === "LOW" || s === "HIGH") return s;
  return "MEDIUM";
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
      priority: parsePriority(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      creatorId: session.user.id,
      reviewStatus: "PENDING_REVIEW",
      executionStatus: "NOT_STARTED",
      projectId,
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
      priority: parsePriority(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      reviewStatus: "PENDING_REVIEW",
      managerNote: null,
    },
  });
  revalidateAll();
}

/** Agent: delete own request if still pending review or changes requested */
export async function deleteMyTaskRequest(formData: FormData) {
  const session = await requireRole(["AGENT"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const task = await prisma.task.findFirst({
    where: { id, creatorId: session.user.id },
  });
  if (!task) return;
  if (
    task.reviewStatus !== "PENDING_REVIEW" &&
    task.reviewStatus !== "CHANGES_REQUESTED"
  ) {
    return;
  }

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

/** Manager: approve and assign to an admin */
export async function managerApprove(formData: FormData) {
  await requireRole(["MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "").trim();
  if (!id || !assignedToId) return;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.reviewStatus !== "PENDING_REVIEW") return;

  const adminUser = await prisma.user.findFirst({
    where: { id: assignedToId, role: "ADMIN" },
  });
  if (!adminUser) return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "APPROVED",
      assignedToId,
      priority: parsePriority(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      executionStatus: "NOT_STARTED",
      managerNote: null,
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

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.reviewStatus !== "PENDING_REVIEW") return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "CHANGES_REQUESTED",
      managerNote,
      executionStatus: "NOT_STARTED",
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

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || existing.reviewStatus !== "PENDING_REVIEW") return;

  await prisma.task.update({
    where: { id },
    data: {
      reviewStatus: "DENIED",
      managerNote,
      executionStatus: "NOT_STARTED",
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
      priority: parsePriority(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
    },
  });
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

  await prisma.task.update({
    where: { id },
    data: {
      executionStatus,
      helpNote,
    },
  });
  revalidateAll();
}
