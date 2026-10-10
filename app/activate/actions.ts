"use server";

import { ZodError } from "zod";
import type { ActivationActionResult } from "@/lib/ai/activation-schema";
import { activateAndSave } from "@/lib/activation-service";
import { createClient } from "@/lib/supabase/server";

export async function evaluateActivationAction(
  input: unknown,
): Promise<ActivationActionResult> {
  try {
    if (JSON.stringify(input).length > 50_000) {
      return { ok: false, error: "The activation attempt is too large." };
    }

    const client = await createClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      return { ok: false, error: "Your session expired. Please sign in again." };
    }

    return await activateAndSave(client, user, input);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return {
        ok: false,
        error: "The activation attempt has an invalid format.",
      };
    }

    if (error instanceof Error && error.message === "GEMINI_API_KEY is missing") {
      return { ok: false, error: "AI evaluation is not configured yet." };
    }

    if (
      error instanceof Error &&
      [
        "ACTIVATION_WORDS_UNAVAILABLE",
        "ACTIVATION_WORDS_NOT_READY",
        "ACTIVATION_LANGUAGE_MISMATCH",
      ].includes(error.message)
    ) {
      return {
        ok: false,
        error:
          "Some target words changed or are no longer ready. Refresh and try again.",
      };
    }

    console.error("Activation evaluation failed", error);
    return {
      ok: false,
      error: "The AI evaluation failed. Your attempt was not saved.",
    };
  }
}
