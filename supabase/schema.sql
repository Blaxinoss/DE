CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ============================================================================
-- Tables Creation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vocabulary (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language     TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de', 'en')),
  word         TEXT NOT NULL,
  meaning_ar   TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL CHECK (type IN ('noun', 'verb', 'adjective', 'adverb', 'expression', 'other')),
  target       TEXT NOT NULL CHECK (target IN ('passive', 'active')),
  state        TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'recall', 'active')),
  grammar_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  commonness   TEXT,
  chunk        TEXT,
  example      TEXT,
  next_review_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    vocabulary_id UUID NOT NULL REFERENCES public.vocabulary (id) ON DELETE CASCADE,
    result TEXT NOT NULL CHECK (
        result IN (
            'instant',
            'slow',
            'hint',
            'wrong',
            'easy',
            'effort',
            'needed_help',
            'could_not_use'
        )
    ),
    review_type TEXT NOT NULL CHECK (
        review_type IN ('review', 'activate')
    ),
    activation_attempt_id UUID,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('de', 'en')),
  sense_key TEXT NOT NULL,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  meaning_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('noun', 'verb', 'adjective', 'adverb', 'expression', 'other')),
  grammar_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  commonness TEXT CHECK (commonness IS NULL OR commonness IN ('very_common', 'common', 'less_common', 'rare')),
  chunk TEXT,
  example TEXT,
  audio_path TEXT,
  audio_source_text TEXT,
  audio_config_version INTEGER,
  audio_generated_at TIMESTAMPTZ,
  search_terms TEXT[] NOT NULL DEFAULT '{}',
  model TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT global_lexicon_audio_path_not_blank CHECK (
    audio_path IS NULL OR CHAR_LENGTH(TRIM(audio_path)) > 0
  ),
  CONSTRAINT global_lexicon_audio_source_text_not_blank CHECK (
    audio_source_text IS NULL OR CHAR_LENGTH(TRIM(audio_source_text)) > 0
  ),
  CONSTRAINT global_lexicon_audio_config_version_positive CHECK (
    audio_config_version IS NULL OR audio_config_version > 0
  ),
  CONSTRAINT global_lexicon_audio_cache_complete CHECK (
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
  ),
  UNIQUE (language, sense_key)
);

ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS lexicon_id UUID REFERENCES public.global_lexicon (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY DEFAULT auth.uid () REFERENCES auth.users (id) ON DELETE CASCADE,
    learning_language TEXT NOT NULL DEFAULT 'de' CHECK (
        learning_language IN ('de', 'en')
    ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    show_guide BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::DATE,
  action TEXT NOT NULL CHECK (action IN ('generate_word', 'activate')),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, usage_date, action)
);

