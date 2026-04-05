"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Priority, TaskStatus } from "@prisma/client";

const path = "/";

function parsePriority(v: FormDataEntryValue | null): Priority {
  const s = String(v ?? "MEDIUM");
  if (s === "LOW" || s === "HIGH") return s;
  return "MEDIUM";
}

function parseStatus(v: FormDataEntryValue | null): TaskStatus {
  const s = String(v ?? "TODO");
  if (s === "IN_PROGRESS" || s === "DONE") return s;
  return "TODO";
}

function parseOptionalDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const projectIdRaw = formData.get("projectId");
  const projectId =
    projectIdRaw && String(projectIdRaw) !== "" ? String(projectIdRaw) : null;

  await prisma.task.create({
    data: {
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: parseStatus(formData.get("status")),
      priority: parsePriority(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      projectId,
    },
  });
  revalidatePath(path);
}

export async function updateTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const title = String(formData.get("title") ?? "").trim();
  await prisma.task.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: parseStatus(formData.get("status")),
      priority: parsePriority(formData.get("priority")),
      dueAt: parseOptionalDate(formData.get("dueAt")),
      projectId: (() => {
        const raw = formData.get("projectId");
        if (raw === null) return undefined;
        const s = String(raw);
        return s === "" ? null : s;
      })(),
    },
  });
  revalidatePath(path);
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  revalidatePath(path);
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const color = String(formData.get("color") ?? "").trim() || "#4f46e5";
  await prisma.project.create({ data: { name, color } });
  revalidatePath(path);
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidatePath(path);
}

export async function moveTaskStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = parseStatus(formData.get("status"));
  if (!id) return;
  await prisma.task.update({ where: { id }, data: { status } });
  revalidatePath(path);
}
