import { describe, expect, test } from "bun:test";
import type { Json } from "@/lib/database.types";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";

const reviewedAt = "2026-10-16T10:00:00.000Z";
const nextReviewAt = "2026-10-17T10:00:00.000Z";

describe("learning result RPCs", () => {
  test("record_learning_result cannot update another user's word", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      const userA = await createTestUser(environment, "a");
      users.push(userA);

      const userB = await createTestUser(environment, "b");
      users.push(userB);

      const { data: word, error: insertError } = await userB.client
        .from("vocabulary")
        .insert({
          word: `rpc-${crypto.randomUUID()}`,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id")
        .single();

      expect(insertError).toBeNull();

      const { error: rpcError } = await userA.client.rpc("record_learning_result", {
        p_vocabulary_id: word!.id,
        p_result: "instant",
        p_review_type: "review",
        p_reviewed_at: reviewedAt,
        p_next_review_at: nextReviewAt,
        p_state: "learning",
      });

      expect(rpcError).not.toBeNull();
      expect(rpcError?.message).toContain("not found or access denied");

      const { data: storedWord, error: wordError } = await environment.admin
        .from("vocabulary")
        .select("state, next_review_at")
        .eq("id", word!.id)
        .single();
      const { data: reviews, error: reviewsError } = await environment.admin
        .from("reviews")
        .select("id")
        .eq("vocabulary_id", word!.id);

      expect(wordError).toBeNull();
      expect(storedWord).toEqual({ state: "new", next_review_at: null });
      expect(reviewsError).toBeNull();
      expect(reviews).toEqual([]);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("a failed review insert rolls back the vocabulary update", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      const user = await createTestUser(environment, "atomic-review");
      users.push(user);

      const { data: word, error: insertError } = await user.client
        .from("vocabulary")
        .insert({
          word: `rpc-${crypto.randomUUID()}`,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id")
        .single();

      expect(insertError).toBeNull();

      const { error: rpcError } = await user.client.rpc("record_learning_result", {
        p_vocabulary_id: word!.id,
        p_result: "invalid-result",
        p_review_type: "review",
        p_reviewed_at: reviewedAt,
        p_next_review_at: nextReviewAt,
        p_state: "learning",
      });

      expect(rpcError?.code).toBe("23514");

      const { data: storedWord, error: wordError } = await environment.admin
        .from("vocabulary")
        .select("state, next_review_at")
        .eq("id", word!.id)
        .single();
      const { data: reviews, error: reviewsError } = await environment.admin
        .from("reviews")
        .select("id")
        .eq("vocabulary_id", word!.id);

      expect(wordError).toBeNull();
      expect(storedWord).toEqual({ state: "new", next_review_at: null });
      expect(reviewsError).toBeNull();
      expect(reviews).toEqual([]);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("a failed vocabulary update does not insert a review", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      const user = await createTestUser(environment, "atomic-word");
      users.push(user);

      const { data: word, error: insertError } = await user.client
        .from("vocabulary")
        .insert({
          word: `rpc-${crypto.randomUUID()}`,
          meaning_ar: "كلمة اختبار",
          type: "noun",
          target: "active",
        })
        .select("id")
        .single();

      expect(insertError).toBeNull();

      const { error: rpcError } = await user.client.rpc("record_learning_result", {
        p_vocabulary_id: word!.id,
        p_result: "instant",
        p_review_type: "review",
        p_reviewed_at: reviewedAt,
        p_next_review_at: nextReviewAt,
        p_state: "invalid-state",
      });

      expect(rpcError?.code).toBe("23514");

      const { data: storedWord, error: wordError } = await environment.admin
        .from("vocabulary")
        .select("state, next_review_at")
        .eq("id", word!.id)
        .single();
      const { data: reviews, error: reviewsError } = await environment.admin
        .from("reviews")
        .select("id")
        .eq("vocabulary_id", word!.id);

      expect(wordError).toBeNull();
      expect(storedWord).toEqual({ state: "new", next_review_at: null });
      expect(reviewsError).toBeNull();
      expect(reviews).toEqual([]);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("record_learning_results rolls back the whole batch", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];

    try {
      const user = await createTestUser(environment, "batch");
      users.push(user);

      const { data: words, error: insertError } = await user.client
        .from("vocabulary")
        .insert([
          {
            word: `rpc-${crypto.randomUUID()}`,
            meaning_ar: "الكلمة الأولى",
            type: "noun",
            target: "active",
          },
          {
            word: `rpc-${crypto.randomUUID()}`,
            meaning_ar: "الكلمة الثانية",
            type: "noun",
            target: "active",
          },
        ])
        .select("id");

      expect(insertError).toBeNull();
      expect(words).toHaveLength(2);

      const payload = [
        {
          vocabulary_id: words![0].id,
          result: "instant",
          review_type: "review",
          reviewed_at: reviewedAt,
          next_review_at: nextReviewAt,
          state: "learning",
        },
        {
          vocabulary_id: words![1].id,
          result: "invalid-result",
          review_type: "review",
          reviewed_at: reviewedAt,
          next_review_at: nextReviewAt,
          state: "learning",
        },
      ];

      const { error: rpcError } = await user.client.rpc("record_learning_results", {
        p_results: payload as Json,
      });

      expect(rpcError?.code).toBe("23514");

      const wordIds = words!.map((word) => word.id);
      const { data: storedWords, error: wordsError } = await environment.admin
        .from("vocabulary")
        .select("id, state, next_review_at")
        .in("id", wordIds);
      const { data: reviews, error: reviewsError } = await environment.admin
        .from("reviews")
        .select("id")
        .in("vocabulary_id", wordIds);

      expect(wordsError).toBeNull();
      expect(storedWords).toHaveLength(2);
      expect(
        storedWords?.every(
          (word) => word.state === "new" && word.next_review_at === null,
        ),
      ).toBe(true);
      expect(reviewsError).toBeNull();
      expect(reviews).toEqual([]);
    } finally {
      await deleteTestUsers(environment, users);
    }
  }, 30_000);
});
