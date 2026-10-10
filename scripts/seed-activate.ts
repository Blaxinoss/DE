import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const requestedEmail = process.env.SEED_USER_EMAIL?.trim().toLocaleLowerCase();

if (!supabaseUrl || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
}

const supabase = createClient<Database>(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

if (usersError) throw usersError;

const user = requestedEmail
  ? usersData.users.find(
      (candidate) => candidate.email?.toLocaleLowerCase() === requestedEmail,
    )
  : usersData.users.length === 1
    ? usersData.users[0]
    : null;

if (!user) {
  throw new Error(
    requestedEmail
      ? `No user found for ${requestedEmail}.`
      : "Set SEED_USER_EMAIL because this project contains multiple users.",
  );
}

const dueAt = new Date(Date.now() - 60_000).toISOString();
const seeds: Database["public"]["Tables"]["vocabulary"]["Insert"][] = [
  {
    user_id: user.id,
    language: "de",
    word: "bewältigen",
    meaning_ar: "يتغلّب على / يتعامل بنجاح مع",
    type: "verb",
    target: "active",
    state: "recall",
    grammar_json: {
      past: "bewältigte",
      perfect: "hat bewältigt",
      case: "Akkusativ",
    },
    commonness: "common",
    chunk: "eine Herausforderung bewältigen",
    example: "Gemeinsam können wir diese Herausforderung bewältigen.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "ermöglichen",
    meaning_ar: "يُمكّن / يتيح",
    type: "verb",
    target: "active",
    state: "recall",
    grammar_json: {
      past: "ermöglichte",
      perfect: "hat ermöglicht",
      pattern: "jemandem etwas ermöglichen",
    },
    commonness: "common",
    chunk: "eine bessere Planung ermöglichen",
    example: "Die neue Funktion ermöglicht eine bessere Planung.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "überzeugen",
    meaning_ar: "يُقنع",
    type: "verb",
    target: "active",
    state: "recall",
    grammar_json: {
      past: "überzeugte",
      perfect: "hat überzeugt",
      pattern: "jemanden von etwas überzeugen",
    },
    commonness: "common",
    chunk: "jemanden von einer Idee überzeugen",
    example: "Sie konnte mich von ihrer Idee überzeugen.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "berücksichtigen",
    meaning_ar: "يراعي / يأخذ في الاعتبار",
    type: "verb",
    target: "active",
    state: "recall",
    grammar_json: {
      past: "berücksichtigte",
      perfect: "hat berücksichtigt",
      case: "Akkusativ",
    },
    commonness: "common",
    chunk: "alle Möglichkeiten berücksichtigen",
    example: "Wir müssen alle wichtigen Faktoren berücksichtigen.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "feststellen",
    meaning_ar: "يلاحظ / يثبت / يقرّر",
    type: "verb",
    target: "active",
    state: "recall",
    grammar_json: {
      separable: true,
      past: "stellte fest",
      perfect: "hat festgestellt",
    },
    commonness: "very common",
    chunk: "einen Unterschied feststellen",
    example: "Ich habe einen deutlichen Unterschied festgestellt.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "beitragen",
    meaning_ar: "يساهم",
    type: "verb",
    target: "active",
    state: "recall",
    grammar_json: {
      separable: true,
      past: "trug bei",
      perfect: "hat beigetragen",
      pattern: "zu etwas beitragen",
    },
    commonness: "common",
    chunk: "zu einer Lösung beitragen",
    example: "Jeder kann zu einer guten Lösung beitragen.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "Voraussetzung",
    meaning_ar: "شرط مسبق / متطلّب",
    type: "noun",
    target: "active",
    state: "recall",
    grammar_json: {
      article: "die",
      singular: "Voraussetzung",
      plural: "Voraussetzungen",
    },
    commonness: "common",
    chunk: "eine wichtige Voraussetzung",
    example: "Geduld ist eine wichtige Voraussetzung für den Erfolg.",
    next_review_at: dueAt,
  },
  {
    user_id: user.id,
    language: "de",
    word: "Auswirkung",
    meaning_ar: "تأثير / نتيجة",
    type: "noun",
    target: "active",
    state: "recall",
    grammar_json: {
      article: "die",
      singular: "Auswirkung",
      plural: "Auswirkungen",
    },
    commonness: "common",
    chunk: "Auswirkungen auf etwas haben",
    example: "Diese Entscheidung hat große Auswirkungen auf das Projekt.",
    next_review_at: dueAt,
  },
];

const { data: existingWords, error: existingError } = await supabase
  .from("vocabulary")
  .select("word")
  .eq("user_id", user.id)
  .eq("language", "de");

if (existingError) throw existingError;

const existing = new Set(
  existingWords.map((item) => item.word.trim().toLocaleLowerCase("de")),
);
const missing = seeds.filter(
  (seed) => !existing.has(seed.word.trim().toLocaleLowerCase("de")),
);

if (missing.length) {
  const { error: insertError } = await supabase.from("vocabulary").insert(missing);

  if (insertError) throw insertError;
}

const { data: readyWords, error: readyError } = await supabase
  .from("vocabulary")
  .select("word, state, target, next_review_at")
  .eq("user_id", user.id)
  .eq("language", "de")
  .eq("target", "active")
  .eq("state", "recall")
  .lte("next_review_at", new Date().toISOString())
  .order("word");

if (readyError) throw readyError;

console.log(`Inserted ${missing.length} words for ${user.email ?? user.id}.`);
console.log(`Activation-ready now: ${readyWords.length}.`);
console.table(readyWords);
