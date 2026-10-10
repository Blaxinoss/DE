DROP FUNCTION IF EXISTS public.record_learning_result(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  SMALLINT,
  SMALLINT
);

ALTER TABLE public.vocabulary
DROP COLUMN IF EXISTS promotion_streak,
DROP COLUMN IF EXISTS failure_streak;

CREATE FUNCTION public.record_learning_result(
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

REVOKE ALL ON FUNCTION public.record_learning_result(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_learning_result(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT
) TO authenticated;
