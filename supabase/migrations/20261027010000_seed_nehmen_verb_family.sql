WITH root AS (
  INSERT INTO public.verb_tree_nodes (
    language,
    lemma,
    normalized_lemma,
    parent_id
  )
  VALUES ('de', 'nehmen', 'nehmen', NULL)
  ON CONFLICT (language, normalized_lemma)
  DO UPDATE SET
    lemma = EXCLUDED.lemma,
    parent_id = NULL
  RETURNING id
),
direct_children (lemma, normalized_lemma) AS (
  VALUES
    ('annehmen', 'annehmen'),
    ('abnehmen', 'abnehmen'),
    ('aufnehmen', 'aufnehmen'),
    ('übernehmen', 'übernehmen'),
    ('mitnehmen', 'mitnehmen')
)
INSERT INTO public.verb_tree_nodes (
  language,
  lemma,
  normalized_lemma,
  parent_id
)
SELECT
  'de',
  child.lemma,
  child.normalized_lemma,
  root.id
FROM direct_children AS child
CROSS JOIN root
ON CONFLICT (language, normalized_lemma)
DO UPDATE SET
  lemma = EXCLUDED.lemma,
  parent_id = EXCLUDED.parent_id;

INSERT INTO public.verb_tree_nodes (
  language,
  lemma,
  normalized_lemma,
  parent_id
)
SELECT
  'de',
  'wiederaufnehmen',
  'wiederaufnehmen',
  parent.id
FROM public.verb_tree_nodes AS parent
WHERE parent.language = 'de'
  AND parent.normalized_lemma = 'aufnehmen'
ON CONFLICT (language, normalized_lemma)
DO UPDATE SET
  lemma = EXCLUDED.lemma,
  parent_id = EXCLUDED.parent_id;
