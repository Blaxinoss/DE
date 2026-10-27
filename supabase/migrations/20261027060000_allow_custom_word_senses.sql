DROP INDEX IF EXISTS public.vocabulary_user_language_custom_word_idx;

CREATE UNIQUE INDEX vocabulary_user_language_custom_sense_idx
ON public.vocabulary (
  user_id,
  language,
  LOWER(TRIM(word)),
  LOWER(TRIM(meaning_ar))
)
WHERE lexicon_id IS NULL;
