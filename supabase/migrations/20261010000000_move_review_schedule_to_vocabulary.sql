ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'reviews'
      AND column_name = 'next_review_at'
  ) THEN
    UPDATE public.vocabulary AS vocabulary
    SET next_review_at = latest_review.next_review_at
    FROM (
      SELECT DISTINCT ON (vocabulary_id)
        vocabulary_id,
        next_review_at
      FROM public.reviews
      ORDER BY vocabulary_id, reviewed_at DESC, id DESC
    ) AS latest_review
    WHERE vocabulary.id = latest_review.vocabulary_id;
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.reviews_next_review_idx;

ALTER TABLE public.reviews
DROP COLUMN IF EXISTS next_review_at;

CREATE INDEX IF NOT EXISTS vocabulary_next_review_idx
ON public.vocabulary (user_id, language, next_review_at);

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
