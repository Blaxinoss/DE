CREATE TABLE public.verb_tree_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('de', 'en')),
  lemma TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(lemma)) > 0),
  normalized_lemma TEXT NOT NULL CHECK (
    CHAR_LENGTH(TRIM(normalized_lemma)) > 0
  ),
  parent_id UUID REFERENCES public.verb_tree_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (language, normalized_lemma),
  CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX verb_tree_nodes_parent_idx
ON public.verb_tree_nodes (parent_id);

CREATE OR REPLACE FUNCTION public.validate_verb_tree_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  parent_language TEXT;
  creates_cycle BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.language IS DISTINCT FROM OLD.language
    AND EXISTS (
      SELECT 1
      FROM public.verb_tree_nodes AS child
      WHERE child.parent_id = NEW.id
        AND child.language <> NEW.language
    )
  THEN
    RAISE EXCEPTION 'A verb and its children must use the same language';
  END IF;

  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A verb cannot be its own parent';
  END IF;

  SELECT parent.language
  INTO parent_language
  FROM public.verb_tree_nodes AS parent
  WHERE parent.id = NEW.parent_id;

  IF parent_language IS NULL THEN
    RAISE EXCEPTION 'The selected parent verb does not exist';
  END IF;

  IF parent_language <> NEW.language THEN
    RAISE EXCEPTION 'A verb and its parent must use the same language';
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT
      parent.id,
      parent.parent_id,
      ARRAY[parent.id] AS path
    FROM public.verb_tree_nodes AS parent
    WHERE parent.id = NEW.parent_id

    UNION ALL

    SELECT
      parent.id,
      parent.parent_id,
      ancestors.path || parent.id
    FROM public.verb_tree_nodes AS parent
    JOIN ancestors ON parent.id = ancestors.parent_id
    WHERE NOT parent.id = ANY(ancestors.path)
      AND CARDINALITY(ancestors.path) < 100
  )
  SELECT EXISTS (
    SELECT 1
    FROM ancestors
    WHERE ancestors.id = NEW.id
  )
  INTO creates_cycle;

  IF creates_cycle THEN
    RAISE EXCEPTION 'This parent relationship would create a cycle';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER verb_tree_nodes_validate_parent
BEFORE INSERT OR UPDATE OF parent_id, language
ON public.verb_tree_nodes
FOR EACH ROW
EXECUTE FUNCTION public.validate_verb_tree_parent();

CREATE TRIGGER verb_tree_nodes_set_updated_at
BEFORE UPDATE ON public.verb_tree_nodes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_verb_family(
  p_language TEXT,
  p_lemma TEXT
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
  input AS (
    SELECT LOWER(
      REGEXP_REPLACE(TRIM(p_lemma), '[[:space:]]+', ' ', 'g')
    ) AS normalized_lemma
  ),
  starting_node AS (
    SELECT node.*
    FROM public.verb_tree_nodes AS node
    CROSS JOIN input
    WHERE node.language = p_language
      AND node.normalized_lemma = input.normalized_lemma
      AND input.normalized_lemma <> ''
  ),
  ancestors AS (
    SELECT
      node.id,
      node.language,
      node.lemma,
      node.normalized_lemma,
      node.parent_id,
      0 AS distance,
      ARRAY[node.id] AS path
    FROM starting_node AS node

    UNION ALL

    SELECT
      parent.id,
      parent.language,
      parent.lemma,
      parent.normalized_lemma,
      parent.parent_id,
      child.distance + 1,
      child.path || parent.id
    FROM public.verb_tree_nodes AS parent
    JOIN ancestors AS child ON parent.id = child.parent_id
    WHERE parent.language = p_language
      AND NOT parent.id = ANY(child.path)
      AND child.distance < 19
  ),
  root_node AS (
    SELECT ancestor.id
    FROM ancestors AS ancestor
    WHERE ancestor.parent_id IS NULL
    ORDER BY ancestor.distance DESC
    LIMIT 1
  ),
  family AS (
    SELECT
      root.id,
      root.language,
      root.lemma,
      root.normalized_lemma,
      root.parent_id,
      0 AS depth,
      ARRAY[root.id] AS path
    FROM public.verb_tree_nodes AS root
    JOIN root_node ON root_node.id = root.id

    UNION ALL

    SELECT
      child.id,
      child.language,
      child.lemma,
      child.normalized_lemma,
      child.parent_id,
      parent.depth + 1,
      parent.path || child.id
    FROM public.verb_tree_nodes AS child
    JOIN family AS parent ON child.parent_id = parent.id
    WHERE child.language = p_language
      AND NOT child.id = ANY(parent.path)
      AND parent.depth < 19
  )
  SELECT
    family.id,
    family.language,
    family.lemma,
    family.normalized_lemma,
    family.parent_id,
    root_node.id AS root_id,
    family.depth
  FROM family
  CROSS JOIN root_node
  ORDER BY family.depth, family.normalized_lemma;
$$;

ALTER TABLE public.verb_tree_nodes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.verb_tree_nodes FROM anon, authenticated;
GRANT SELECT ON public.verb_tree_nodes TO authenticated;

CREATE POLICY "verb_tree_nodes_select"
ON public.verb_tree_nodes
FOR SELECT
TO authenticated
USING (TRUE);

REVOKE ALL ON FUNCTION public.validate_verb_tree_parent() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_verb_family(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verb_family(TEXT, TEXT) TO authenticated;
