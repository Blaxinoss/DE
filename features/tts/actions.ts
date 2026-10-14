"use server";

import { getOrCreateAudio } from "@/features/tts/get-or-create-audio";
import { speechRequestSchema, type SpeechResponse } from "@/features/tts/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getOrCreateAudioAction(
  rawInput: unknown,
): Promise<SpeechResponse> {
  const parsed = speechRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_request",
      message: "This word cannot be pronounced.",
    };
  }

  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Your session expired. Please sign in again.",
    };
  }

  try {
    const audioUrl = await getOrCreateAudio(parsed.data.lexiconId);
    return { ok: true, audioUrl };
  } catch (error) {
    if (error instanceof Error && error.message === "LEXICON_ENTRY_NOT_FOUND") {
      return {
        ok: false,
        code: "not_found",
        message: "This dictionary entry no longer exists.",
      };
    }

    if (error instanceof Error && error.message === "GOOGLE_TTS_NOT_CONFIGURED") {
      return {
        ok: false,
        code: "unavailable",
        message: "Google pronunciation is not configured yet.",
      };
    }

    console.error("Could not prepare word audio.", error);
    return {
      ok: false,
      code: "unavailable",
      message: "Could not prepare this pronunciation. Please try again.",
    };
  }
}
