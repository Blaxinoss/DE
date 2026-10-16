import { Database } from "@/lib/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

import A1 from "./SeedingLexiconsWithCERF.json";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
type LexiconInsert = Database["public"]["Tables"]["global_lexicon"]["Insert"];

const schema = z.array(
  z.object({
    audio_config_version: z.number().nullable().optional(),
    audio_generated_at: z.string().nullable().optional(),
    audio_path: z.string().nullable().optional(),
    audio_source_text: z.string().nullable().optional(),
    chunk: z.string().nullable().optional(),
    commonness: z.string().nullable().optional(),
    created_at: z.string().optional(),
    example: z.string().nullable().optional(),
    grammar_json: z.any().nullable().optional(),
    id: z.string().optional(),
    language: z.enum(["de", "en"]),
    type: z.enum(["noun", "verb", "adjective", "adverb", "expression", "other"]),

    level_cerf: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    meaning_ar: z.string(),
    model: z.string(),
    normalized_word: z.string(),
    schema_version: z.number().optional(),
    search_terms: z.array(z.string()),
    sense_key: z.string(),
    updated_at: z.string().optional(),
    word: z.string(),
  }),
);

async function seedLexicons() {
  try {
    const adminTestDB = createClient<Database>(
      process.env.TEST_PUBLIC_SUPABASE_URL ?? "",
      process.env.TEST_SUPABASE_SECRET_KEY ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const LevelJson: LexiconInsert[] = A1;

    const parsed = schema.safeParse(LevelJson);

    if (!parsed.success) {
      console.log(parsed.error);
      throw new Error("parsed failed, Not A valid JSON");
    }

    const { data: upsertDataArrayLexiconsVocabs, error: upsertError } =
      await adminTestDB
        .from("global_lexicon")
        .upsert(parsed.data, { onConflict: "language, sense_key" })
        .select("*");

    if (upsertError) {
      console.error("Error upserting lexicons:", upsertError);
      throw new Error("Error upserting lexicons");
    }

    if (upsertDataArrayLexiconsVocabs.length !== LevelJson.length) {
      console.warn(`Warning: Not all lexicons were upserted. Expected ${LevelJson.length}, 
                but got ${upsertDataArrayLexiconsVocabs.length}.`);
    }

    console.log(
      `Successfully upserted ${upsertDataArrayLexiconsVocabs.length} lexicons.`,
    );
  } catch (e) {
    console.log("uncatched Error in seedLexicons:", e);
  }
}

await seedLexicons();
