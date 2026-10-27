CREATE OR REPLACE FUNCTION public.get_user_verb_forest(
  p_language TEXT
)
RETURNS TABLE (
  id UUID,
  language TEXT,
  lemma TEXT,
  normalized_lemma TEXT,
  parent_id UUID,
  root_id UUID,
  depth INTEGER
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH RECURSIVE
  owned_nodes AS (
    SELECT DISTINCT node.id
    FROM public.vocabulary AS vocabulary
    JOIN public.global_lexicon AS lexicon
      ON lexicon.id = vocabulary.lexicon_id
    JOIN public.verb_tree_nodes AS node
      ON node.id = lexicon.verb_tree_node_id
    WHERE vocabulary.user_id = (SELECT auth.uid())
      AND vocabulary.language = p_language
      AND node.language = p_language
  ),
  ancestors AS (
    SELECT
      node.id,
      node.parent_id,
      ARRAY[node.id] AS path
    FROM public.verb_tree_nodes AS node
    JOIN owned_nodes ON owned_nodes.id = node.id

    UNION ALL

    SELECT
      parent.id,
      parent.parent_id,
      child.path || parent.id
    FROM public.verb_tree_nodes AS parent
    JOIN ancestors AS child ON parent.id = child.parent_id
    WHERE parent.language = p_language
      AND NOT parent.id = ANY(child.path)
      AND CARDINALITY(child.path) < 20
  ),
  roots AS (
    SELECT DISTINCT node.id
    FROM public.verb_tree_nodes AS node
    JOIN ancestors ON ancestors.id = node.id
    WHERE node.parent_id IS NULL
  ),
  forest AS (
    SELECT
      root.id,
      root.language,
      root.lemma,
      root.normalized_lemma,
      root.parent_id,
      root.id AS root_id,
      0 AS depth,
      ARRAY[root.id] AS path
    FROM public.verb_tree_nodes AS root
    JOIN roots ON roots.id = root.id

    UNION ALL

    SELECT
      child.id,
      child.language,
      child.lemma,
      child.normalized_lemma,
      child.parent_id,
      parent.root_id,
      parent.depth + 1,
      parent.path || child.id
    FROM public.verb_tree_nodes AS child
    JOIN forest AS parent ON child.parent_id = parent.id
    WHERE child.language = p_language
      AND NOT child.id = ANY(parent.path)
      AND parent.depth < 19
  )
  SELECT
    forest.id,
    forest.language,
    forest.lemma,
    forest.normalized_lemma,
    forest.parent_id,
    forest.root_id,
    forest.depth
  FROM forest
  ORDER BY forest.root_id, forest.depth, forest.normalized_lemma;
$$;

REVOKE ALL ON FUNCTION public.get_user_verb_forest(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_verb_forest(TEXT) TO authenticated;