CREATE TABLE IF NOT EXISTS public.activation_attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('de', 'en')),
  answer TEXT NOT NULL CHECK (CHAR_LENGTH(answer) BETWEEN 1 AND 5000),
  correct BOOLEAN NOT NULL,
  corrected_answer TEXT,
  natural_suggestion TEXT,
  feedback_ar TEXT NOT NULL,
  grammar_score SMALLINT NOT NULL CHECK (grammar_score BETWEEN 0 AND 10),
  naturalness_score SMALLINT NOT NULL CHECK (naturalness_score BETWEEN 0 AND 10),
  meaning_score SMALLINT NOT NULL CHECK (meaning_score BETWEEN 0 AND 10),
  errors_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (JSONB_TYPEOF(errors_json) = 'array'),
  model TEXT NOT NULL,
  evaluator_version INTEGER NOT NULL CHECK (evaluator_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activation_word_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    attempt_id UUID NOT NULL REFERENCES public.activation_attempts (id) ON DELETE CASCADE,
    review_id UUID UNIQUE REFERENCES public.reviews (id) ON DELETE SET NULL,
    vocabulary_id UUID REFERENCES public.vocabulary (id) ON DELETE SET NULL,
    word_snapshot TEXT NOT NULL,
    used BOOLEAN NOT NULL,
    meaning_correct BOOLEAN NOT NULL,
    grammar_correct BOOLEAN NOT NULL,
    natural_usage BOOLEAN NOT NULL,
    collocation_correct BOOLEAN NOT NULL,
    usage_score SMALLINT NOT NULL CHECK (usage_score BETWEEN 0 AND 10),
    feedback_ar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, vocabulary_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

DROP INDEX IF EXISTS public.vocabulary_normalized_word_idx;

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_user_lexicon_idx ON public.vocabulary (user_id, lexicon_id);

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_user_language_custom_word_idx ON public.vocabulary (
    user_id,
    language,
    LOWER(TRIM(word))
)
WHERE
    lexicon_id IS NULL;

CREATE INDEX IF NOT EXISTS reviews_vocabulary_date_idx ON public.reviews (
    vocabulary_id,
    reviewed_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_activation_attempt_vocabulary_idx ON public.reviews (
    activation_attempt_id,
    vocabulary_id
)
WHERE
    activation_attempt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vocabulary_user_created_idx ON public.vocabulary (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vocabulary_next_review_idx ON public.vocabulary (
    user_id,
    language,
    next_review_at
);

CREATE INDEX IF NOT EXISTS global_lexicon_language_word_idx ON public.global_lexicon (language, normalized_word);

CREATE INDEX IF NOT EXISTS global_lexicon_word_trgm_idx ON public.global_lexicon USING GIN (
    normalized_word extensions.gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS activation_attempts_user_created_idx ON public.activation_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activation_word_results_attempt_idx ON public.activation_word_results (attempt_id);

CREATE INDEX IF NOT EXISTS activation_word_results_vocabulary_created_idx ON public.activation_word_results (
    vocabulary_id,
    created_at DESC
);

-- ============================================================================
-- Triggers and Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vocabulary_set_updated_at ON public.vocabulary;

CREATE TRIGGER vocabulary_set_updated_at
  BEFORE UPDATE ON public.vocabulary
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS global_lexicon_set_updated_at ON public.global_lexicon;

CREATE TRIGGER global_lexicon_set_updated_at
  BEFORE UPDATE ON public.global_lexicon
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  action_limit INTEGER := 10;
  affected_rows INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.ai_daily_usage (
    user_id,
    usage_date,
    action,
    request_count
  )
  VALUES (
    current_user_id,
    (NOW() AT TIME ZONE 'UTC')::DATE,
    p_action,
    1
  )
  ON CONFLICT (user_id, usage_date, action)
  DO UPDATE
  SET request_count = ai_daily_usage.request_count + 1
  WHERE ai_daily_usage.request_count < action_limit;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_result(
  p_vocabulary_id UUID,
  p_result TEXT,
  p_review_type TEXT,
  p_reviewed_at TIMESTAMPTZ,
  p_next_review_at TIMESTAMPTZ,
  p_state TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  saved_review public.reviews;
  saved_vocabulary public.vocabulary;
BEGIN
  UPDATE public.vocabulary
  SET
    state = p_state,
    next_review_at = p_next_review_at
  WHERE
    id = p_vocabulary_id
    AND user_id = (SELECT auth.uid())
  RETURNING * INTO saved_vocabulary;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vocabulary item not found or access denied';
  END IF;

  INSERT INTO public.reviews (
    vocabulary_id,
    result,
    review_type,
    reviewed_at
  )
  VALUES (
    p_vocabulary_id,
    p_result,
    p_review_type,
    p_reviewed_at
  )
  RETURNING * INTO saved_review;

  RETURN jsonb_build_object(
    'review', to_jsonb(saved_review),
    'vocabulary', to_jsonb(saved_vocabulary)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_result(
  p_vocabulary_id UUID,
  p_result TEXT,
  p_review_type TEXT,
  p_reviewed_at TIMESTAMPTZ,
  p_next_review_at TIMESTAMPTZ,
  p_state TEXT,
  p_activation_attempt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  saved_review public.reviews;
  saved_vocabulary public.vocabulary;
BEGIN
  UPDATE public.vocabulary
  SET
    state = p_state,
    next_review_at = p_next_review_at
  WHERE
    id = p_vocabulary_id
    AND user_id = (SELECT auth.uid())
  RETURNING * INTO saved_vocabulary;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vocabulary item not found or access denied';
  END IF;

  INSERT INTO public.reviews (
    vocabulary_id,
    result,
    review_type,
    reviewed_at,
    activation_attempt_id
  )
  VALUES (
    p_vocabulary_id,
    p_result,
    p_review_type,
    p_reviewed_at,
    p_activation_attempt_id
  )
  RETURNING * INTO saved_review;

  RETURN jsonb_build_object(
    'review', to_jsonb(saved_review),
    'vocabulary', to_jsonb(saved_vocabulary)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_results(
  p_results JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  item JSONB;
  saved_result JSONB;
  saved_results JSONB := '[]'::jsonb;
  result_count INTEGER;
  current_activation_attempt_id UUID;
BEGIN
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' THEN
    RAISE EXCEPTION 'Learning results must be a JSON array';
  END IF;

  result_count := jsonb_array_length(p_results);

  IF result_count < 1 OR result_count > 50 THEN
    RAISE EXCEPTION 'A learning-result batch must contain between 1 and 50 items';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_results) AS result(value)
    GROUP BY result.value->>'vocabulary_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'A learning-result batch cannot contain duplicate vocabulary ids';
  END IF;

  FOR item IN
    SELECT result.value
    FROM jsonb_array_elements(p_results) WITH ORDINALITY AS result(value, position)
    ORDER BY result.position
  LOOP
    current_activation_attempt_id := NULLIF(item->>'activation_attempt_id', '')::uuid;
    saved_result := NULL;

    IF current_activation_attempt_id IS NOT NULL THEN
      SELECT JSONB_BUILD_OBJECT(
        'review', TO_JSONB(review),
        'vocabulary', TO_JSONB(vocabulary)
      )
      INTO saved_result
      FROM public.reviews AS review
      JOIN public.vocabulary AS vocabulary ON vocabulary.id = review.vocabulary_id
      WHERE
        review.activation_attempt_id = current_activation_attempt_id
        AND review.vocabulary_id = (item->>'vocabulary_id')::uuid
        AND vocabulary.user_id = (SELECT auth.uid());
    END IF;

    IF saved_result IS NULL THEN
      IF current_activation_attempt_id IS NULL THEN
        saved_result := public.record_learning_result(
          (item->>'vocabulary_id')::uuid,
          item->>'result',
          item->>'review_type',
          (item->>'reviewed_at')::timestamptz,
          (item->>'next_review_at')::timestamptz,
          item->>'state'
        );
      ELSE
        saved_result := public.record_learning_result(
          (item->>'vocabulary_id')::uuid,
          item->>'result',
          item->>'review_type',
          (item->>'reviewed_at')::timestamptz,
          (item->>'next_review_at')::timestamptz,
          item->>'state',
          current_activation_attempt_id
        );
      END IF;
    END IF;

    saved_results := saved_results || jsonb_build_array(saved_result);
  END LOOP;

  RETURN saved_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_activation_history(
  p_attempts JSONB,
  p_word_results JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  attempt_count INTEGER;
  word_result_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_attempts IS NULL OR JSONB_TYPEOF(p_attempts) <> 'array' THEN
    RAISE EXCEPTION 'Activation attempts must be a JSON array';
  END IF;

  IF p_word_results IS NULL OR JSONB_TYPEOF(p_word_results) <> 'array' THEN
    RAISE EXCEPTION 'Activation word results must be a JSON array';
  END IF;

  attempt_count := JSONB_ARRAY_LENGTH(p_attempts);
  word_result_count := JSONB_ARRAY_LENGTH(p_word_results);

  IF attempt_count < 1 OR attempt_count > 3 THEN
    RAISE EXCEPTION 'Activation history must contain between 1 and 3 attempts';
  END IF;

  IF word_result_count < 1 OR word_result_count > 12 THEN
    RAISE EXCEPTION 'Activation history must contain between 1 and 12 word results';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM JSONB_ARRAY_ELEMENTS(p_attempts) AS attempt(value)
    GROUP BY attempt.value->>'id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Activation history contains duplicate attempt ids';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM JSONB_ARRAY_ELEMENTS(p_word_results) AS word_result(value)
    GROUP BY word_result.value->>'review_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Activation history contains duplicate review ids';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM JSONB_ARRAY_ELEMENTS(p_word_results) AS word_result(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM JSONB_ARRAY_ELEMENTS(p_attempts) AS attempt(value)
      WHERE attempt.value->>'id' = word_result.value->>'attempt_id'
    )
  ) THEN
    RAISE EXCEPTION 'A word result refers to an unknown activation attempt';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM JSONB_ARRAY_ELEMENTS(p_word_results) AS word_result(value)
    LEFT JOIN public.reviews AS review
      ON review.id = (word_result.value->>'review_id')::uuid
    LEFT JOIN public.vocabulary AS vocabulary
      ON vocabulary.id = review.vocabulary_id
    WHERE
      review.id IS NULL
      OR review.review_type <> 'activate'
      OR review.vocabulary_id <> (word_result.value->>'vocabulary_id')::uuid
      OR vocabulary.user_id <> current_user_id
  ) THEN
    RAISE EXCEPTION 'A word result refers to an invalid activation review';
  END IF;

  INSERT INTO public.activation_attempts (
    id, user_id, language, answer, correct, corrected_answer,
    natural_suggestion, feedback_ar, grammar_score, naturalness_score,
    meaning_score, errors_json, model, evaluator_version
  )
  SELECT
    (attempt.value->>'id')::uuid,
    current_user_id,
    attempt.value->>'language',
    attempt.value->>'answer',
    (attempt.value->>'correct')::boolean,
    attempt.value->>'corrected_answer',
    attempt.value->>'natural_suggestion',
    attempt.value->>'feedback_ar',
    (attempt.value->>'grammar_score')::smallint,
    (attempt.value->>'naturalness_score')::smallint,
    (attempt.value->>'meaning_score')::smallint,
    COALESCE(attempt.value->'errors', '[]'::jsonb),
    attempt.value->>'model',
    (attempt.value->>'evaluator_version')::integer
  FROM JSONB_ARRAY_ELEMENTS(p_attempts) AS attempt(value);

  INSERT INTO public.activation_word_results (
    attempt_id, review_id, vocabulary_id, word_snapshot, used,
    meaning_correct, grammar_correct, natural_usage, collocation_correct,
    usage_score, feedback_ar
  )
  SELECT
    (word_result.value->>'attempt_id')::uuid,
    (word_result.value->>'review_id')::uuid,
    (word_result.value->>'vocabulary_id')::uuid,
    word_result.value->>'word_snapshot',
    (word_result.value->>'used')::boolean,
    (word_result.value->>'meaning_correct')::boolean,
    (word_result.value->>'grammar_correct')::boolean,
    (word_result.value->>'natural_usage')::boolean,
    (word_result.value->>'collocation_correct')::boolean,
    (word_result.value->>'usage_score')::smallint,
    word_result.value->>'feedback_ar'
  FROM JSONB_ARRAY_ELEMENTS(p_word_results) AS word_result(value);

  RETURN JSONB_BUILD_OBJECT(
    'attempts_saved', attempt_count,
    'word_results_saved', word_result_count
  );
END;
$$;

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
    SELECT LOWER(REGEXP_REPLACE(TRIM(p_query), '[[:space:]]+', ' ', 'g')) AS query
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
          SELECT 1 FROM UNNEST(lexicon.search_terms) AS term
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
    WHERE lexicon.language = p_language AND input.query <> ''
  )
  SELECT * FROM ranked
  WHERE ranked.score >= 0.34
  ORDER BY ranked.score DESC, ranked.word ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;

-- ============================================================================
-- Row Level Security (RLS) & Policies
-- ============================================================================

-- 1. Enable RLS
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.global_lexicon ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activation_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activation_word_results ENABLE ROW LEVEL SECURITY;

-- 2. Remove old policies
DROP POLICY IF EXISTS "v1 public vocabulary access" ON public.vocabulary;

DROP POLICY IF EXISTS "v1 public reviews access" ON public.reviews;

DROP POLICY IF EXISTS "admin vocab access" ON public.vocabulary;

DROP POLICY IF EXISTS "admin reviews access" ON public.reviews;

DROP POLICY IF EXISTS "user sees own vocabs" ON public.vocabulary;

DROP POLICY IF EXISTS "user sees own reviews" ON public.reviews;

DROP POLICY IF EXISTS "vocabulary_select" ON public.vocabulary;

DROP POLICY IF EXISTS "vocabulary_insert" ON public.vocabulary;

DROP POLICY IF EXISTS "vocabulary_update" ON public.vocabulary;

DROP POLICY IF EXISTS "vocabulary_delete" ON public.vocabulary;

DROP POLICY IF EXISTS "reviews_select" ON public.reviews;

DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;

DROP POLICY IF EXISTS "preferences_select" ON public.user_preferences;

DROP POLICY IF EXISTS "preferences_insert" ON public.user_preferences;

DROP POLICY IF EXISTS "preferences_update" ON public.user_preferences;

DROP POLICY IF EXISTS "global_lexicon_select" ON public.global_lexicon;

DROP POLICY IF EXISTS "activation_attempts_select" ON public.activation_attempts;

DROP POLICY IF EXISTS "activation_attempts_insert" ON public.activation_attempts;

DROP POLICY IF EXISTS "activation_word_results_select" ON public.activation_word_results;

DROP POLICY IF EXISTS "activation_word_results_insert" ON public.activation_word_results;

-- 3. Configure permissions
REVOKE ALL ON public.vocabulary,
public.reviews,
public.user_preferences,
public.ai_daily_usage,
public.global_lexicon,
public.activation_attempts,
public.activation_word_results
FROM anon, authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.vocabulary TO authenticated;

GRANT SELECT, INSERT ON public.reviews TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE ON public.user_preferences TO authenticated;

REVOKE ALL ON public.ai_daily_usage FROM anon, authenticated;

GRANT SELECT ON public.global_lexicon TO authenticated;

GRANT SELECT, INSERT ON public.activation_attempts TO authenticated;

GRANT
SELECT,
INSERT
    ON public.activation_word_results TO authenticated;

REVOKE ALL ON FUNCTION public.record_learning_result (
    UUID,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.consume_ai_quota (TEXT) FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.consume_ai_quota (TEXT) TO authenticated;

GRANT
EXECUTE ON FUNCTION public.record_learning_result (
    UUID,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT
) TO authenticated;

REVOKE ALL ON FUNCTION public.record_learning_result (
    UUID,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    UUID
)
FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.record_learning_result (
    UUID,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TIMESTAMPTZ,
    TEXT,
    UUID
) TO authenticated;

REVOKE ALL ON FUNCTION public.record_learning_results (JSONB)
FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.record_learning_results (JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.save_activation_history (JSONB, JSONB)
FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.save_activation_history (JSONB, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.search_global_lexicon (TEXT, TEXT, INTEGER)
FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.search_global_lexicon (TEXT, TEXT, INTEGER) TO authenticated;

-- =========================================================
-- Vocabulary Policies
-- =========================================================

CREATE POLICY "vocabulary_select" ON public.vocabulary FOR
SELECT TO authenticated USING (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "vocabulary_insert" ON public.vocabulary FOR
INSERT
    TO authenticated
WITH
    CHECK (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "vocabulary_update" ON public.vocabulary FOR
UPDATE TO authenticated USING (
    user_id = (
        SELECT auth.uid ()
    )
)
WITH
    CHECK (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "vocabulary_delete" ON public.vocabulary FOR DELETE TO authenticated USING (
    user_id = (
        SELECT auth.uid ()
    )
);

-- =========================================================
-- Reviews Policies
-- =========================================================

CREATE POLICY "reviews_select" ON public.reviews FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.vocabulary AS v
            WHERE
                v.id = reviews.vocabulary_id
                AND v.user_id = (
                    SELECT auth.uid ()
                )
        )
    );

CREATE POLICY "reviews_insert" ON public.reviews FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.vocabulary AS v
            WHERE
                v.id = reviews.vocabulary_id
                AND v.user_id = (
                    SELECT auth.uid ()
                )
        )
    );

-- =========================================================
-- User preference policies
-- =========================================================

CREATE POLICY "preferences_select" ON public.user_preferences FOR
SELECT TO authenticated USING (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "preferences_insert" ON public.user_preferences FOR
INSERT
    TO authenticated
WITH
    CHECK (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "preferences_update" ON public.user_preferences FOR
UPDATE TO authenticated USING (
    user_id = (
        SELECT auth.uid ()
    )
)
WITH
    CHECK (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "global_lexicon_select" ON public.global_lexicon FOR
SELECT TO authenticated USING (TRUE);

CREATE POLICY "activation_attempts_select" ON public.activation_attempts FOR
SELECT TO authenticated USING (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "activation_attempts_insert" ON public.activation_attempts FOR
INSERT
    TO authenticated
WITH
    CHECK (
        user_id = (
            SELECT auth.uid ()
        )
    );

CREATE POLICY "activation_word_results_select" ON public.activation_word_results FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.activation_attempts AS attempt
            WHERE
                attempt.id = activation_word_results.attempt_id
                AND attempt.user_id = (
                    SELECT auth.uid ()
                )
        )
    );

CREATE POLICY "activation_word_results_insert" ON public.activation_word_results FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.activation_attempts AS attempt
            WHERE
                attempt.id = activation_word_results.attempt_id
                AND attempt.user_id = (
                    SELECT auth.uid ()
                )
        )
        AND EXISTS (
            SELECT 1
            FROM public.reviews AS review
                JOIN public.vocabulary AS vocabulary ON vocabulary.id = review.vocabulary_id
            WHERE
                review.id = activation_word_results.review_id
                AND review.vocabulary_id = activation_word_results.vocabulary_id
                AND review.review_type = 'activate'
                AND vocabulary.user_id = (
                    SELECT auth.uid ()
                )
        )
    );

-- Private cache for generated dictionary pronunciation files.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'lexicon-audio',
  'lexicon-audio',
  TRUE,
  1048576,
  ARRAY['audio/mpeg']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
