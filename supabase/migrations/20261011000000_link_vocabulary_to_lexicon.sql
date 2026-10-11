ALTER TABLE public.vocabulary
ADD COLUMN lexicon_id UUID REFERENCES public.global_lexicon(id) ON DELETE SET NULL;

UPDATE public.vocabulary AS vocabulary
SET lexicon_id = (
  SELECT lexicon.id
  FROM public.global_lexicon AS lexicon
  WHERE
    lexicon.language = vocabulary.language
    AND lexicon.normalized_word = LOWER(
      REGEXP_REPLACE(TRIM(vocabulary.word), '[[:space:]]+', ' ', 'g')
    )
    AND LOWER(TRIM(lexicon.meaning_ar)) = LOWER(TRIM(vocabulary.meaning_ar))
  ORDER BY lexicon.created_at ASC
  LIMIT 1
)
WHERE vocabulary.lexicon_id IS NULL;

DROP INDEX IF EXISTS public.vocabulary_user_language_word_idx;

CREATE UNIQUE INDEX vocabulary_user_lexicon_idx
ON public.vocabulary (user_id, lexicon_id);

CREATE UNIQUE INDEX vocabulary_user_language_custom_word_idx
ON public.vocabulary (user_id, language, LOWER(TRIM(word)))
WHERE lexicon_id IS NULL;
