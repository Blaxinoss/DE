ALTER TABLE public.global_lexicon
ADD COLUMN IF NOT EXISTS verb_tree_node_id UUID
REFERENCES public.verb_tree_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS global_lexicon_verb_tree_node_idx
ON public.global_lexicon (verb_tree_node_id)
WHERE verb_tree_node_id IS NOT NULL;

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

    IF p_language = 'de'
      AND entry->>'type' = 'verb'
      AND final_node_id IS NULL
    THEN
      RAISE EXCEPTION 'German verb entries require a verb-family path';
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

REVOKE ALL ON FUNCTION public.save_generated_lexicon_entries(
  TEXT,
  JSONB,
  TEXT,
  INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_generated_lexicon_entries(
  TEXT,
  JSONB,
  TEXT,
  INTEGER
) TO service_role;
