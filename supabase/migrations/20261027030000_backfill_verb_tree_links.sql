UPDATE public.global_lexicon AS lexicon
SET verb_tree_node_id = node.id,
    updated_at = NOW()
FROM public.verb_tree_nodes AS node
WHERE lexicon.verb_tree_node_id IS NULL
  AND lexicon.type = 'verb'
  AND lexicon.language = node.language
  AND lexicon.normalized_word = node.normalized_lemma;
