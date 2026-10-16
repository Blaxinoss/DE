import { describe, expect, test } from "bun:test";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";

function expectMutationDenied(
  rows: { id: string }[] | null,
  error: { code?: string } | null,
): void {
  if (error) {
    expect(error.code).toBe("42501");
    return;
  }

  expect(rows).toEqual([]);
}

describe("global lexicon permissions", () => {
  test("authenticated users cannot mutate global entries", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const existingSenseKey = `integration-existing-${crypto.randomUUID()}`;
    const attemptedSenseKey = `integration-attempt-${crypto.randomUUID()}`;

    try {
      const user = await createTestUser(environment, "lexicon");
      users.push(user);

      const { data: existingEntry, error: seedError } = await environment.admin
        .from("global_lexicon")
        .insert({
          language: "de",
          sense_key: existingSenseKey,
          word: "Testwort",
          normalized_word: "testwort",
          meaning_ar: "كلمة اختبار",
          type: "noun",
          model: "integration-test",
        })
        .select("id, meaning_ar")
        .single();

      expect(seedError).toBeNull();
      expect(existingEntry).not.toBeNull();

      const { error: insertError } = await user.client.from("global_lexicon").insert({
        language: "de",
        sense_key: attemptedSenseKey,
        word: "Verboten",
        normalized_word: "verboten",
        meaning_ar: "غير مسموح",
        type: "adjective",
        model: "integration-test",
      });

      const { data: updatedRows, error: updateError } = await user.client
        .from("global_lexicon")
        .update({ meaning_ar: "تم التعديل" })
        .eq("id", existingEntry!.id)
        .select("id");

      const { data: deletedRows, error: deleteError } = await user.client
        .from("global_lexicon")
        .delete()
        .eq("id", existingEntry!.id)
        .select("id");

      expect(insertError?.code).toBe("42501");
      expectMutationDenied(updatedRows, updateError);
      expectMutationDenied(deletedRows, deleteError);

      const { data: storedEntry, error: adminSelectError } = await environment.admin
        .from("global_lexicon")
        .select("id, meaning_ar")
        .eq("id", existingEntry!.id)
        .single();

      expect(adminSelectError).toBeNull();
      expect(storedEntry?.meaning_ar).toBe("كلمة اختبار");

      const { data: forbiddenEntries, error: forbiddenSelectError } =
        await environment.admin
          .from("global_lexicon")
          .select("id")
          .eq("sense_key", attemptedSenseKey);

      expect(forbiddenSelectError).toBeNull();
      expect(forbiddenEntries).toEqual([]);
    } finally {
      await environment.admin
        .from("global_lexicon")
        .delete()
        .in("sense_key", [existingSenseKey, attemptedSenseKey]);
      await deleteTestUsers(environment, users);
    }
  }, 30_000);
});
