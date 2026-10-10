import { LearningLanguage } from "./types";

type LanguageDetails = {
  code: LearningLanguage;
  name: string;
  nativeName: string;
  locale: string;
  adjective: string;
  wordPlaceholder: string;
  chunkPlaceholder: string;
  examplePlaceholder: string;
  activationTask: {
    title: string;
    instructions: string;
    answerPlaceholder: string;
  };
};

export const languageDetails: Record<LearningLanguage, LanguageDetails> = {
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    locale: "de-DE",
    adjective: "German",
    wordPlaceholder: "vermeiden",
    chunkPlaceholder: "Fehler vermeiden",
    examplePlaceholder: "Ich versuche, unnötige Fehler zu vermeiden.",
    activationTask: {
      title: "Describe a difficult decision.",
      instructions: "Write 3–5 German sentences and use the target words naturally.",
      answerPlaceholder: "Ich musste mich entscheiden, ob…",
    },
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    locale: "en-US",
    adjective: "English",
    wordPlaceholder: "avoid",
    chunkPlaceholder: "avoid making a mistake",
    examplePlaceholder: "I try to avoid making the same mistake twice.",
    activationTask: {
      title: "Describe a difficult decision.",
      instructions: "Write 3–5 English sentences and use the target words naturally.",
      answerPlaceholder: "I had to decide whether…",
    },
  },
};
