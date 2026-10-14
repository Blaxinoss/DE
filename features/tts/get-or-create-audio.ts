import "server-only";

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { buildAudioSourceText } from "@/features/tts/audio-source";
import type { LearningLanguage, WordType } from "@/features/learning/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const AUDIO_BUCKET = "lexicon-audio";
const AUDIO_CONFIG_VERSION = 1;

let googleClient: TextToSpeechClient | undefined;

function getGoogleClient(): TextToSpeechClient {
  if (googleClient) return googleClient;

  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const hasExplicitCredentials = Boolean(clientEmail || privateKey || projectId);

  if (
    hasExplicitCredentials &&
    (!clientEmail ||
      !projectId ||
      !privateKey?.startsWith("-----BEGIN PRIVATE KEY-----"))
  ) {
    throw new Error("GOOGLE_TTS_NOT_CONFIGURED");
  }

  googleClient =
    clientEmail && privateKey && projectId
      ? new TextToSpeechClient({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      })
      : new TextToSpeechClient();

  return googleClient;
}

function getPublicAudioUrl(path: string): string {
  const { data } = createAdminSupabaseClient()
    .storage.from(AUDIO_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function synthesizeMp3(
  text: string,
  language: LearningLanguage,
): Promise<Uint8Array> {
  const languageCode = language === "de" ? "de-DE" : "en-US";
  const [response] = await getGoogleClient().synthesizeSpeech(
    {
      input: { text },
      voice: { languageCode, ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
    },
    { timeout: 30_000 },
  );

  if (!response.audioContent) throw new Error("EMPTY_TTS_RESPONSE");
  return typeof response.audioContent === "string"
    ? Uint8Array.from(Buffer.from(response.audioContent, "base64"))
    : Uint8Array.from(response.audioContent);
}

/** Returns cached audio, or generates, stores, and then returns it. */
export async function getOrCreateAudio(lexiconId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const { data: entry, error: entryError } = await admin
    .from("global_lexicon")
    .select(
      "id, language, word, type, grammar_json, example, audio_path, audio_source_text, audio_config_version",
    )
    .eq("id", lexiconId)
    .maybeSingle();

  if (entryError) throw entryError;
  if (!entry) throw new Error("LEXICON_ENTRY_NOT_FOUND");

  const language = entry.language as LearningLanguage;
  const sourceText = buildAudioSourceText({
    language,
    word: entry.word,
    type: entry.type as WordType,
    grammar:
      entry.grammar_json &&
        typeof entry.grammar_json === "object" &&
        !Array.isArray(entry.grammar_json)
        ? entry.grammar_json
        : {},
    example: entry.example,
  });

  const cacheIsCurrent =
    entry.audio_path !== null &&
    entry.audio_source_text === sourceText &&
    entry.audio_config_version === AUDIO_CONFIG_VERSION;

  if (cacheIsCurrent) return getPublicAudioUrl(entry.audio_path!);

  const audio = await synthesizeMp3(sourceText, language);
  const audioPath = `${language}/${entry.id}/v${AUDIO_CONFIG_VERSION}.mp3`;
  const { error: uploadError } = await admin.storage
    .from(AUDIO_BUCKET)
    .upload(audioPath, audio, {
      contentType: "audio/mpeg",
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { error: updateError } = await admin
    .from("global_lexicon")
    .update({
      audio_path: audioPath,
      audio_source_text: sourceText,
      audio_config_version: AUDIO_CONFIG_VERSION,
      audio_generated_at: new Date().toISOString(),
    })
    .eq("id", entry.id);

  if (updateError) throw updateError;
  return getPublicAudioUrl(audioPath);
}
