import { describe, expect, mock, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CERF, LearningLanguage } from "@/features/learning/types";
import { allSeedEntries } from "@/features/seedPack/packs";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";

type PackEntry = {
  language: LearningLanguage;
  level_cerf: CERF;
  starter_state: "new" | "learning" | "recall";
  sense_key: string;
};

type Pack = {
  language: LearningLanguage;
  level: CERF;
  entries: PackEntry[];
};

let activeClient: SupabaseClient<Database> | null = null;

mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => {
    if (!activeClient) {
      throw new Error("No authenticated integration-test client is active.");
    }

    return activeClient;
  },
}));

const { seedUserVocabulary } = await import("@/features/seedPack/action");
const entries = allSeedEntries as PackEntry[];

function definedPacks(): Pack[] {
  const groups = new Map<string, Pack>();

  for (const entry of entries) {
    const key = `${entry.language}:${entry.level_cerf}`;
    const pack = groups.get(key) ?? {
      language: entry.language,
      level: entry.level_cerf,
      entries: [],
    };
    pack.entries.push(entry);
    groups.set(key, pack);
  }

  return [...groups.values()];
}

describe("starter-pack seeding", () => {
  test("adds every pack to the correct user, language, state, and lexicon entries", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const packs = definedPacks();
    const allSenseKeys = [...new Set(entries.map((entry) => entry.sense_key))];

    try {
      const user = await createTestUser(environment, "seed-packs");
      users.push(user);
      activeClient = user.client;

      const { data: lexiconRows, error: lexiconError } = await environment.admin
        .from("global_lexicon")
        .select("id, language, sense_key")
        .in("sense_key", allSenseKeys);

      expect(lexiconError).toBeNull();
      expect(lexiconRows).toHaveLength(entries.length);

      const lexiconByIdentity = new Map(
        lexiconRows!.map((row) => [`${row.language}:${row.sense_key}`, row.id]),
      );

      for (const pack of packs) {
        const { error: clearWordsError } = await user.client
          .from("vocabulary")
          .delete()
          .eq("user_id", user.id);
        expect(clearWordsError).toBeNull();

        const { error: resetPreferencesError } = await user.client
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              learning_language: pack.language,
              seeded_languages: [],
            },
            { onConflict: "user_id" },
          );
        expect(resetPreferencesError).toBeNull();

        const result = await seedUserVocabulary(pack.level, pack.language);

        expect(result).toEqual({
          ok: true,
          insertedCount: pack.entries.length,
          alreadySeeded: false,
        });
        const expectedByLexiconId = new Map(
          pack.entries.map((entry) => [
            lexiconByIdentity.get(`${entry.language}:${entry.sense_key}`)!,
            entry,
          ]),
        );
        const { data: words, error: wordsError } = await user.client
          .from("vocabulary")
          .select("id, user_id, lexicon_id, language, state, target, next_review_at");

        expect(wordsError).toBeNull();
        expect(words).toHaveLength(pack.entries.length);
        expect(new Set(words!.map((word) => word.lexicon_id))).toEqual(
          new Set(expectedByLexiconId.keys()),
        );

        for (const word of words!) {
          const source = expectedByLexiconId.get(word.lexicon_id!);

          expect(source).toBeDefined();
          expect(word.user_id).toBe(user.id);
          expect(word.language).toBe(pack.language);
          expect(word.state).toBe(source!.starter_state);
          expect(word.target).toBe("active");
          expect(word.next_review_at).toBeNull();
        }

        const { data: preferences, error: preferencesError } = await user.client
          .from("user_preferences")
          .select("learning_language, seeded_languages")
          .single();

        expect(preferencesError).toBeNull();
        expect(preferences?.learning_language).toBe(pack.language);
        expect(preferences?.seeded_languages).toContain(pack.language);

        const repeated = await seedUserVocabulary(pack.level, pack.language);

        expect(repeated).toEqual({
          ok: true,
          insertedCount: 0,
          alreadySeeded: true,
        });

        const { count, error: countError } = await user.client
          .from("vocabulary")
          .select("id", { count: "exact", head: true });

        expect(countError).toBeNull();
        expect(count).toBe(pack.entries.length);
      }
    } finally {
      activeClient = null;
      await deleteTestUsers(environment, users);
    }
  }, 120_000);
});
