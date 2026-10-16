export const sharedGrammarKeys = [
  "synonyms",
  "commonAlternative",
  "usageNote",
  "register",
  "commonCollocation",
  "notes",
] as const;

export const grammarKeysByType = {
  noun: [
    "article",
    "singular",
    "plural",
    "gender",
    "countability",
    "commonVerb",
    ...sharedGrammarKeys,
  ],
  verb: [
    "present",
    "thirdPerson",
    "past",
    "partizipII",
    "pastParticiple",
    "gerund",
    "auxiliary",
    "reflexive",
    "separable",
    "preposition",
    "objectCase",
    "transitivity",
    ...sharedGrammarKeys,
  ],
  adjective: [
    "comparative",
    "superlative",
    "preposition",
    "objectCase",
    "position",
    ...sharedGrammarKeys,
  ],
  adverb: ["category", "position", "comparative", "superlative", ...sharedGrammarKeys],
  expression: ["usagePattern", "literalMeaning", "variation", ...sharedGrammarKeys],
  other: sharedGrammarKeys,
} as const;

export const grammarFactKeys = [
  ...new Set(Object.values(grammarKeysByType).flat()),
] as [string, ...string[]];
