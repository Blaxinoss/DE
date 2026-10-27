import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiModel } from "@/lib/ai/gemini-client";
import {
  WORD_DATA_VERSION,
  WordSuggestion,
} from "@/features/vocabulary/dictionary-schema";
import type { Database, Json } from "@/lib/database.types";
import { LearningLanguage } from "@/features/learning/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type LexiconSearchRow =
  Database["public"]["Functions"]["search_global_lexicon"]["Returns"][number];

type LexiconRow = Database["public"]["Tables"]["global_lexicon"]["Row"];

export function normalizeSearchTerm(value: string, language: LearningLanguage): string {
  const locale = language === "de" ? "de-DE" : "en-US";
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase(locale);
}

function fromSearchRow(row: LexiconSearchRow): WordSuggestion {
  return {
    id: row.id,
    senseKey: row.sense_key,
    word: row.word,
    meaningAr: row.meaning_ar,
    type: row.type as WordSuggestion["type"],
    grammar: (row.grammar_json as Record<string, unknown>) ?? {},
    commonness: row.commonness,
    chunk: row.chunk,
    example: row.example,
    searchTerms: row.search_terms,
    score: row.score,
    verbFamilyPath: null,
  };
}

function fromRow(row: LexiconRow): WordSuggestion {
  return {
    id: row.id,
    senseKey: row.sense_key,
    word: row.word,
    meaningAr: row.meaning_ar,
    type: row.type as WordSuggestion["type"],
    grammar: (row.grammar_json as Record<string, unknown>) ?? {},
    commonness: row.commonness,
    chunk: row.chunk,
    example: row.example,
    searchTerms: row.search_terms,
    score: null,
    verbFamilyPath: null,
  };
}

export async function searchSharedDictionary(
  client: SupabaseClient<Database>,
  language: LearningLanguage,
  query: string,
): Promise<WordSuggestion[]> {
  const { data, error } = await client.rpc("search_global_lexicon", {
    p_language: language,
    p_query: query,
    p_limit: 8,
  });

  if (error) throw error;
  return (data ?? []).map(fromSearchRow);
}

export async function saveGeneratedDictionaryEntries(
  language: LearningLanguage,
  query: string,
  suggestions: WordSuggestion[],
): Promise<WordSuggestion[]> {
  const normalizedQuery = normalizeSearchTerm(query, language);
  const entries = suggestions.map((candidate) => {
    const searchTerms = [query, candidate.word, ...candidate.searchTerms]
      .map((term) => normalizeSearchTerm(term, language))
      .filter((term, index, all) => term && all.indexOf(term) === index);

    return {
      sense_key: candidate.senseKey,
      word: candidate.word,
      normalized_word: normalizeSearchTerm(candidate.word, language),
      meaning_ar: candidate.meaningAr,
      type: candidate.type,
      grammar_json: candidate.grammar as Json,
      commonness: candidate.commonness,
      chunk: candidate.chunk,
      example: candidate.example,
      search_terms: [...new Set([normalizedQuery, ...searchTerms])],
      verb_family_path: candidate.verbFamilyPath,
    };
  });

  const { data, error } = await createAdminSupabaseClient().rpc(
    "save_generated_lexicon_entries",
    {
      p_language: language,
      p_entries: entries as Json,
      p_model: geminiModel,
      p_schema_version: WORD_DATA_VERSION,
    },
  );

  if (error) throw error;
  return (data as LexiconRow[]).map(fromRow);
}
