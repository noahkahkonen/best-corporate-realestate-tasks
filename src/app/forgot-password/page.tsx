import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — BCR Tasks",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <ForgotPasswordForm />
    </main>
  );
}
