import type { LearningLanguage } from "@/features/learning/types";

export type VerbTreeSense = {
  lexiconId: string;
  senseKey: string;
  word: string;
  meaningAr: string;
  grammar: Record<string, unknown>;
  commonness: string | null;
  chunk: string | null;
  example: string | null;
  inVocabulary: boolean;
};

export type VerbFamilyNode = {
  id: string;
  language: LearningLanguage;
  lemma: string;
  normalizedLemma: string;
  parentId: string | null;
  rootId: string;
  depth: number;
  unlocked: boolean;
  senses: VerbTreeSense[];
};

export type VerbFamily = {
  rootId: string;
  requestedLemma: string;
  nodes: VerbFamilyNode[];
};

export type VerbFamilyActionResult =
  { ok: true; family: VerbFamily | null } | { ok: false; error: string };

export type VerbForestActionResult =
  { ok: true; families: VerbFamily[] } | { ok: false; error: string };
