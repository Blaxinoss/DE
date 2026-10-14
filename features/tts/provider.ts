"use client";

import type { LearningLanguage } from "@/features/learning/types";
import { createBrowserTtsProvider } from "./providers/browser-provider";
import { createGoogleTtsProvider } from "./providers/google-provider";

export type TtsProviderName = "browser" | "google";

export type SpeakInput = {
  lexiconId: string;
  text: string;
  language: LearningLanguage;
};

export interface TtsProvider {
  speak(input: SpeakInput): Promise<void>;
  stop(): void;
}

/** The UI uses only this factory, so changing providers does not change the button. */
export function createTtsProvider(provider: TtsProviderName): TtsProvider {
  switch (provider) {
    case "browser":
      console.log("Browser__TTS");
      return createBrowserTtsProvider();
    case "google":
      console.log("GOOGLE__TTS");
      return createGoogleTtsProvider();
  }
}
