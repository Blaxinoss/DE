import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/lib/database.types";
import { allSeedEntries } from "@/features/seedPack/packs";

type LexiconInsert = Database["public"]["Tables"]["global_lexicon"]["Insert"];
type PackState = "new" | "learning" | "recall";
type SeedLexiconInsert = Omit<LexiconInsert, "state"> & { state: PackState };

const seedSchema = z.array(
  z.object({
    audio_config_version: z.number().nullable().optional(),
    audio_generated_at: z.string().nullable().optional(),
    audio_path: z.string().nullable().optional(),
    audio_source_text: z.string().nullable().optional(),
    chunk: z.string().nullable().optional(),
    commonness: z
      .enum(["very_common", "common", "less_common", "rare"])
      .nullable()
      .optional(),
    created_at: z.string().optional(),
    example: z.string().nullable().optional(),
    grammar_json: z.record(z.string(), z.unknown()).default({}),
    id: z.string().optional(),
    language: z.enum(["de", "en"]),
    type: z.enum(["noun", "verb", "adjective", "adverb", "expression", "other"]),

    level_cerf: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    meaning_ar: z.string().trim().min(1),
    model: z.string().trim().min(1),
    normalized_word: z.string().trim().min(1),
    schema_version: z.number().int().positive().optional(),
    search_terms: z.array(z.string().trim().min(1)).default([]),
    sense_key: z.string().trim().min(1),
    starter_state: z.enum(["new", "learning", "recall"]),
    updated_at: z.string().optional(),
    word: z.string().trim().min(1),
  }),
);

function databaseCredentials() {
  const production = process.argv.includes("--production");
  const url = production
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.TEST_PUBLIC_SUPABASE_URL;
  const secretKey = production
    ? process.env.SUPABASE_SECRET_KEY
    : process.env.TEST_SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      production
        ? "Production Supabase credentials are missing."
        : "Test Supabase credentials are missing.",
    );
  }

  return { url, secretKey, target: production ? "production" : "test" } as const;
}

async function seedLexicons() {
  const parsed = seedSchema.safeParse(allSeedEntries);

  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    throw new Error("One or more starter-pack JSON files are not valid.");
  }

  const lexiconRows: SeedLexiconInsert[] = parsed.data.map(
    ({ starter_state, ...lexicon }) => ({
      ...lexicon,
      state: starter_state,
      grammar_json: lexicon.grammar_json as Json,
    }),
  );

  if (process.argv.includes("--validate-only")) {
    console.log(`Validated ${lexiconRows.length} lexicon entries.`);
    return;
  }
  const { url, secretKey, target } = databaseCredentials();
  const admin = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await admin
    .from("global_lexicon")
    .upsert(lexiconRows, {
      onConflict: "language, sense_key",
    })
    .select("id");

  if (error) throw error;

  if (data.length !== lexiconRows.length) {
    throw new Error(
      `Expected ${lexiconRows.length} saved lexicon rows, but received ${data.length}.`,
    );
  }

  const expectedIdentities = new Set(
    parsed.data.map((entry) => `${entry.language}:${entry.sense_key}`),
  );
  const { data: taggedRows, error: taggedRowsError } = await admin
    .from("global_lexicon")
    .select("id, language, sense_key")
    .not("level_cerf", "is", null);

  if (taggedRowsError) throw taggedRowsError;

  const staleIds = taggedRows
    .filter((entry) => !expectedIdentities.has(`${entry.language}:${entry.sense_key}`))
    .map((entry) => entry.id);

  if (staleIds.length > 0) {
    const { error: cleanupError } = await admin
      .from("global_lexicon")
      .delete()
      .in("id", staleIds);

    if (cleanupError) throw cleanupError;
  }

  console.log(
    `Synced ${data.length} lexicon entries into ${target}; removed ${staleIds.length} stale pack entries.`,
  );
}

await seedLexicons();
