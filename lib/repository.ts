import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Review, Vocabulary, VocabularyDraft } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);
const client: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, key!) : null;

const toWord = (row: Record<string, unknown>): Vocabulary => ({
  id: String(row.id), word: String(row.word), meaningAr: String(row.meaning_ar ?? ""), type: row.type as Vocabulary["type"],
  target: row.target as Vocabulary["target"], state: row.state as Vocabulary["state"], grammar: (row.grammar_json ?? {}) as Record<string, unknown>,
  commonness: row.commonness as string | null, chunk: row.chunk as string | null, example: row.example as string | null,
  createdAt: String(row.created_at), updatedAt: String(row.updated_at),
});
const toReview = (row: Record<string, unknown>): Review => ({
  id: String(row.id), vocabularyId: String(row.vocabulary_id), result: row.result as Review["result"], reviewType: row.review_type as Review["reviewType"],
  reviewedAt: String(row.reviewed_at), nextReviewAt: String(row.next_review_at),
});
const toRow = (draft: VocabularyDraft) => ({
  word: draft.word, meaning_ar: draft.meaningAr, type: draft.type, target: draft.target, state: draft.state,
  grammar_json: draft.grammar, commonness: draft.commonness, chunk: draft.chunk, example: draft.example,
});

const now = new Date().toISOString();
const demoWords: Vocabulary[] = [
  { id: "demo-1", word: "vermeiden", meaningAr: "يتجنب", type: "verb", target: "active", state: "slow_recall", grammar: { past: "vermied", auxiliary: "haben", partizipII: "vermieden", objectCase: "Akkusativ" }, commonness: "common", chunk: "Fehler vermeiden", example: "Ich versuche, unnötige Fehler zu vermeiden.", createdAt: now, updatedAt: now },
  { id: "demo-2", word: "verantwortlich", meaningAr: "مسؤول", type: "adjective", target: "active", state: "passive", grammar: {}, commonness: "common", chunk: "für etwas verantwortlich sein", example: "Wer ist für diese Entscheidung verantwortlich?", createdAt: now, updatedAt: now },
  { id: "demo-3", word: "die Gewohnheit", meaningAr: "العادة", type: "noun", target: "passive", state: "recognition", grammar: { article: "die", plural: "die Gewohnheiten" }, commonness: "common", chunk: "eine Gewohnheit ändern", example: "Es braucht Zeit, eine Gewohnheit zu ändern.", createdAt: now, updatedAt: now },
];
const DEMO_WORDS_KEY = "wortweg-demo-words";
const DEMO_REVIEWS_KEY = "wortweg-demo-reviews";
function readDemo<T>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = localStorage.getItem(storageKey);
  return value ? JSON.parse(value) as T : fallback;
}
function writeDemo(storageKey: string, value: unknown) { localStorage.setItem(storageKey, JSON.stringify(value)); }

export const repository = {
  async load(): Promise<{ words: Vocabulary[]; reviews: Review[] }> {
    if (!client) return { words: readDemo(DEMO_WORDS_KEY, demoWords), reviews: readDemo(DEMO_REVIEWS_KEY, []) };
    const [{ data: words, error: wordsError }, { data: reviews, error: reviewsError }] = await Promise.all([
      client.from("vocabulary").select("*").order("created_at", { ascending: false }),
      client.from("reviews").select("*").order("reviewed_at", { ascending: false }),
    ]);
    if (wordsError || reviewsError) throw wordsError ?? reviewsError;
    return { words: (words ?? []).map(toWord), reviews: (reviews ?? []).map(toReview) };
  },
  async create(draft: VocabularyDraft): Promise<Vocabulary> {
    if (!client) {
      const stamp = new Date().toISOString();
      const word = { ...draft, id: crypto.randomUUID(), createdAt: stamp, updatedAt: stamp };
      writeDemo(DEMO_WORDS_KEY, [word, ...readDemo<Vocabulary[]>(DEMO_WORDS_KEY, demoWords)]); return word;
    }
    const { data, error } = await client.from("vocabulary").insert(toRow(draft)).select().single();
    if (error) throw error; return toWord(data);
  },
  async update(id: string, draft: VocabularyDraft): Promise<Vocabulary> {
    if (!client) {
      const words = readDemo<Vocabulary[]>(DEMO_WORDS_KEY, demoWords);
      const word = { ...draft, id, createdAt: words.find((item) => item.id === id)?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
      writeDemo(DEMO_WORDS_KEY, words.map((item) => item.id === id ? word : item)); return word;
    }
    const { data, error } = await client.from("vocabulary").update(toRow(draft)).eq("id", id).select().single();
    if (error) throw error; return toWord(data);
  },
  async remove(id: string): Promise<void> {
    if (!client) {
      writeDemo(DEMO_WORDS_KEY, readDemo<Vocabulary[]>(DEMO_WORDS_KEY, demoWords).filter((word) => word.id !== id));
      writeDemo(DEMO_REVIEWS_KEY, readDemo<Review[]>(DEMO_REVIEWS_KEY, []).filter((review) => review.vocabularyId !== id)); return;
    }
    const { error } = await client.from("vocabulary").delete().eq("id", id); if (error) throw error;
  },
  async addReview(review: Omit<Review, "id">): Promise<Review> {
    if (!client) {
      const item = { ...review, id: crypto.randomUUID() };
      writeDemo(DEMO_REVIEWS_KEY, [item, ...readDemo<Review[]>(DEMO_REVIEWS_KEY, [])]); return item;
    }
    const { data, error } = await client.from("reviews").insert({ vocabulary_id: review.vocabularyId, result: review.result, review_type: review.reviewType, reviewed_at: review.reviewedAt, next_review_at: review.nextReviewAt }).select().single();
    if (error) throw error; return toReview(data);
  },
};
