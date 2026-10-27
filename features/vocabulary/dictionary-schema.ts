import { z } from "zod";
import { learningLanguages, wordTypes } from "@/features/learning/types";
import { grammarKeysByType } from "@/features/vocabulary/grammar-config";

export const WORD_DATA_VERSION = 3;
export const MAX_WORD_SUGGESTIONS = 3;

export const wordQuerySchema = z.object({
  language: z.enum(learningLanguages),
  query: z.string().trim().min(1).max(100),
});

const grammarFactSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-zA-Z0-9]*$/),
  value: z.string().min(1).max(300),
});

const verbFamilyPathSchema = z.array(z.string().trim().min(1).max(100)).min(1).max(8);

export const generatedWordSchema = z
  .object({
    senseKey: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    word: z.string().trim().min(1).max(100),
    meaningAr: z.string().trim().min(1).max(500),
    type: z.enum(wordTypes),
    grammarFacts: z.array(grammarFactSchema).max(16),
    commonness: z.enum(["very_common", "common", "less_common", "rare"]).nullable(),
    chunk: z.string().trim().min(1).max(500).nullable(),
    example: z.string().trim().min(1).max(1000).nullable(),
    searchTerms: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    verbFamilyPath: verbFamilyPathSchema.nullable(),
  })
  .superRefine((word, context) => {
    const allowedKeys = new Set<string>(grammarKeysByType[word.type]);
    const seenKeys = new Set<string>();

    word.grammarFacts.forEach((fact, index) => {
      if (!allowedKeys.has(fact.key)) {
        context.addIssue({
          code: "custom",
          message: `${fact.key} is not valid for ${word.type} entries`,
          path: ["grammarFacts", index, "key"],
        });
      }
      if (seenKeys.has(fact.key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate grammar fact: ${fact.key}`,
          path: ["grammarFacts", index, "key"],
        });
      }
      seenKeys.add(fact.key);
    });

    if (word.type !== "verb" && word.verbFamilyPath !== null) {
      context.addIssue({
        code: "custom",
        message: "Only verbs can belong to a verb family",
        path: ["verbFamilyPath"],
      });
    }

    if (word.verbFamilyPath) {
      const normalizedPath = word.verbFamilyPath.map(normalizeFamilyLemma);

      if (new Set(normalizedPath).size !== normalizedPath.length) {
        context.addIssue({
          code: "custom",
          message: "A verb-family path cannot repeat a lemma",
          path: ["verbFamilyPath"],
        });
      }
    }
  });

export const generatedWordsSchema = z
  .object({
    suggestions: z.array(generatedWordSchema).min(1).max(MAX_WORD_SUGGESTIONS),
  })
  .superRefine((output, context) => {
    const keys = output.suggestions.map((suggestion) => suggestion.senseKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Suggestion keys must be unique",
        path: ["suggestions"],
      });
    }

    const pathsByVerb = new Map<string, string>();
    output.suggestions.forEach((suggestion, index) => {
      if (suggestion.type !== "verb" || !suggestion.verbFamilyPath) return;

      const verb = normalizeFamilyLemma(suggestion.word.replace(/^sich\s+/i, ""));
      const path = suggestion.verbFamilyPath.map(normalizeFamilyLemma).join("\u0000");
      const existingPath = pathsByVerb.get(verb);

      if (existingPath && existingPath !== path) {
        context.addIssue({
          code: "custom",
          message: "Senses of the same verb must share one family path",
          path: ["suggestions", index, "verbFamilyPath"],
        });
      } else {
        pathsByVerb.set(verb, path);
      }
    });
  });

export type WordQuery = z.infer<typeof wordQuerySchema>;
export type GeneratedWord = z.infer<typeof generatedWordSchema>;

export function parseGeneratedWords(
  input: unknown,
  language: (typeof learningLanguages)[number],
) {
  return generatedWordsSchema
    .superRefine((output, context) => {
      output.suggestions.forEach((word, index) => {
        const path = word.verbFamilyPath;

        if (word.type === "verb" && path === null) {
          context.addIssue({
            code: "custom",
            message: "Verbs must describe their verb-family path",
            path: ["suggestions", index, "verbFamilyPath"],
          });
        }

        if (path) {
          const expectedLemma = normalizeFamilyLemma(
            word.word.replace(/^sich\s+/i, ""),
          );
          if (normalizeFamilyLemma(path.at(-1) ?? "") !== expectedLemma) {
            context.addIssue({
              code: "custom",
              message: "The verb-family path must end with the entry lemma",
              path: ["suggestions", index, "verbFamilyPath"],
            });
          }
        }
      });
    })
    .parse(input);
}

function normalizeFamilyLemma(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export type WordSuggestion = {
  id: string | null;
  senseKey: string;
  word: string;
  meaningAr: string;
  type: (typeof wordTypes)[number];
  grammar: Record<string, unknown>;
  commonness: string | null;
  chunk: string | null;
  example: string | null;
  searchTerms: string[];
  score: number | null;
  verbFamilyPath: string[] | null;
};
