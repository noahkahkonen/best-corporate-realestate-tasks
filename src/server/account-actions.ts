"use server";

import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateRandomPassword } from "@/lib/password";
import { requireRole } from "@/lib/auth-helpers";

export type CreateUserResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

/** Manager: create agent / admin / manager account with a random password */
export async function managerCreateUser(formData: FormData): Promise<CreateUserResult> {
  await requireRole(["MANAGER"]);

  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const name = String(formData.get("name") ?? "").trim() || email.split("@")[0] || "User";
  const roleRaw = String(formData.get("role") ?? "AGENT");
  const role = (["AGENT", "MANAGER", "ADMIN"].includes(roleRaw)
    ? roleRaw
    : "AGENT") as Role;

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const plain = generateRandomPassword();
  const passwordHash = await bcrypt.hash(plain, 12);

  try {
    await prisma.user.create({
      data: {
        email,
        name,
        role,
        passwordHash,
        mustChangePassword: true,
      },
    });
  } catch {
    return { ok: false, error: "Could not create account. Try again." };
  }

  revalidatePath("/manager", "layout");
  return { ok: true, email, password: plain };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

/** Any signed-in user: change password (required once if mustChangePassword) */
export async function changePassword(formData: FormData): Promise<ChangePasswordResult> {
  const session = await requireRole(["AGENT", "MANAGER", "ADMIN"]);

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) {
    return { ok: false, error: "Fill in all fields." };
  }
  if (next.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { ok: false, error: "New passwords do not match." };
  }
  if (current === next) {
    return { ok: false, error: "New password must be different from the current one." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  const match = await bcrypt.compare(current, user.passwordHash);
  if (!match) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  return { ok: true };
}
