import deA1 from "./data/de/A1.json";
import deA2 from "./data/de/A2.json";
import deB1 from "./data/de/B1.json";
import deB2 from "./data/de/B2.json";

import enA1 from "./data/en/A1.json";
import enA2 from "./data/en/A2.json";
import enB1 from "./data/en/B1.json";
import enB2 from "./data/en/B2.json";

export const seedPacks = {
  de: {
    A1: deA1,
    A2: deA2,
    B1: deB1,
    B2: deB2,
  },
  en: {
    A1: enA1,
    A2: enA2,
    B1: enB1,
    B2: enB2,
  },
} as const;

export const allSeedEntries = Object.values(seedPacks).flatMap((languagePacks) =>
  Object.values(languagePacks).flat(),
);
