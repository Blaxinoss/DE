"use server";

import { ZodError } from "zod";
import { generateWordSuggestions } from "@/lib/ai/generate-lexicon";
import { WordSuggestion, wordQuerySchema } from "@/lib/ai/lexicon-schema";
import { saveSharedWords, searchSharedWords } from "@/lib/lexicon-repository";
import { createClient } from "@/lib/supabase/server";

export type WordSearchResult =
  { ok: true; suggestions: WordSuggestion[] } | { ok: false; error: string };

export type GenerateWordState = {
  status: "idle" | "success" | "error";
  query: string;
  suggestions: WordSuggestion[];
  message?: string;
};

async function requireUser() {
  const client = await createClient();
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

  console.error(fallback, error);
  return fallback;
}

export async function searchWords(rawInput: unknown): Promise<WordSearchResult> {
  try {
    const input = wordQuerySchema.parse(rawInput);
    const client = await requireUser();
    const suggestions = await searchSharedWords(client, input.language, input.query);
    return { ok: true, suggestions };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Could not search the shared dictionary."),
    };
  }
}

export async function generateWord(
  _previousState: GenerateWordState,
  formData: FormData,
): Promise<GenerateWordState> {
  const rawInput = {
    language: formData.get("language"),
    query: formData.get("query"),
  };
  const query = typeof rawInput.query === "string" ? rawInput.query.trim() : "";

  try {
    const input = wordQuerySchema.parse(rawInput);
    await requireUser();

    const generated = await generateWordSuggestions(input);
    const suggestions = await saveSharedWords(input.language, input.query, generated);

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
