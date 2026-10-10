import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/features/auth/components/password-recovery-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return <PasswordRecoveryForm mode="update" />;
}
