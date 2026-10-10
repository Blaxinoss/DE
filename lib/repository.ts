import { LearningLanguage, Review, Vocabulary, VocabularyDraft } from "./types";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import type { Database, Json } from "./database.types";

const supabase = isSupabaseConfigured ? createClient() : null;

function getSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the app.",
    );
  }

  return supabase;
}

function vocabularyWriteError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("This word already exists in your current language course.");
  }

  return new Error(error.message);
}

type VocabularyRow = {
  id: string;
  language: LearningLanguage;
  word: string;
  meaning_ar: string | null;
  type: Vocabulary["type"];
  target: Vocabulary["target"];
  state: Vocabulary["state"];
  grammar_json: Record<string, unknown> | null;
  commonness: string | null;
  chunk: string | null;
  example: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  vocabulary_id: string;
  result: Review["result"];
  review_type: Review["reviewType"];
  reviewed_at: string;
};

function toVocabulary(row: VocabularyRow): Vocabulary {
  return {
    id: row.id,
    language: row.language,
    word: row.word,
    meaningAr: row.meaning_ar ?? "",
    type: row.type,
    target: row.target,
    state: row.state,
    grammar: row.grammar_json ?? {},
    commonness: row.commonness,
    chunk: row.chunk,
    example: row.example,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    vocabularyId: row.vocabulary_id,
    result: row.result,
    reviewType: row.review_type,
    reviewedAt: row.reviewed_at,
  };
}

function toVocabularyRow(
  draft: VocabularyDraft,
): Database["public"]["Tables"]["vocabulary"]["Insert"] {
  return {
    word: draft.word,
    meaning_ar: draft.meaningAr,
    type: draft.type,
    target: draft.target,
    state: draft.state,
    grammar_json: draft.grammar as Json,
    commonness: draft.commonness,
    chunk: draft.chunk,
    example: draft.example,
  };
}

export const repository = {
  async getLearningLanguage(): Promise<LearningLanguage> {
    const client = getSupabase();
    const { data, error } = await client
      .from("user_preferences")
      .select("learning_language")
      .maybeSingle();

    if (error) throw error;
    return data?.learning_language === "en" ? "en" : "de";
  },

  async setLearningLanguage(language: LearningLanguage): Promise<void> {
    const client = getSupabase();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("You must be signed in to change language.");

    const { error } = await client.from("user_preferences").upsert(
      {
        user_id: user.id,
        learning_language: language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;
  },

  async load(languageOverride?: LearningLanguage): Promise<{
    language: LearningLanguage;
    words: Vocabulary[];
    reviews: Review[];
  }> {
    const client = getSupabase();
    const language = languageOverride ?? (await repository.getLearningLanguage());
    const [wordsResult, reviewsResult] = await Promise.all([
      client
        .from("vocabulary")
        .select("*")
        .eq("language", language)
        .order("created_at", { ascending: false }),
      client.from("reviews").select("*").order("reviewed_at", { ascending: false }),
    ]);

    if (wordsResult.error) throw wordsResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    const words = (wordsResult.data as VocabularyRow[]).map(toVocabulary);
    const wordIds = new Set(words.map((word) => word.id));

    return {
      language,
      words,
      reviews: (reviewsResult.data as ReviewRow[])
        .filter((review) => wordIds.has(review.vocabulary_id))
        .map(toReview),
    };
  },

  async create(
    draft: VocabularyDraft,
    language: LearningLanguage,
  ): Promise<Vocabulary> {
    const { data, error } = await getSupabase()
      .from("vocabulary")
      .insert({ ...toVocabularyRow(draft), language })
      .select()
      .single();

    if (error) throw vocabularyWriteError(error);
    return toVocabulary(data as VocabularyRow);
  },

  async update(id: string, draft: VocabularyDraft): Promise<Vocabulary> {
    const changes: Database["public"]["Tables"]["vocabulary"]["Update"] =
      toVocabularyRow(draft);

    const { data, error } = await getSupabase()
      .from("vocabulary")
      .update(changes)
      .eq("id", id)
      .select()
      .single();

    if (error) throw vocabularyWriteError(error);
    return toVocabulary(data as VocabularyRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from("vocabulary").delete().eq("id", id);

    if (error) throw error;
  },

  async recordLearningResult(
    review: Omit<Review, "id">,
    state: Vocabulary["state"],
    nextReviewAt: string,
  ): Promise<{ review: Review; word: Vocabulary }> {
    const { data, error } = await getSupabase().rpc("record_learning_result", {
      p_vocabulary_id: review.vocabularyId,
      p_result: review.result,
      p_review_type: review.reviewType,
      p_reviewed_at: review.reviewedAt,
      p_next_review_at: nextReviewAt,
      p_state: state,
    });

    if (error) throw error;
    const saved = data as unknown as {
      review: ReviewRow;
      vocabulary: VocabularyRow;
    };
    return {
      review: toReview(saved.review),
      word: toVocabulary(saved.vocabulary),
    };
  },

  async recordLearningResults(
    results: Array<{
      review: Omit<Review, "id">;
      state: Vocabulary["state"];
      nextReviewAt: string;
    }>,
  ): Promise<Array<{ review: Review; word: Vocabulary }>> {
    const payload = results.map(({ review, state, nextReviewAt }) => ({
      vocabulary_id: review.vocabularyId,
      result: review.result,
      review_type: review.reviewType,
      reviewed_at: review.reviewedAt,
      next_review_at: nextReviewAt,
      state,
    }));

    const { data, error } = await getSupabase().rpc("record_learning_results", {
      p_results: payload,
    });

    if (error) throw error;

    const saved = data as unknown as Array<{
      review: ReviewRow;
      vocabulary: VocabularyRow;
    }>;

    return saved.map((result) => ({
      review: toReview(result.review),
      word: toVocabulary(result.vocabulary),
    }));
  },
};
