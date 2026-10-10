# Project architecture

The code is organized by feature. A file lives beside the business flow that
owns it, while `lib` is reserved for infrastructure shared by multiple
features.

## Folder ownership

```text
app/                         Next.js pages, layouts, and route handlers
components/                  UI used across multiple features
hooks/                       React hooks used across multiple features
features/auth/               Authentication actions, forms, and validation
features/activation/         Activation evaluation, history, and UI
features/learning/           Shared learning types, rules, and language config
features/vocabulary/         Vocabulary bank, dictionary lookup, and persistence
lib/ai/                      Shared Gemini client, quota, and JSON-schema helpers
lib/supabase/                Supabase client constructors
lib/database.types.ts        Generated database types
supabase/                    SQL schema and migrations
```

`app` composes a route; it does not own business logic. Feature-specific UI,
Server Actions, validation, and database access stay inside their feature.
Only genuinely cross-feature infrastructure belongs in `lib`.

## Main traces

### Submit an activation session

```text
app/activate/page.tsx
  -> features/activation/submit-activation.ts
     -> features/activation/gemini-evaluator.ts
     -> Supabase RPC: record_learning_results
     -> Supabase RPC: save_activation_history
```

`submitActivation` is the public entry point. The same file authenticates the
request, validates due words, calls Gemini, maps scores to learning results,
and coordinates persistence. Its private functions name each step, so tracing
does not require jumping through wrapper files.

### Search or generate a dictionary entry

```text
features/vocabulary/components/vocabulary-form.tsx
  -> features/vocabulary/dictionary-actions.ts
     -> features/vocabulary/shared-dictionary-repository.ts
     -> features/vocabulary/gemini-word-generator.ts (only when generating)
```

`searchDictionary` reads the shared dictionary. `generateDictionaryEntry`
uses Gemini, saves every generated suggestion to the shared dictionary, and
returns those suggestions to the form.

### Save and review the user's vocabulary

```text
route page
  -> features/vocabulary/components/vocabulary-provider.tsx
     -> features/vocabulary/vocabulary-repository.ts
        -> Supabase table or record_learning_results RPC
```

The provider owns browser state and exposes vocabulary operations to pages.
The repository is the only browser-side vocabulary persistence module.

### Authentication

```text
auth page
  -> features/auth/components/*
     -> features/auth/actions.ts
        -> lib/supabase/server.ts
```

The confirmation callback remains in `app/auth/confirm/route.ts` because it is
an HTTP route handler. Reusable auth logic lives under `features/auth`.

## Supabase clients

- `createBrowserSupabaseClient`: Client Components and browser repositories.
- `createServerSupabaseClient`: Server Actions, Server Components, and routes.
- `createAdminSupabaseClient`: trusted server-only maintenance of shared data.

The middleware refreshes sessions; it does not replace these clients. Each
runtime still needs the correct cookie-aware or browser-aware client.

## Naming conventions

- Public operations describe the user action: `submitActivation`,
  `searchDictionary`, `generateDictionaryEntry`, `recordLearningResults`.
- Database modules end in `repository`.
- Gemini-specific modules include `gemini` in the name.
- Pure validation shapes live in `schema.ts` or `*-schema.ts`.
- Tests live beside the code they verify.
