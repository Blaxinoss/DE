ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS promotion_streak SMALLINT NOT NULL DEFAULT 0
CHECK (promotion_streak BETWEEN 0 AND 1);

ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS failure_streak SMALLINT NOT NULL DEFAULT 0
CHECK (failure_streak BETWEEN 0 AND 1);

ALTER TABLE public.vocabulary
DROP CONSTRAINT IF EXISTS vocabulary_state_check;

UPDATE public.vocabulary
SET state = CASE state
  WHEN 'recognition' THEN 'learning'
  WHEN 'passive' THEN 'learning'
  WHEN 'slow_recall' THEN 'recall'
  WHEN 'usable' THEN 'recall'
  ELSE state
END;

ALTER TABLE public.vocabulary
ADD CONSTRAINT vocabulary_state_check
CHECK (state IN ('new', 'learning', 'recall', 'active'));

DROP FUNCTION IF EXISTS public.record_learning_result(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT
);

CREATE FUNCTION public.record_learning_result(
  p_vocabulary_id UUID,
  p_result TEXT,
  p_review_type TEXT,
  p_reviewed_at TIMESTAMPTZ,
  p_next_review_at TIMESTAMPTZ,
  p_state TEXT,
  p_promotion_streak SMALLINT,
  p_failure_streak SMALLINT
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
    promotion_streak = p_promotion_streak,
    failure_streak = p_failure_streak,
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

REVOKE ALL ON FUNCTION public.record_learning_result(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  SMALLINT,
  SMALLINT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_learning_result(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  SMALLINT,
  SMALLINT
) TO authenticated;
