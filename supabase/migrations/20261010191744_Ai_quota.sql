
CREATE TABLE public.ai_daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::DATE,
  action TEXT NOT NULL CHECK (
    action IN ('generate_word', 'activate')
  ),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),

  PRIMARY KEY (user_id, usage_date, action)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_daily_usage FROM anon, authenticated;

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
  action_limit INTEGER;
  affected_rows INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
-- 10 for each type of action
  action_limit := 10;

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

REVOKE ALL ON FUNCTION public.consume_ai_quota (TEXT) FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.consume_ai_quota (TEXT) TO authenticated;