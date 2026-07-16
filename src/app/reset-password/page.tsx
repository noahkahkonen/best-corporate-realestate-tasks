import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password — BCR Tasks",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Invalid reset link
          </h1>
          <p className="text-sm text-zinc-500">
            This link is missing its reset token. Use the button from the most
            recent password reset email, or request a new link.
          </p>
          <Link
            href="/forgot-password"
            className="block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <ResetPasswordForm token={token} />
    </main>
  );
}
