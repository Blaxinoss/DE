ALTER TABLE public.global_lexicon
ADD COLUMN state TEXT NOT NULL DEFAULT 'new' CHECK (
  state IN ('new', 'learning', 'recall')
);

COMMENT ON COLUMN public.global_lexicon.state IS
  'Initial vocabulary state copied when this lexicon entry is added through a starter pack.';
