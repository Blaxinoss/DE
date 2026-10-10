import { describe, expect, test } from "bun:test";
import { emailSchema, newPasswordSchema, recoveryDestination } from "./validation";

describe("password recovery validation", () => {
  test("accepts a valid recovery email", () => {
    expect(emailSchema.parse({ email: "learner@example.com" })).toEqual({
      email: "learner@example.com",
    });
  });

  test("rejects mismatched passwords", () => {
    const result = newPasswordSchema.safeParse({
      password: "new-password",
      confirmPassword: "different-password",
    });

    expect(result.success).toBeFalse();
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toEqual([
        "Passwords do not match.",
      ]);
    }
  });

  test("allows only the known internal recovery destination", () => {
    expect(recoveryDestination("/reset-password")).toBe("/reset-password");
    expect(recoveryDestination("https://attacker.example")).toBe("/dashboard");
    expect(recoveryDestination("//attacker.example")).toBe("/dashboard");
    expect(recoveryDestination(null)).toBe("/dashboard");
  });
});
