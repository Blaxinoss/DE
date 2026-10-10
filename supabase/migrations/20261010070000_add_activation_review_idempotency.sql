ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS activation_attempt_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_activation_attempt_vocabulary_idx
ON public.reviews (activation_attempt_id, vocabulary_id)
WHERE activation_attempt_id IS NOT NULL;

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
      saved_result := public.record_learning_result(
        (item->>'vocabulary_id')::uuid,
        item->>'result',
        item->>'review_type',
        (item->>'reviewed_at')::timestamptz,
        (item->>'next_review_at')::timestamptz,
        item->>'state'
      );

      IF current_activation_attempt_id IS NOT NULL THEN
        UPDATE public.reviews
        SET activation_attempt_id = current_activation_attempt_id
        WHERE id = (saved_result->'review'->>'id')::uuid;

        saved_result := JSONB_SET(
          saved_result,
          '{review,activation_attempt_id}',
          TO_JSONB(current_activation_attempt_id),
          TRUE
        );
      END IF;
    END IF;

    saved_results := saved_results || jsonb_build_array(saved_result);
  END LOOP;

  RETURN saved_results;
END;
$$;
