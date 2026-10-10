import { AuthForm } from "@/features/auth/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{ reset?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const notice =
    params.reset === "success"
      ? "Your password was updated. Sign in with your new password."
      : params.error === "confirmation_failed"
        ? "That email link is invalid or has expired."
        : undefined;

  return (
    <AuthForm
      mode="login"
      notice={notice}
    />
  );
}
