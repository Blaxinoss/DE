CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.global_lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('de', 'en')),
  sense_key TEXT NOT NULL,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  meaning_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('noun', 'verb', 'adjective', 'adverb', 'expression', 'other')
  ),
  grammar_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  commonness TEXT CHECK (
    commonness IS NULL OR
    commonness IN ('very_common', 'common', 'less_common', 'rare')
  ),
  chunk TEXT,
  example TEXT,
  search_terms TEXT[] NOT NULL DEFAULT '{}',
  model TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (language, sense_key)
);

CREATE INDEX global_lexicon_language_word_idx
ON public.global_lexicon (language, normalized_word);

CREATE INDEX global_lexicon_word_trgm_idx
ON public.global_lexicon
USING GIN (normalized_word extensions.gin_trgm_ops);

DROP TRIGGER IF EXISTS global_lexicon_set_updated_at
ON public.global_lexicon;

CREATE TRIGGER global_lexicon_set_updated_at
BEFORE UPDATE ON public.global_lexicon
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.search_global_lexicon(
  p_language TEXT,
  p_query TEXT,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  language TEXT,
  sense_key TEXT,
  word TEXT,
  meaning_ar TEXT,
  type TEXT,
  grammar_json JSONB,
  commonness TEXT,
  chunk TEXT,
  example TEXT,
  search_terms TEXT[],
  score DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH input AS (
    SELECT LOWER(
      REGEXP_REPLACE(TRIM(p_query), '[[:space:]]+', ' ', 'g')
    ) AS query
  ),
  ranked AS (
    SELECT
      lexicon.id,
      lexicon.language,
      lexicon.sense_key,
      lexicon.word,
      lexicon.meaning_ar,
      lexicon.type,
      lexicon.grammar_json,
      lexicon.commonness,
      lexicon.chunk,
      lexicon.example,
      lexicon.search_terms,
      CASE
        WHEN lexicon.normalized_word = input.query THEN 1.0
        WHEN input.query = ANY(lexicon.search_terms) THEN 0.98
        WHEN lexicon.normalized_word LIKE input.query || '%' THEN 0.92
        WHEN EXISTS (
          SELECT 1
          FROM UNNEST(lexicon.search_terms) AS term
          WHERE term LIKE input.query || '%'
        ) THEN 0.9
        ELSE GREATEST(
          extensions.similarity(lexicon.normalized_word, input.query),
          COALESCE((
            SELECT MAX(extensions.similarity(term, input.query))
            FROM UNNEST(lexicon.search_terms) AS term
          ), 0)
        )
      END AS score
    FROM public.global_lexicon AS lexicon
    CROSS JOIN input
    WHERE
      lexicon.language = p_language
      AND input.query <> ''
  )
  SELECT *
  FROM ranked
  WHERE ranked.score >= 0.34
  ORDER BY ranked.score DESC, ranked.word ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;

ALTER TABLE public.global_lexicon ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.global_lexicon FROM anon, authenticated;
GRANT SELECT ON public.global_lexicon TO authenticated;

DROP POLICY IF EXISTS "global_lexicon_select" ON public.global_lexicon;
CREATE POLICY "global_lexicon_select"
ON public.global_lexicon
FOR SELECT
TO authenticated
USING (TRUE);

REVOKE ALL ON FUNCTION public.search_global_lexicon(TEXT, TEXT, INTEGER)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_global_lexicon(TEXT, TEXT, INTEGER)
TO authenticated;
