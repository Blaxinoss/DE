ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'de'
CHECK (language IN ('de', 'en'));

DROP INDEX IF EXISTS public.vocabulary_normalized_word_idx;

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_user_language_word_idx
ON public.vocabulary (user_id, language, LOWER(TRIM(word)));

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_language TEXT NOT NULL DEFAULT 'de'
    CHECK (learning_language IN ('de', 'en')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;

DROP POLICY IF EXISTS "preferences_select" ON public.user_preferences;
DROP POLICY IF EXISTS "preferences_insert" ON public.user_preferences;
DROP POLICY IF EXISTS "preferences_update" ON public.user_preferences;

CREATE POLICY "preferences_select" ON public.user_preferences FOR
SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "preferences_insert" ON public.user_preferences FOR
INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "preferences_update" ON public.user_preferences FOR
UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
