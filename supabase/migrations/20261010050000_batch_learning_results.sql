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
    saved_result := public.record_learning_result(
      (item->>'vocabulary_id')::uuid,
      item->>'result',
      item->>'review_type',
      (item->>'reviewed_at')::timestamptz,
      (item->>'next_review_at')::timestamptz,
      item->>'state'
    );

    saved_results := saved_results || jsonb_build_array(saved_result);
  END LOOP;

  RETURN saved_results;
END;
$$;

REVOKE ALL ON FUNCTION public.record_learning_results(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_learning_results(JSONB) TO authenticated;
