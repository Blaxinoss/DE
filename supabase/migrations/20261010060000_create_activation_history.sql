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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.activation_attempts(id) ON DELETE CASCADE,
  review_id UUID UNIQUE REFERENCES public.reviews(id) ON DELETE SET NULL,
  vocabulary_id UUID REFERENCES public.vocabulary(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS activation_attempts_user_created_idx
ON public.activation_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activation_word_results_attempt_idx
ON public.activation_word_results (attempt_id);

CREATE INDEX IF NOT EXISTS activation_word_results_vocabulary_created_idx
ON public.activation_word_results (vocabulary_id, created_at DESC);

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
    id,
    user_id,
    language,
    answer,
    correct,
    corrected_answer,
    natural_suggestion,
    feedback_ar,
    grammar_score,
    naturalness_score,
    meaning_score,
    errors_json,
    model,
    evaluator_version
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
    attempt_id,
    review_id,
    vocabulary_id,
    word_snapshot,
    used,
    meaning_correct,
    grammar_correct,
    natural_usage,
    collocation_correct,
    usage_score,
    feedback_ar
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

ALTER TABLE public.activation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_word_results ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.activation_attempts, public.activation_word_results
FROM anon, authenticated;

GRANT SELECT, INSERT ON public.activation_attempts TO authenticated;
GRANT SELECT, INSERT ON public.activation_word_results TO authenticated;

REVOKE ALL ON FUNCTION public.save_activation_history(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_activation_history(JSONB, JSONB) TO authenticated;

CREATE POLICY "activation_attempts_select"
ON public.activation_attempts FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "activation_attempts_insert"
ON public.activation_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "activation_word_results_select"
ON public.activation_word_results FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.activation_attempts AS attempt
    WHERE
      attempt.id = activation_word_results.attempt_id
      AND attempt.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "activation_word_results_insert"
ON public.activation_word_results FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.activation_attempts AS attempt
    WHERE
      attempt.id = activation_word_results.attempt_id
      AND attempt.user_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.reviews AS review
    JOIN public.vocabulary AS vocabulary ON vocabulary.id = review.vocabulary_id
    WHERE
      review.id = activation_word_results.review_id
      AND review.vocabulary_id = activation_word_results.vocabulary_id
      AND review.review_type = 'activate'
      AND vocabulary.user_id = (SELECT auth.uid())
  )
);
