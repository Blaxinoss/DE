create extension if not exists pgcrypto;
create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(), word text not null, meaning_ar text not null default '',
  type text not null check (type in ('noun','verb','adjective','adverb','expression','other')),
  target text not null check (target in ('passive','active')),
  state text not null default 'new' check (state in ('new','recognition','passive','slow_recall','usable','active')),
  grammar_json jsonb not null default '{}'::jsonb, commonness text, chunk text, example text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists vocabulary_normalized_word_idx on public.vocabulary (lower(trim(word)));
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  result text not null check (result in ('instant','slow','hint','wrong','easy','effort','needed_help','could_not_use')),
  review_type text not null check (review_type in ('review','activate')), reviewed_at timestamptz not null default now(), next_review_at timestamptz not null
);
create index if not exists reviews_vocabulary_date_idx on public.reviews (vocabulary_id, reviewed_at desc);
create index if not exists reviews_next_review_idx on public.reviews (next_review_at);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists vocabulary_set_updated_at on public.vocabulary;
create trigger vocabulary_set_updated_at before update on public.vocabulary for each row execute function public.set_updated_at();
alter table public.vocabulary enable row level security;
alter table public.reviews enable row level security;
drop policy if exists "v1 public vocabulary access" on public.vocabulary;
drop policy if exists "v1 public reviews access" on public.reviews;
create policy "v1 public vocabulary access" on public.vocabulary for all to anon using (true) with check (true);
create policy "v1 public reviews access" on public.reviews for all to anon using (true) with check (true);
