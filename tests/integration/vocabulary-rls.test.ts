import { describe, expect, test } from "bun:test";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";

describe("vocabulary RLS", () => {
  test("User A cannot select User B vocabulary", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      // Arrange
      const userA = await createTestUser(environment, "a");
      users.push(userA);

      const userB = await createTestUser(environment, "b");
      users.push(userB);

      const uniqueWord = `rls-${crypto.randomUUID()}`;
      const { data: word, error: insertError } = await userB.client
        .from("vocabulary")
        .insert({
          word: uniqueWord,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id, user_id, word")
        .single();

      expect(insertError).toBeNull();
      expect(word).not.toBeNull();
      expect(word?.user_id).toBe(userB.id);

      // Act
      const { data: visibleToUserA, error: selectError } = await userA.client
        .from("vocabulary")
        .select("id, user_id, word")
        .eq("id", word!.id);

      // Assert
      expect(selectError).toBeNull();
      expect(visibleToUserA).toEqual([]);

      const { data: storedWord, error: adminSelectError } = await environment.admin
        .from("vocabulary")
        .select("id, user_id, word")
        .eq("id", word!.id)
        .single();

      expect(adminSelectError).toBeNull();
      expect(storedWord).toEqual(word);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("User A cannot insert vocabulary for User B", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      // Arrange
      const userA = await createTestUser(environment, "a");
      users.push(userA);

      const userB = await createTestUser(environment, "b");
      users.push(userB);

      const uniqueWord = `rls-${crypto.randomUUID()}`;

      // Act
      const { data, error: insertError } = await userA.client
        .from("vocabulary")
        .insert({
          user_id: userB.id,
          word: uniqueWord,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id");

      // Assert
      expect(insertError).not.toBeNull();
      expect(insertError?.code).toBe("42501");
      expect(data).toBeNull();

      const { data: storedWords, error: adminSelectError } = await environment.admin
        .from("vocabulary")
        .select("id")
        .eq("word", uniqueWord);

      expect(adminSelectError).toBeNull();
      expect(storedWords).toEqual([]);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("User A cannot update User B vocabulary", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      // Arrange
      const userA = await createTestUser(environment, "a");
      users.push(userA);

      const userB = await createTestUser(environment, "b");
      users.push(userB);

      const originalMeaning = "المعنى الأصلي";
      const attemptedMeaning = "المعنى الذي حاول A وضعه";
      const uniqueWord = `rls-${crypto.randomUUID()}`;
      const { data: word, error: insertError } = await userB.client
        .from("vocabulary")
        .insert({
          word: uniqueWord,
          meaning_ar: originalMeaning,
          type: "noun",
          target: "active",
        })
        .select("id, user_id, meaning_ar")
        .single();

      expect(insertError).toBeNull();
      expect(word).not.toBeNull();
      expect(word?.user_id).toBe(userB.id);

      // Act
      const { data: updatedRows, error: updateError } = await userA.client
        .from("vocabulary")
        .update({ meaning_ar: attemptedMeaning })
        .eq("id", word!.id)
        .select("id, meaning_ar");

      // Assert
      expect(updateError).toBeNull();
      expect(updatedRows).toEqual([]);

      const { data: storedWord, error: adminSelectError } = await environment.admin
        .from("vocabulary")
        .select("id, user_id, meaning_ar")
        .eq("id", word!.id)
        .single();

      expect(adminSelectError).toBeNull();
      expect(storedWord?.user_id).toBe(userB.id);
      expect(storedWord?.meaning_ar).toBe(originalMeaning);
      expect(storedWord?.meaning_ar).not.toBe(attemptedMeaning);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("User A cannot delete User B vocabulary", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      // Arrange
      const userA = await createTestUser(environment, "a");
      users.push(userA);

      const userB = await createTestUser(environment, "b");
      users.push(userB);

      const uniqueWord = `rls-${crypto.randomUUID()}`;
      const { data: word, error: insertError } = await userB.client
        .from("vocabulary")
        .insert({
          word: uniqueWord,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id, user_id, word")
        .single();

      expect(insertError).toBeNull();
      expect(word?.user_id).toBe(userB.id);

      // Act
      const { data: deletedRows, error: deleteError } = await userA.client
        .from("vocabulary")
        .delete()
        .eq("id", word!.id)
        .select("id");

      // Assert
      expect(deleteError).toBeNull();
      expect(deletedRows).toEqual([]);

      const { data: storedWord, error: adminSelectError } = await environment.admin
        .from("vocabulary")
        .select("id, user_id, word")
        .eq("id", word!.id)
        .single();

      expect(adminSelectError).toBeNull();
      expect(storedWord).toEqual(word);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);
});
