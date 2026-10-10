"use server";

import { ZodError } from "zod";
import { generateDictionarySuggestions } from "@/features/vocabulary/gemini-word-generator";
import {
  WordSuggestion,
  wordQuerySchema,
} from "@/features/vocabulary/dictionary-schema";
import {
  saveGeneratedDictionaryEntries,
  searchSharedDictionary,
} from "@/features/vocabulary/shared-dictionary-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { consumeAiQuota } from "@/lib/ai/quota";

export type DictionarySearchResult =
  { ok: true; suggestions: WordSuggestion[] } | { ok: false; error: string };

export type GenerateDictionaryState = {
  status: "idle" | "success" | "error";
  query: string;
  suggestions: WordSuggestion[];
  message?: string;
};

async function requireUser() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("UNAUTHENTICATED");
  }

  return client;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return "Enter a valid word or expression.";
  }
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return "Your session expired. Please sign in again.";
  }
  if (error instanceof Error && error.message === "GEMINI_API_KEY is missing") {
    return "AI vocabulary generation is not configured.";
  }
  if (error instanceof Error && error.message === "SUPABASE_SECRET_KEY is missing") {
    return "The shared dictionary cache is not configured.";
  }
  if (error instanceof Error && error.message === "AI_DAILY_LIMIT_REACHED") {
    return "You have reached today's AI vocabulary limit. Try again tomorrow.";
  }
  if (error instanceof Error && error.message === "AI_QUOTA_CHECK_FAILED") {
    return "Could not check your AI allowance. Please try again.";
  }

  console.error(fallback, error);
  return fallback;
}

export async function searchDictionary(
  rawInput: unknown,
): Promise<DictionarySearchResult> {
  try {
    const input = wordQuerySchema.parse(rawInput);
    const client = await requireUser();
    const suggestions = await searchSharedDictionary(
      client,
      input.language,
      input.query,
    );
    return { ok: true, suggestions };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Could not search the shared dictionary."),
    };
  }
}

export async function generateDictionaryEntry(
  _previousState: GenerateDictionaryState,
  formData: FormData,
): Promise<GenerateDictionaryState> {
  const rawInput = {
    language: formData.get("language"),
    query: formData.get("query"),
  };
  const query = typeof rawInput.query === "string" ? rawInput.query.trim() : "";

  try {
    const input = wordQuerySchema.parse(rawInput);
    const client = await requireUser();

    await consumeAiQuota(client, "generate_word");

    const generated = await generateDictionarySuggestions(input);
    const suggestions = await saveGeneratedDictionaryEntries(
      input.language,
      input.query,
      generated,
    );

    return {
      status: "success",
      query: input.query,
      suggestions,
      message:
        suggestions.length > 1
          ? "Choose the meaning you want to learn."
          : "The entry is ready. Review it, then add it to your vocabulary.",
    };
  } catch (error) {
    return {
      status: "error",
      query,
      suggestions: [],
      message: errorMessage(error, "Could not generate this dictionary entry."),
    };
  }
}
