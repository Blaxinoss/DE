import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function recoveryDestination(requestedPath: string | null): string {
  return requestedPath === "/reset-password" ? requestedPath : "/dashboard";
}
