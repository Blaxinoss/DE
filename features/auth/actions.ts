"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuthState } from "@/features/auth/state";
import {
  credentialsSchema,
  emailSchema,
  newPasswordSchema,
} from "@/features/auth/validation";

function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function login(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseCredentials(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseCredentials(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
  });

  if (error) return { status: "error", message: error.message };

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "Check your email to confirm your account, then sign in.",
  };
}

function getRequestOrigin(requestHeaders: Headers): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = configuredOrigin || requestHeaders.get("origin");

  if (!origin) throw new Error("SITE_URL_MISSING");

  const url = new URL(origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("SITE_URL_INVALID");
  }

  return url.origin;
}

export async function requestPasswordReset(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const requestHeaders = await headers();
    const redirectTo = `${getRequestOrigin(requestHeaders)}/auth/confirm?next=/reset-password`;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    });

    if (error) {
      console.error("Password reset email failed", error);
      return {
        status: "error",
        message: "Could not send the reset email. Please try again shortly.",
      };
    }

    return {
      status: "success",
      message:
        "If an account exists for that email, a password reset link is on its way.",
    };
  } catch (error) {
    console.error("Password reset configuration failed", error);
    return {
      status: "error",
      message: "Password reset is not available right now. Please try again later.",
    };
  }
}

export async function updatePassword(
  _previousState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/?reset=success");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
