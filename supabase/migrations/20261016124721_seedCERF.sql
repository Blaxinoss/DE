ALTER TABLE public.global_lexicon
ADD COLUMN level_cerf varchar(2) Check (
        upper(level_cerf) in('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
    );
ALTER TABLE public.user_preferences
ADD COLUMN seeded_languages TEXT [] default '{}';