import { describe, expect, test } from "bun:test";
import type { Database } from "@/lib/database.types";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";

type LexiconInsert = Database["public"]["Tables"]["global_lexicon"]["Insert"];

function entry(
  senseKey: string,
  word: string,
  options: Partial<LexiconInsert> = {},
): LexiconInsert {
  return {
    language: "de",
    sense_key: senseKey,
    word,
    normalized_word: word.toLocaleLowerCase("de-DE"),
    meaning_ar: `meaning-${senseKey}`,
    type: "other",
    search_terms: [],
    model: "integration-test",
    ...options,
  };
}

describe("global lexicon behavior", () => {
  test("ranks exact word, alias, prefix, and fuzzy matches in that order", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const exactQuery = `exact${token}`;
    const aliasQuery = `alias${token}`;
    const prefixQuery = `prefix${token}`;
    const senseKeys = [
      `exact-word-${token}`,
      `exact-alias-${token}`,
      `alias-rank-${token}`,
      `prefix-after-alias-${token}`,
      `prefix-rank-${token}`,
      `fuzzy-after-prefix-${token}`,
    ];

    try {
      const user = await createTestUser(environment, "lexicon-ranking");
      users.push(user);

      const { error: seedError } = await environment.admin
        .from("global_lexicon")
        .insert([
          entry(senseKeys[0]!, exactQuery),
          entry(senseKeys[1]!, `other${token}`, { search_terms: [exactQuery] }),
          entry(senseKeys[2]!, `holder${token}`, { search_terms: [aliasQuery] }),
          entry(senseKeys[3]!, `${aliasQuery}tail`),
          entry(senseKeys[4]!, `${prefixQuery}tail`),
          entry(senseKeys[5]!, `prifix${token}`),
        ]);
      expect(seedError).toBeNull();

      const { data: exactResults, error: exactError } = await user.client.rpc(
        "search_global_lexicon",
        { p_language: "de", p_query: exactQuery, p_limit: 20 },
      );
      expect(exactError).toBeNull();
      expect(exactResults?.slice(0, 2).map((result) => result.sense_key)).toEqual([
        senseKeys[0],
        senseKeys[1],
      ]);

      const { data: aliasResults, error: aliasError } = await user.client.rpc(
        "search_global_lexicon",
        { p_language: "de", p_query: aliasQuery, p_limit: 20 },
      );
      expect(aliasError).toBeNull();
      expect(aliasResults?.slice(0, 2).map((result) => result.sense_key)).toEqual([
        senseKeys[2],
        senseKeys[3],
      ]);

      const { data: prefixResults, error: prefixError } = await user.client.rpc(
        "search_global_lexicon",
        { p_language: "de", p_query: prefixQuery, p_limit: 20 },
      );
      expect(prefixError).toBeNull();
      expect(prefixResults?.slice(0, 2).map((result) => result.sense_key)).toEqual([
        senseKeys[4],
        senseKeys[5],
      ]);
    } finally {
      await environment.admin
        .from("global_lexicon")
        .delete()
        .in("sense_key", senseKeys);
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("finds reasonable typos without leaking another language or merging senses", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const typoWord = `erinnerung${token}`;
    const languageWord = `language${token}`;
    const sharedWord = `sense${token}`;
    const senseKeys = [
      `typo-${token}`,
      `language-de-${token}`,
      `language-en-${token}`,
      `sense-one-${token}`,
      `sense-two-${token}`,
    ];

    try {
      const user = await createTestUser(environment, "lexicon-isolation");
      users.push(user);

      const { error: seedError } = await environment.admin
        .from("global_lexicon")
        .insert([
          entry(senseKeys[0]!, typoWord),
          entry(senseKeys[1]!, languageWord),
          entry(senseKeys[2]!, languageWord, { language: "en" }),
          entry(senseKeys[3]!, sharedWord, { meaning_ar: "المعنى الأول" }),
          entry(senseKeys[4]!, sharedWord, { meaning_ar: "المعنى الثاني" }),
        ]);
      expect(seedError).toBeNull();

      const { data: typoResults, error: typoError } = await user.client.rpc(
        "search_global_lexicon",
        {
          p_language: "de",
          p_query: `erinerung${token}`,
          p_limit: 20,
        },
      );
      expect(typoError).toBeNull();
      expect(typoResults?.some((result) => result.sense_key === senseKeys[0])).toBe(
        true,
      );

      const { data: languageResults, error: languageError } = await user.client.rpc(
        "search_global_lexicon",
        { p_language: "de", p_query: languageWord, p_limit: 20 },
      );
      expect(languageError).toBeNull();
      expect(languageResults?.every((result) => result.language === "de")).toBe(true);
      expect(languageResults?.map((result) => result.sense_key)).toContain(
        senseKeys[1],
      );
      expect(languageResults?.map((result) => result.sense_key)).not.toContain(
        senseKeys[2],
      );

      const { data: senseResults, error: senseError } = await user.client.rpc(
        "search_global_lexicon",
        { p_language: "de", p_query: sharedWord, p_limit: 20 },
      );
      expect(senseError).toBeNull();
      expect(
        senseResults
          ?.filter((result) => result.word === sharedWord)
          .map((result) => result.sense_key)
          .sort(),
      ).toEqual([senseKeys[3]!, senseKeys[4]!].sort());
    } finally {
      await environment.admin
        .from("global_lexicon")
        .delete()
        .in("sense_key", senseKeys);
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("stores an independent user copy of a selected lexicon entry", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const senseKey = `copy-${token}`;
    const originalMeaning = "المعنى الأصلي";
    const userMeaning = "معنى المستخدم";
    const laterLexiconMeaning = "معنى المعجم المعدّل";

    try {
      const user = await createTestUser(environment, "lexicon-copy");
      users.push(user);

      const { data: lexicon, error: seedError } = await environment.admin
        .from("global_lexicon")
        .insert(entry(senseKey, `copy${token}`, { meaning_ar: originalMeaning }))
        .select("id, word, meaning_ar, type, grammar_json")
        .single();
      expect(seedError).toBeNull();
      expect(lexicon).not.toBeNull();

      const { data: vocabulary, error: copyError } = await user.client
        .from("vocabulary")
        .insert({
          lexicon_id: lexicon!.id,
          word: lexicon!.word,
          meaning_ar: lexicon!.meaning_ar,
          type: lexicon!.type,
          target: "active",
          grammar_json: lexicon!.grammar_json,
        })
        .select("id, lexicon_id, meaning_ar")
        .single();
      expect(copyError).toBeNull();
      expect(vocabulary).toMatchObject({
        lexicon_id: lexicon!.id,
        meaning_ar: originalMeaning,
      });

      const { error: userEditError } = await user.client
        .from("vocabulary")
        .update({ meaning_ar: userMeaning })
        .eq("id", vocabulary!.id);
      expect(userEditError).toBeNull();

      const { data: lexiconAfterUserEdit } = await environment.admin
        .from("global_lexicon")
        .select("meaning_ar")
        .eq("id", lexicon!.id)
        .single();
      expect(lexiconAfterUserEdit?.meaning_ar).toBe(originalMeaning);

      const { error: lexiconEditError } = await environment.admin
        .from("global_lexicon")
        .update({ meaning_ar: laterLexiconMeaning })
        .eq("id", lexicon!.id);
      expect(lexiconEditError).toBeNull();

      const { data: vocabularyAfterLexiconEdit } = await user.client
        .from("vocabulary")
        .select("meaning_ar")
        .eq("id", vocabulary!.id)
        .single();
      expect(vocabularyAfterLexiconEdit?.meaning_ar).toBe(userMeaning);
    } finally {
      await environment.admin.from("global_lexicon").delete().eq("sense_key", senseKey);
      await deleteTestUsers(environment, users);
    }
  }, 30_000);
});
