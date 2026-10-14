"use client";

import { getOrCreateAudioAction } from "../actions";
import type { TtsProvider } from "../provider";

export function createGoogleTtsProvider(): TtsProvider {
  let currentAudio: HTMLAudioElement | null = null;

  return {
    async speak(input) {
      currentAudio?.pause();

      const result = await getOrCreateAudioAction({
        lexiconId: input.lexiconId,
      });

      if (!result.ok) throw new Error(result.message);

      const audio = new Audio(result.audioUrl);
      currentAudio = audio;

      try {
        await audio.play();
      } finally {
        if (currentAudio === audio) currentAudio = null;
      }
    },

    stop() {
      currentAudio?.pause();
      currentAudio = null;
    },
  };
}
