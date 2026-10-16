"use server";

import type { Database } from "@/lib/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CERF,
  LearningLanguage,
  learningLanguages,
  level_CERF,
  Vocabulary,
} from "@/features/learning/types";

type VocabularyInsert = Database["public"]["Tables"]["vocabulary"]["Insert"];

type SeedPackResult =
  | { ok: true; insertedCount: number; alreadySeeded: boolean }
  | { ok: false; error: string };

export async function seedUserVocabulary(
  cefr: CERF,
  language: LearningLanguage,
): Promise<SeedPackResult> {
  if (!level_CERF.includes(cefr) || !learningLanguages.includes(language)) {
    return { ok: false, error: "Invalid language or CEFR level." };
  }

  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Authentication required." };
  }

  const { data: preferences, error: preferencesError } = await client
    .from("user_preferences")
    .select("seeded_languages")
    .maybeSingle();

  if (preferencesError) {
    console.error("Could not read seed preferences.", preferencesError);
    return { ok: false, error: "Could not check your starter vocabulary." };
  }

  const seededLanguages = preferences?.seeded_languages ?? [];
  if (seededLanguages.includes(language)) {
    return { ok: true, insertedCount: 0, alreadySeeded: true };
  }

  const { data: lexiconRows, error: lexiconError } = await client
    .from("global_lexicon")
    .select("*")
    .eq("language", language)
    .eq("level_cerf", cefr);

  if (lexiconError) {
    console.error("Could not read the starter lexicon.", lexiconError);
    return { ok: false, error: "Could not load the starter vocabulary." };
  }

  if (lexiconRows.length === 0) {
    return {
      ok: false,
      error: `No ${language.toUpperCase()} ${cefr} starter words are available.`,
    };
  }

  const vocabularyRows: VocabularyInsert[] = lexiconRows.map((lexicon) => ({
    user_id: user.id,
    lexicon_id: lexicon.id,
    language: lexicon.language,
    word: lexicon.word,
    meaning_ar: lexicon.meaning_ar,
    type: lexicon.type,
    target: "active",
    state: lexicon.state as Vocabulary["state"],
    grammar_json: lexicon.grammar_json,
    commonness: lexicon.commonness,
    chunk: lexicon.chunk,
    example: lexicon.example,
    next_review_at: null,
  }));

  const { data: insertedRows, error: insertError } = await client
    .from("vocabulary")
    .upsert(vocabularyRows, {
      onConflict: "user_id,lexicon_id",
      ignoreDuplicates: true,
      defaultToNull: false,
    })
    .select("id");

  if (insertError) {
    console.error("Could not seed user vocabulary.", insertError);
    return { ok: false, error: "Could not add the starter vocabulary." };
  }

  const nextSeededLanguages = [...new Set([...seededLanguages, language])];
  const { error: updatePreferencesError } = await client
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        learning_language: language,
        seeded_languages: nextSeededLanguages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (updatePreferencesError) {
    console.error("Could not save seed preferences.", updatePreferencesError);
    return {
      ok: false,
      error: "Words were added, but setup could not be finalized. Please retry.",
    };
  }

  return {
    ok: true,
    insertedCount: insertedRows.length,
    alreadySeeded: false,
  };
}
