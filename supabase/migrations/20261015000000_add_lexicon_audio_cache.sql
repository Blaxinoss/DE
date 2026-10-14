ALTER TABLE public.global_lexicon
ADD COLUMN audio_path TEXT,
ADD COLUMN audio_source_text TEXT,
ADD COLUMN audio_config_version INTEGER,
ADD COLUMN audio_generated_at TIMESTAMPTZ;

ALTER TABLE public.global_lexicon
ADD CONSTRAINT global_lexicon_audio_path_not_blank CHECK (
  audio_path IS NULL OR CHAR_LENGTH(TRIM(audio_path)) > 0
),
ADD CONSTRAINT global_lexicon_audio_source_text_not_blank CHECK (
  audio_source_text IS NULL OR CHAR_LENGTH(TRIM(audio_source_text)) > 0
),
ADD CONSTRAINT global_lexicon_audio_config_version_positive CHECK (
  audio_config_version IS NULL OR audio_config_version > 0
),
ADD CONSTRAINT global_lexicon_audio_cache_complete CHECK (
  (
    audio_path IS NULL
    AND audio_source_text IS NULL
    AND audio_config_version IS NULL
    AND audio_generated_at IS NULL
  )
  OR
  (
    audio_path IS NOT NULL
    AND audio_source_text IS NOT NULL
    AND audio_config_version IS NOT NULL
    AND audio_generated_at IS NOT NULL
  )
);
