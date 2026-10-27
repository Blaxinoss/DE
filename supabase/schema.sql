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
  level_cerf VARCHAR(2) CHECK (
    UPPER(level_cerf) IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  ),
  state TEXT NOT NULL DEFAULT 'new' CHECK (
    state IN ('new', 'learning', 'recall')
  ),
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

CREATE TABLE IF NOT EXISTS public.verb_tree_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('de', 'en')),
  lemma TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(lemma)) > 0),
  normalized_lemma TEXT NOT NULL CHECK (
    CHAR_LENGTH(TRIM(normalized_lemma)) > 0
  ),
  parent_id UUID REFERENCES public.verb_tree_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (language, normalized_lemma),
  CHECK (parent_id IS NULL OR parent_id <> id)
);

ALTER TABLE public.global_lexicon
ADD COLUMN IF NOT EXISTS verb_tree_node_id UUID
REFERENCES public.verb_tree_nodes(id) ON DELETE SET NULL;

ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS lexicon_id UUID REFERENCES public.global_lexicon (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY DEFAULT auth.uid () REFERENCES auth.users (id) ON DELETE CASCADE,
    learning_language TEXT NOT NULL DEFAULT 'de' CHECK (
        learning_language IN ('de', 'en')
    ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    show_guide BOOLEAN NOT NULL DEFAULT TRUE,
    seeded_languages TEXT[] DEFAULT '{}'
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

CREATE INDEX IF NOT EXISTS verb_tree_nodes_parent_idx ON public.verb_tree_nodes (parent_id);

CREATE INDEX IF NOT EXISTS global_lexicon_verb_tree_node_idx
ON public.global_lexicon (verb_tree_node_id)
WHERE verb_tree_node_id IS NOT NULL;

INSERT INTO public.verb_tree_nodes (
  language,
  lemma,
  normalized_lemma,
  parent_id
)
SELECT DISTINCT ON (lexicon.language, lexicon.normalized_word)
  lexicon.language,
  lexicon.word,
  lexicon.normalized_word,
  NULL
FROM public.global_lexicon AS lexicon
WHERE lexicon.language = 'en'
  AND lexicon.type = 'verb'
  AND lexicon.verb_tree_node_id IS NULL
  AND TRIM(lexicon.normalized_word) <> ''
ORDER BY
  lexicon.language,
  lexicon.normalized_word,
  lexicon.updated_at DESC
ON CONFLICT (language, normalized_lemma) DO NOTHING;

UPDATE public.global_lexicon AS lexicon
SET verb_tree_node_id = node.id,
    updated_at = NOW()
FROM public.verb_tree_nodes AS node
WHERE lexicon.verb_tree_node_id IS NULL
  AND lexicon.type = 'verb'
  AND lexicon.language = node.language
  AND lexicon.normalized_word = node.normalized_lemma;

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

CREATE OR REPLACE FUNCTION public.validate_verb_tree_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  parent_language TEXT;
  creates_cycle BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.language IS DISTINCT FROM OLD.language
    AND EXISTS (
      SELECT 1
      FROM public.verb_tree_nodes AS child
      WHERE child.parent_id = NEW.id
        AND child.language <> NEW.language
    )
  THEN
    RAISE EXCEPTION 'A verb and its children must use the same language';
  END IF;

  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A verb cannot be its own parent';
  END IF;

  SELECT parent.language
  INTO parent_language
  FROM public.verb_tree_nodes AS parent
  WHERE parent.id = NEW.parent_id;

  IF parent_language IS NULL THEN
    RAISE EXCEPTION 'The selected parent verb does not exist';
  END IF;

  IF parent_language <> NEW.language THEN
    RAISE EXCEPTION 'A verb and its parent must use the same language';
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT
      parent.id,
      parent.parent_id,
      ARRAY[parent.id] AS path
    FROM public.verb_tree_nodes AS parent
    WHERE parent.id = NEW.parent_id

    UNION ALL

    SELECT
      parent.id,
      parent.parent_id,
      ancestors.path || parent.id
    FROM public.verb_tree_nodes AS parent
    JOIN ancestors ON parent.id = ancestors.parent_id
    WHERE NOT parent.id = ANY(ancestors.path)
      AND CARDINALITY(ancestors.path) < 100
  )
  SELECT EXISTS (
    SELECT 1
    FROM ancestors
    WHERE ancestors.id = NEW.id
  )
  INTO creates_cycle;

  IF creates_cycle THEN
    RAISE EXCEPTION 'This parent relationship would create a cycle';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verb_tree_nodes_validate_parent ON public.verb_tree_nodes;

CREATE TRIGGER verb_tree_nodes_validate_parent
BEFORE INSERT OR UPDATE OF parent_id, language
ON public.verb_tree_nodes
FOR EACH ROW
EXECUTE FUNCTION public.validate_verb_tree_parent();

DROP TRIGGER IF EXISTS verb_tree_nodes_set_updated_at ON public.verb_tree_nodes;

CREATE TRIGGER verb_tree_nodes_set_updated_at
BEFORE UPDATE ON public.verb_tree_nodes
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

CREATE OR REPLACE FUNCTION public.get_verb_family(
  p_language TEXT,
  p_lemma TEXT
)
RETURNS TABLE (
  id UUID,
  language TEXT,
  lemma TEXT,
  normalized_lemma TEXT,
  parent_id UUID,
  root_id UUID,
  depth INTEGER
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH RECURSIVE
  input AS (
    SELECT LOWER(
      REGEXP_REPLACE(TRIM(p_lemma), '[[:space:]]+', ' ', 'g')
    ) AS normalized_lemma
  ),
  starting_node AS (
    SELECT node.*
    FROM public.verb_tree_nodes AS node
    CROSS JOIN input
    WHERE node.language = p_language
      AND node.normalized_lemma = input.normalized_lemma
      AND input.normalized_lemma <> ''
  ),
  ancestors AS (
    SELECT
      node.id,
      node.language,
      node.lemma,
      node.normalized_lemma,
      node.parent_id,
      0 AS distance,
      ARRAY[node.id] AS path
    FROM starting_node AS node

    UNION ALL

    SELECT
      parent.id,
      parent.language,
      parent.lemma,
      parent.normalized_lemma,
      parent.parent_id,
      child.distance + 1,
      child.path || parent.id
    FROM public.verb_tree_nodes AS parent
    JOIN ancestors AS child ON parent.id = child.parent_id
    WHERE parent.language = p_language
      AND NOT parent.id = ANY(child.path)
      AND child.distance < 19
  ),
  root_node AS (
    SELECT ancestor.id
    FROM ancestors AS ancestor
    WHERE ancestor.parent_id IS NULL
    ORDER BY ancestor.distance DESC
    LIMIT 1
  ),
  family AS (
    SELECT
      root.id,
      root.language,
      root.lemma,
      root.normalized_lemma,
      root.parent_id,
      0 AS depth,
      ARRAY[root.id] AS path
    FROM public.verb_tree_nodes AS root
    JOIN root_node ON root_node.id = root.id

    UNION ALL

    SELECT
      child.id,
      child.language,
      child.lemma,
      child.normalized_lemma,
      child.parent_id,
      parent.depth + 1,
      parent.path || child.id
    FROM public.verb_tree_nodes AS child
    JOIN family AS parent ON child.parent_id = parent.id
    WHERE child.language = p_language
      AND NOT child.id = ANY(parent.path)
      AND parent.depth < 19
  )
  SELECT
    family.id,
    family.language,
    family.lemma,
    family.normalized_lemma,
    family.parent_id,
    root_node.id AS root_id,
    family.depth
  FROM family
  CROSS JOIN root_node
  ORDER BY family.depth, family.normalized_lemma;
$$;

CREATE OR REPLACE FUNCTION public.save_generated_lexicon_entries(
  p_language TEXT,
  p_entries JSONB,
  p_model TEXT,
  p_schema_version INTEGER
)
RETURNS SETOF public.global_lexicon
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  entry JSONB;
  family_lemma TEXT;
  normalized_family_lemma TEXT;
  expected_parent_id UUID;
  actual_parent_id UUID;
  current_node_id UUID;
  final_node_id UUID;
  saved_id UUID;
  saved_ids UUID[] := '{}';
BEGIN
  IF p_language NOT IN ('de', 'en') THEN
    RAISE EXCEPTION 'Unsupported learning language';
  END IF;

  IF p_schema_version < 1 THEN
    RAISE EXCEPTION 'Schema version must be positive';
  END IF;

  IF JSONB_TYPEOF(p_entries) <> 'array'
    OR JSONB_ARRAY_LENGTH(p_entries) = 0
  THEN
    RAISE EXCEPTION 'Generated entries must be a non-empty JSON array';
  END IF;

  FOR entry IN
    SELECT value
    FROM JSONB_ARRAY_ELEMENTS(p_entries)
  LOOP
    expected_parent_id := NULL;
    final_node_id := NULL;

    IF entry->'verb_family_path' IS NOT NULL
      AND JSONB_TYPEOF(entry->'verb_family_path') = 'array'
    THEN
      FOR family_lemma IN
        SELECT value
        FROM JSONB_ARRAY_ELEMENTS_TEXT(entry->'verb_family_path')
      LOOP
        normalized_family_lemma := LOWER(
          REGEXP_REPLACE(TRIM(family_lemma), '[[:space:]]+', ' ', 'g')
        );

        IF normalized_family_lemma = '' THEN
          RAISE EXCEPTION 'A verb-family lemma cannot be blank';
        END IF;

        INSERT INTO public.verb_tree_nodes (
          language,
          lemma,
          normalized_lemma,
          parent_id
        )
        VALUES (
          p_language,
          TRIM(family_lemma),
          normalized_family_lemma,
          expected_parent_id
        )
        ON CONFLICT (language, normalized_lemma)
        DO UPDATE SET
          lemma = EXCLUDED.lemma,
          parent_id = CASE
            WHEN verb_tree_nodes.parent_id IS NULL
              AND EXCLUDED.parent_id IS NOT NULL
            THEN EXCLUDED.parent_id
            ELSE verb_tree_nodes.parent_id
          END,
          updated_at = NOW()
        RETURNING id, parent_id
        INTO current_node_id, actual_parent_id;

        IF actual_parent_id IS DISTINCT FROM expected_parent_id THEN
          RAISE EXCEPTION
            'Verb-family conflict for "%": stored and generated parents differ',
            family_lemma;
        END IF;

        expected_parent_id := current_node_id;
        final_node_id := current_node_id;
      END LOOP;
    END IF;

    IF p_language IN ('de', 'en')
      AND entry->>'type' = 'verb'
      AND final_node_id IS NULL
    THEN
      RAISE EXCEPTION 'Verb entries require a verb-family path';
    END IF;

    IF entry->>'type' <> 'verb' AND final_node_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only verbs can reference a verb-family path';
    END IF;

    INSERT INTO public.global_lexicon (
      language,
      sense_key,
      word,
      normalized_word,
      meaning_ar,
      type,
      grammar_json,
      commonness,
      chunk,
      example,
      search_terms,
      model,
      schema_version,
      verb_tree_node_id,
      updated_at
    )
    VALUES (
      p_language,
      entry->>'sense_key',
      entry->>'word',
      entry->>'normalized_word',
      entry->>'meaning_ar',
      entry->>'type',
      COALESCE(entry->'grammar_json', '{}'::JSONB),
      entry->>'commonness',
      entry->>'chunk',
      entry->>'example',
      ARRAY(
        SELECT value
        FROM JSONB_ARRAY_ELEMENTS_TEXT(
          COALESCE(entry->'search_terms', '[]'::JSONB)
        )
      ),
      p_model,
      p_schema_version,
      final_node_id,
      NOW()
    )
    ON CONFLICT (language, sense_key)
    DO UPDATE SET
      word = EXCLUDED.word,
      normalized_word = EXCLUDED.normalized_word,
      meaning_ar = EXCLUDED.meaning_ar,
      type = EXCLUDED.type,
      grammar_json = EXCLUDED.grammar_json,
      commonness = EXCLUDED.commonness,
      chunk = EXCLUDED.chunk,
      example = EXCLUDED.example,
      search_terms = EXCLUDED.search_terms,
      model = EXCLUDED.model,
      schema_version = EXCLUDED.schema_version,
      verb_tree_node_id = EXCLUDED.verb_tree_node_id,
      updated_at = NOW()
    RETURNING id INTO saved_id;

    saved_ids := ARRAY_APPEND(saved_ids, saved_id);
  END LOOP;

  RETURN QUERY
  SELECT lexicon.*
  FROM public.global_lexicon AS lexicon
  WHERE lexicon.id = ANY(saved_ids)
  ORDER BY ARRAY_POSITION(saved_ids, lexicon.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_verb_forest(
  p_language TEXT
)
RETURNS TABLE (
  id UUID,
  language TEXT,
  lemma TEXT,
  normalized_lemma TEXT,
  parent_id UUID,
  root_id UUID,
  depth INTEGER
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH RECURSIVE
  owned_nodes AS (
    SELECT DISTINCT node.id
    FROM public.vocabulary AS vocabulary
    JOIN public.global_lexicon AS lexicon
      ON lexicon.id = vocabulary.lexicon_id
    JOIN public.verb_tree_nodes AS node
      ON node.id = lexicon.verb_tree_node_id
    WHERE vocabulary.user_id = (SELECT auth.uid())
      AND vocabulary.language = p_language
      AND node.language = p_language
  ),
  ancestors AS (
    SELECT node.id, node.parent_id, ARRAY[node.id] AS path
    FROM public.verb_tree_nodes AS node
    JOIN owned_nodes ON owned_nodes.id = node.id

    UNION ALL

    SELECT parent.id, parent.parent_id, child.path || parent.id
    FROM public.verb_tree_nodes AS parent
    JOIN ancestors AS child ON parent.id = child.parent_id
    WHERE parent.language = p_language
      AND NOT parent.id = ANY(child.path)
      AND CARDINALITY(child.path) < 20
  ),
  roots AS (
    SELECT DISTINCT node.id
    FROM public.verb_tree_nodes AS node
    JOIN ancestors ON ancestors.id = node.id
    WHERE node.parent_id IS NULL
  ),
  forest AS (
    SELECT
      root.id,
      root.language,
      root.lemma,
      root.normalized_lemma,
      root.parent_id,
      root.id AS root_id,
      0 AS depth,
      ARRAY[root.id] AS path
    FROM public.verb_tree_nodes AS root
    JOIN roots ON roots.id = root.id

    UNION ALL

    SELECT
      child.id,
      child.language,
      child.lemma,
      child.normalized_lemma,
      child.parent_id,
      parent.root_id,
      parent.depth + 1,
      parent.path || child.id
    FROM public.verb_tree_nodes AS child
    JOIN forest AS parent ON child.parent_id = parent.id
    WHERE child.language = p_language
      AND NOT child.id = ANY(parent.path)
      AND parent.depth < 19
  )
  SELECT
    forest.id,
    forest.language,
    forest.lemma,
    forest.normalized_lemma,
    forest.parent_id,
    forest.root_id,
    forest.depth
  FROM forest
  ORDER BY forest.root_id, forest.depth, forest.normalized_lemma;
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

ALTER TABLE public.verb_tree_nodes ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "verb_tree_nodes_select" ON public.verb_tree_nodes;

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
public.verb_tree_nodes,
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

GRANT SELECT ON public.verb_tree_nodes TO authenticated;

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

REVOKE ALL ON FUNCTION public.validate_verb_tree_parent () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_verb_family (TEXT, TEXT) FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.get_verb_family (TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_verb_forest (TEXT) FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.get_user_verb_forest (TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.save_generated_lexicon_entries (
    TEXT,
    JSONB,
    TEXT,
    INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT
EXECUTE ON FUNCTION public.save_generated_lexicon_entries (
    TEXT,
    JSONB,
    TEXT,
    INTEGER
) TO service_role;

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

CREATE POLICY "verb_tree_nodes_select" ON public.verb_tree_nodes FOR
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
