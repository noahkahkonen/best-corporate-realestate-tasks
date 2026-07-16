"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type RequestResetResult = { ok: true } | { ok: false; error: string };

/**
 * Public: request a reset link. Always reports success for a well-formed
 * email so responses don't reveal which addresses have accounts.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<RequestResetResult> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.$transaction([
      // One outstanding link per account: a new request invalidates old links.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      }),
    ]);

    after(() =>
      sendEmail([user.email], {
        subject: "Reset your BCR Tasks password",
        heading: "Password reset",
        body: [
          `Hi ${user.name}, someone asked to reset the password for this account. If it was you, use the button below within 1 hour.`,
          "If you didn't request this, you can ignore this email — your password is unchanged.",
        ],
        link: {
          label: "Choose a new password",
          path: `/reset-password?token=${token}`,
        },
      }),
    );
  }

  return { ok: true };
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

/** Public: set a new password using a token from the reset email. */
export async function resetPassword(
  formData: FormData,
): Promise<ResetPasswordResult> {
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { ok: false, error: "This reset link is invalid." };
  }
  if (!next || !confirm) {
    return { ok: false, error: "Fill in both password fields." };
  }
  if (next.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { ok: false, error: "New passwords do not match." };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.expiresAt < new Date()) {
    return {
      ok: false,
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true };
}
