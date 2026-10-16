import { describe, expect, test } from "bun:test";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";

describe("user-owned data RLS", () => {
  test("User A cannot select User B related data", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      const userA = await createTestUser(environment, "a");
      users.push(userA);

      const userB = await createTestUser(environment, "b");
      users.push(userB);

      const { data: word, error: wordError } = await userB.client
        .from("vocabulary")
        .insert({
          word: `rls-${crypto.randomUUID()}`,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id")
        .single();

      expect(wordError).toBeNull();

      const attemptId = crypto.randomUUID();
      const { error: attemptError } = await userB.client
        .from("activation_attempts")
        .insert({
          id: attemptId,
          language: "de",
          answer: "Das ist ein Test.",
          correct: true,
          feedback_ar: "إجابة صحيحة",
          grammar_score: 10,
          naturalness_score: 10,
          meaning_score: 10,
          model: "integration-test",
          evaluator_version: 1,
        });

      expect(attemptError).toBeNull();

      const { data: review, error: reviewError } = await userB.client
        .from("reviews")
        .insert({
          vocabulary_id: word!.id,
          result: "easy",
          review_type: "activate",
          activation_attempt_id: attemptId,
        })
        .select("id")
        .single();

      expect(reviewError).toBeNull();

      const { data: wordResult, error: wordResultError } = await userB.client
        .from("activation_word_results")
        .insert({
          attempt_id: attemptId,
          review_id: review!.id,
          vocabulary_id: word!.id,
          word_snapshot: "Testwort",
          used: true,
          meaning_correct: true,
          grammar_correct: true,
          natural_usage: true,
          collocation_correct: true,
          usage_score: 10,
        })
        .select("id")
        .single();

      expect(wordResultError).toBeNull();

      const { error: preferenceError } = await userB.client
        .from("user_preferences")
        .upsert({ user_id: userB.id, learning_language: "de" });

      expect(preferenceError).toBeNull();

      const [reviews, preferences, attempts, wordResults] = await Promise.all([
        userA.client.from("reviews").select("id").eq("id", review!.id),
        userA.client.from("user_preferences").select("user_id").eq("user_id", userB.id),
        userA.client.from("activation_attempts").select("id").eq("id", attemptId),
        userA.client
          .from("activation_word_results")
          .select("id")
          .eq("id", wordResult!.id),
      ]);

      expect(reviews.error).toBeNull();
      expect(reviews.data).toEqual([]);
      expect(preferences.error).toBeNull();
      expect(preferences.data).toEqual([]);
      expect(attempts.error).toBeNull();
      expect(attempts.data).toEqual([]);
      expect(wordResults.error).toBeNull();
      expect(wordResults.data).toEqual([]);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);
});
