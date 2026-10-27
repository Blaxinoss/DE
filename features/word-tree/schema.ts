import { z } from "zod";
import { learningLanguages } from "@/features/learning/types";

export const verbFamilyQuerySchema = z.object({
  language: z.enum(learningLanguages),
  lemma: z.string().trim().min(1).max(100),
  lexiconId: z.uuid().nullable(),
});

export const verbForestQuerySchema = z.object({
  language: z.enum(learningLanguages),
});

export type VerbFamilyQuery = z.infer<typeof verbFamilyQuerySchema>;
export type VerbForestQuery = z.infer<typeof verbForestQuerySchema>;
