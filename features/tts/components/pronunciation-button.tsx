"use client";

import { useState } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";
import { toast } from "sonner";
import type { LearningLanguage, Vocabulary } from "@/features/learning/types";
import { createTtsProvider } from "@/features/tts/provider";
import { buildAudioSourceText } from "../audio-source";

const provider = createTtsProvider(
  process.env.NEXT_PUBLIC_TTS_PROVIDER === "google" ? "google" : "browser",
);
console.log(process.env.NEXT_PUBLIC_TTS_PROVIDER);
console.log(provider);

export function PronunciationButton({
  word,
  lexiconId,
  language,
}: {
  word: Vocabulary;
  lexiconId: string;
  language: LearningLanguage;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = buildAudioSourceText({
    language,
    word: word.word,
    type: word.type,
    grammar: word.grammar,
    example: word.example,
  });

  const play = async () => {
    setLoading(true);
    setError(null);

    try {
      await provider.speak({ lexiconId, text, language });
    } catch (playError) {
      const message =
        playError instanceof Error
          ? playError.message
          : "Could not play pronunciation.";
      setError(message);
      toast.error("Pronunciation failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={`icon-button size-9 shrink-0 ${
        error ? "text-(--danger)" : "text-(--blue)"
      }`}
      disabled={loading}
      onClick={play}
      aria-label={error ? `Retry pronunciation. ${error}` : "Play pronunciation"}
      title={error ?? "Play pronunciation"}
    >
      {loading ? (
        <LoaderCircle
          className="animate-spin"
          size={17}
        />
      ) : (
        <Volume2 size={17} />
      )}
    </button>
  );
}
