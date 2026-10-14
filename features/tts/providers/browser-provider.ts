"use client";

import { languageDetails } from "@/features/learning/language-config";
import type { LearningLanguage } from "@/features/learning/types";
import type { TtsProvider } from "../provider";

const preferredVoices: Record<LearningLanguage, string[]> = {
  en: [
    "Microsoft Aria Online (Natural)",
    "Google UK English Female",
    "Google US English",
  ],
  de: ["Microsoft Katja Online (Natural)", "Google Deutsch"],
};

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

function availableVoices(): Promise<SpeechSynthesisVoice[]> {
  const current = window.speechSynthesis.getVoices();
  if (current.length > 0) return Promise.resolve(current);

  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    const timeout = window.setTimeout(finish, 500);
    window.speechSynthesis.addEventListener("voiceschanged", finish);
  });
}

function chooseVoice(
  voices: SpeechSynthesisVoice[],
  language: LearningLanguage,
): SpeechSynthesisVoice | undefined {
  const languagePrefix = `${language.toLowerCase()}-`;
  const matchingLanguage = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(languagePrefix),
  );

  for (const preferredName of preferredVoices[language]) {
    const preferred = matchingLanguage.find((voice) =>
      voice.name.toLowerCase().includes(preferredName.toLowerCase()),
    );
    if (preferred) return preferred;
  }

  const exactLocale = languageDetails[language].locale.toLowerCase();
  return (
    matchingLanguage.find((voice) => voice.lang.toLowerCase() === exactLocale) ??
    matchingLanguage[0]
  );
}

export function createBrowserTtsProvider(): TtsProvider {
  return {
    async speak({ text, language }) {
      if (!isSupported()) {
        throw new Error("Speech synthesis is not supported by this browser.");
      }

      window.speechSynthesis.cancel();
      const voice = chooseVoice(await availableVoices(), language);

      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang ?? languageDetails[language].locale;
        if (voice) utterance.voice = voice;

        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
          if (event.error === "interrupted" || event.error === "canceled") {
            resolve();
            return;
          }

          reject(new Error(`Browser speech failed: ${event.error}`));
        };
        window.speechSynthesis.speak(utterance);
      });
    },

    stop() {
      if (isSupported()) window.speechSynthesis.cancel();
    },
  };
}
