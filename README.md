# Wortweg

Wortweg is a personal vocabulary coach for moving words from recognition to
natural active use. It combines spaced retrieval practice with AI-evaluated
writing exercises and keeps every user's data isolated in Supabase.

The application currently supports two independent learning courses:

- German (`de`)
- English (`en`)

The interface is in English, while meanings and AI feedback are written in
Arabic. Switching course does not translate or move words: each language keeps
its own vocabulary, reviews, progress, imports, and exports.

## Features

- Email/password signup, login, confirmation, and logout with Supabase Auth.
- Multi-tenant data isolation with PostgreSQL Row Level Security.
- A persisted German/English course switcher for every account.
- Smart vocabulary entry with debounced shared-dictionary search and an
  explicit Gemini fallback for missing entries.
- Arabic meanings, flexible grammar JSON, chunks, and examples are populated
  automatically, while user copies remain independently editable.
- Compact, collapsible vocabulary cards with search and learning-state filters.
- Spaced review sessions with `Instant`, `Slow`, `Hint`, and `Wrong` grading.
- AI activation exercises evaluated by Gemini using validated structured JSON.
- Sentence-level grammar, naturalness, and meaning scores.
- Per-target-word meaning, grammar, naturalness, and collocation evaluation.
- Persisted activation history with answers, corrections, scores, errors, and
  per-word performance.
- Import and export as portable JSON.
- Responsive dark UI with desktop and mobile navigation.
- No `localStorage` persistence or local demo-data fallback.

## Technology

| Area                        | Technology                                    |
| --------------------------- | --------------------------------------------- |
| Runtime/package manager     | Bun                                           |
| Web application             | Next.js 15 App Router, React 19, TypeScript   |
| Styling                     | Tailwind CSS 4                                |
| Database and authentication | Supabase Postgres, Auth, RLS, `@supabase/ssr` |
| AI evaluation               | Google Gemini through `@google/genai`         |
| Runtime validation          | Zod                                           |
| Icons                       | Lucide React                                  |

## User journey

1. Create an account or sign in.
2. Choose the German or English course from the sidebar or mobile header.
3. Type a word, choose a cached or AI-generated meaning, select the learning
   target, or import a JSON file.
4. Review due words using Arabic-to-target-language retrieval.
5. When active-target words reach an eligible state, use them in an activation
   writing exercise.
6. Gemini returns corrections and scores; Wortweg converts those results into
   learning outcomes and schedules the next review.
7. Revisit saved writing and feedback from Activation History.
8. The dashboard recommends the most useful next action.

A new language course starts empty by design. Existing vocabulary created
before multilingual support is preserved as German.

## Learning model

Words move through the following states:

```text
new → learning → recall → active
```

`active` is not a terminal archive state. Active words continue to receive
scheduled reviews.

### Base review intervals

| State      |       Base interval |
| ---------- | ------------------: |
| `new`      | 0.25 days (6 hours) |
| `learning` |               1 day |
| `recall`   |              4 days |
| `active`   |             14 days |

The final interval also depends on the result:

- `instant` and `easy`: base interval × 1.5.
- `slow` and `effort`: base interval.
- `hint` and `needed_help`: base interval × 0.35, with a minimum of 0.2 days.
- `wrong` and `could_not_use`: retry in 2 hours.

State transitions are direct and depend only on the current state, result, and
exercise type:

- A positive Review moves `new` to `learning`.
- An `instant` Review moves `learning` to `recall`; `slow` keeps it in
  `learning`.
- An `easy` Activate moves `recall` to `active`; `effort` keeps it in `recall`.
- `hint` and `needed_help` keep the current state and schedule an earlier retry.
- `wrong` and `could_not_use` immediately demote `active` to `recall` or
  `recall` to `learning`; words do not demote from `learning` back to `new`.

The scheduling and state-transition rules live in
[`lib/learning.ts`](lib/learning.ts).

## Review and activation

### Review

A word is due when its vocabulary-level `next_review_at` is `null` or in the
past. The Review page shows the Arabic meaning first and asks the learner to
retrieve the word in the selected target language. Due `recall` words with an
active target are routed to Activate instead, so one exercise cannot postpone
the other.

### Activation

Activation is available to words that:

- have `target = active`; and
- are currently `recall`; and
- have a due `next_review_at`.

Each writing exercise contains at most four target words. Up to three exercises
are grouped into one Gemini request, so a single request evaluates at most 12
target words.

The model evaluates:

- the complete answer: correctness, grammar, naturalness, and meaning;
- every target word: actual use, meaning, surrounding grammar, naturalness,
  collocation, and a `0–10` usage score;
- individual errors with severity, correction, Arabic explanation, and related
  vocabulary IDs.

Wortweg—not Gemini—decides the learning result:

| Condition                                              | Result          |
| ------------------------------------------------------ | --------------- |
| Word missing or meaning incorrect                      | `could_not_use` |
| Score ≤ 4, grammar incorrect, or collocation incorrect | `needed_help`   |
| Score < 8 or usage is unnatural                        | `effort`        |
| Otherwise                                              | `easy`          |

The request and response are validated with Zod. Attempt IDs and vocabulary IDs
must match the input exactly. Reviews are written only after the complete AI
response passes validation. Retryable `429` and `5xx` Gemini errors are retried
once.

Relevant files:

- [`app/activate/page.tsx`](app/activate/page.tsx)
- [`app/activate/actions.ts`](app/activate/actions.ts)
- [`lib/ai/activation-schema.ts`](lib/ai/activation-schema.ts)
- [`lib/ai/evaluate-activation.ts`](lib/ai/evaluate-activation.ts)
- [`lib/ai/activation-result.ts`](lib/ai/activation-result.ts)

## Architecture

```text
Browser
├── AppShell and language switcher
├── VocabularyProvider (in-memory UI state)
├── Vocabulary / Review / Activate / Transfer pages
└── Supabase browser client
        ↓ authenticated requests + RLS
Supabase
├── auth.users
├── vocabulary
├── reviews
├── user_preferences
└── global_lexicon

New vocabulary form
    ↓ debounced server search
Global lexicon exact → alias → prefix → fuzzy ranking
    ↓ explicit Generate when missing
Gemini structured lexical candidates
    ↓ Zod validation + server-only cache write
Global lexicon
    ↓ user chooses one meaning
Independent copy in vocabulary

Activation page
    ↓ Next.js Server Action
Zod input validation
    ↓
Gemini structured-output request
    ↓
Zod output + ID coverage validation
    ↓
Learning result calculation
    ↓
Atomic batch review insert + vocabulary updates
    ↓ separate best-effort transaction
Activation attempts + per-word history
```

The app has no persistent client-side cache. Supabase is the source of truth.
Loaded data is held in React context for the current session and updated after
successful mutations. Refreshing the page fetches the latest database state.

## Database model

### `vocabulary`

Stores the user's target-language words and current learning state. Important
columns include:

- `user_id`: owner, linked to `auth.users`.
- `language`: `de` or `en`.
- `word` and `meaning_ar`.
- `type`, `target`, and `state`.
- `next_review_at`: the word's current effective review schedule; `null` means
  it has not been scheduled yet and is due immediately.
- `grammar_json`: flexible language-specific metadata.
- `chunk`, `example`, and `commonness`.
- `created_at` and `updated_at`.

Words are unique by normalized `(user_id, language, word)`. The same spelling
may therefore exist in both courses.

### `reviews`

Every review or activation result is inserted as a new historical event. A
review is never overwritten and does not own the current schedule. The
`record_learning_result` database function atomically inserts the event and
updates the vocabulary row's state and next review time. Ownership is enforced
through the related vocabulary row.

`record_learning_results` applies a whole evaluated word batch in one database
transaction, so an activation group cannot update only some of its words.

### `activation_attempts`

Stores one row per submitted writing exercise: the original answer, overall
scores and feedback, corrected and natural alternatives, structured errors,
model name, and evaluator version.

### `activation_word_results`

Stores structured evaluation for every target word and links it to both its
attempt and the review created by the core learning transaction. Word feedback
is nullable when the use was correct and no actionable note was needed.

History is intentionally saved after the core review transaction. If history
persistence fails, vocabulary progress remains saved and the UI reports a
warning instead of asking the learner to repeat the exercise.

### `user_preferences`

Stores the current `learning_language` for each account. The course switcher
updates this row, so the choice survives refreshes and new sessions.

### `global_lexicon`

Stores reusable German and English lexical senses generated by Gemini. A word
may have several rows with different `sense_key` values. `search_terms` connects
useful lookup variants such as `erinnern` and `sich erinnern`; the search RPC
ranks exact words, exact aliases, prefixes, then trigram similarity.

Authenticated users may search this table but cannot write it. Validated writes
use a server-only Supabase secret key. Selecting an entry copies its lexical
fields into `vocabulary`, so later edits to either row do not mutate the other.

All application tables use RLS. Authenticated users can only access their own
vocabulary, related reviews, and preference row; the shared lexicon is
read-only from the user session.

## Prerequisites

- [Bun](https://bun.sh/) 1.3 or newer.
- A Supabase project.
- A Gemini API key for Activate and missing dictionary entries.
- A server-only Supabase secret key for validated global-lexicon writes.
- Git and Node-compatible tooling expected by Next.js.

Docker is not required to run the Next.js application or execute the full SQL
schema in the Supabase dashboard. Some Supabase local-development commands,
including shadow-database workflows, require Docker Desktop or Podman.

## Local setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure the environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-only-secret-key
GEMINI_API_KEY=your-server-only-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

| Variable                               | Exposure     | Purpose                                                      |
| -------------------------------------- | ------------ | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser-safe | Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Supabase publishable/anon key; RLS still controls access     |
| `SUPABASE_SECRET_KEY`                  | Server only  | Writes validated AI entries to the read-only shared lexicon  |
| `GEMINI_API_KEY`                       | Server only  | Activation evaluation and missing lexical-entry generation   |
| `GEMINI_MODEL`                         | Server only  | Optional model override; defaults to `gemini-3.5-flash-lite` |

Never prefix either server key with `NEXT_PUBLIC_` and never commit `.env.local`.

### 3. Create the database

For a new Supabase project, open the SQL editor and execute the complete
[`supabase/schema.sql`](supabase/schema.sql) file. It creates the tables,
indexes, trigger, permissions, RLS policies, and multilingual preferences.

For an existing linked project created with the older German-only schema, apply
the additive migration:

```bash
bunx supabase login
bunx supabase link --project-ref YOUR_PROJECT_REF
bunx supabase db push --dry-run
bunx supabase db push
```

The migration in
[`supabase/migrations/20261009000000_add_learning_languages.sql`](supabase/migrations/20261009000000_add_learning_languages.sql)
preserves existing rows, labels them as German, changes the unique index, and
creates `user_preferences`.

Do not run both the full schema and a destructive reset against a database that
already contains data unless that reset is intentional.

### 4. Configure Supabase Auth

Enable the Email provider in Supabase Authentication. Add local and deployed
origins to the project's Site URL/Redirect URL configuration, for example:

```text
http://localhost:3000
http://localhost:3000/auth/confirm
https://your-domain.example
https://your-domain.example/auth/confirm
```

If email confirmation is enabled, signup shows a confirmation message. The
callback route accepts either a PKCE `code` or Supabase `token_hash` and then
redirects to `/dashboard`.

For an SSR token-hash confirmation link, set the Supabase **Confirm signup**
email template link to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

### 5. Start the app

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command                           | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `bun install`                     | Install locked dependencies               |
| `bun run dev`                     | Start Next.js with Turbopack              |
| `bun run typecheck`               | Run TypeScript without emitting files     |
| `bun run build`                   | Create and validate a production build    |
| `bun run start`                   | Serve the production build                |
| `bunx supabase db push --dry-run` | Preview pending linked-project migrations |
| `bunx supabase db push`           | Apply pending linked-project migrations   |

## Import format

Imports are applied to the language course currently selected in the UI. The
JSON does not need a language property.

```json
{
  "words": [
    {
      "word": "avoid",
      "meaningAr": "يتجنب",
      "type": "verb",
      "target": "active",
      "state": "new",
      "grammar": {
        "baseForm": "avoid",
        "past": "avoided",
        "pastParticiple": "avoided",
        "gerund": "avoiding",
        "pattern": "avoid + noun / gerund"
      },
      "commonness": "very common",
      "chunk": "avoid making a mistake",
      "example": "I try to avoid making the same mistake twice."
    }
  ]
}
```

Supported word types:

```text
noun, verb, adjective, adverb, expression, other
```

Supported targets:

```text
passive, active
```

Supported states:

```text
new, learning, recall, active
```

The parser also accepts `meaning_ar` and `grammar_json`. Unknown or missing word
types become `other`; unknown states become `new`; targets other than `passive`
become `active`. Legacy states remain import-compatible: `recognition` and
`passive` become `learning`, while `slow_recall` and `usable` become `recall`.

## Export format

Export downloads only the currently selected language course. Each word
includes its learning metadata, latest review status, and next review time. The
recent-failure count is derived from at most the five latest reviews; the raw
review rows are not included. The top-level object also includes the course
language and export timestamp.

## Language support

Language behavior is centralized in [`lib/languages.ts`](lib/languages.ts):

- display and native names;
- locale used for normalization;
- input placeholders;
- activation task and answer placeholder.

The target language is sent in every activation request, and the server builds
the Gemini evaluator instructions from that value. Arabic remains the meaning
and feedback language, so `meaningAr`, `feedbackAr`, and `explanationAr` are
intentionally unchanged.

To add another target language:

1. Add its code to `learningLanguages` in [`lib/types.ts`](lib/types.ts).
2. Add its configuration in [`lib/languages.ts`](lib/languages.ts).
3. Add the code to the database check constraints through a new migration.
4. Update the language-switcher UI if more than two choices are available.
5. Add import examples and test review/activation behavior for that language.

Most of the vocabulary model is already language-neutral. `grammar_json` is
intentionally flexible, so German can store article/case data while English can
store forms, phrasal patterns, or usage notes without changing the schema.

## Authentication and session flow

- Login and signup use Next.js Server Actions.
- Browser access uses `createBrowserClient` from `@supabase/ssr`.
- Server Actions and route handlers use the cookie-aware server client.
- Middleware refreshes the Supabase session on navigation.
- Unauthenticated users are redirected to `/`.
- Authenticated users visiting `/` or `/signup` are redirected to `/dashboard`.
- RLS is the final authorization boundary; UI filtering is not treated as
  security.

## Data consistency and caching

- There is no `localStorage` data layer.
- There is no service-worker or application database cache.
- Initial page load reads from Supabase.
- Successful creates, updates, deletes, reviews, and language switches update
  the React context immediately.
- Export uses the currently loaded Supabase-backed context.
- A browser refresh discards memory state and fetches the latest rows again.

Supabase/PostgREST infrastructure may use normal HTTP/database-level caching,
but the application does not deliberately serve a stale local copy.

## Deployment

Vercel is the simplest deployment target:

1. Import the repository.
2. Add all variables from `.env.example` to the project environment.
3. Add the production URL and `/auth/confirm` URL in Supabase Auth settings.
4. Run `bun run typecheck` and `bun run build` before deployment.
5. Confirm that the linked database has the latest migration.

The Gemini key must remain a server-side environment variable. The Supabase
publishable key is allowed in the browser because table access is protected by
authentication and RLS.

## Project structure

```text
app/
├── activate/              # AI production practice and Server Action
├── auth/                  # Auth actions and confirmation callback
├── dashboard/             # Recommended next action and progress
├── review/                # Spaced retrieval flow
├── transfer/              # JSON import/export
└── vocabulary/            # Vocabulary bank and editor

components/
├── activation-feedback.tsx
├── app-shell.tsx
├── auth-form.tsx
├── vocabulary-form.tsx
└── vocabulary-provider.tsx

lib/
├── ai/                    # Gemini client, schemas, prompt, validation
├── supabase/              # Browser/server/middleware clients
├── database.types.ts      # Supabase TypeScript database types
├── import-export.ts
├── languages.ts
├── learning.ts
├── repository.ts
└── types.ts

supabase/
├── migrations/
└── schema.sql
```

## Security notes

- Never expose `GEMINI_API_KEY` to client components.
- Never expose `SUPABASE_SECRET_KEY` or a legacy Supabase service-role key to
  the browser.
- Keep RLS enabled when adding tables or policies.
- AI input is treated as untrusted learner data; embedded instructions are not
  followed.
- Server-side input size is limited, and both request and response structures
  are validated.
- AI-generated IDs must exactly match submitted attempt and vocabulary IDs.
- Do not rely on the UI or React context as an authorization layer.

## Troubleshooting

### `relation "user_preferences" does not exist` or `language` is missing

The multilingual migration has not been applied. Run:

```bash
bunx supabase db push --dry-run
bunx supabase db push
```

### English course is empty

This is expected the first time it is selected. Add or import English words;
German vocabulary remains in the German course.

### `GEMINI_API_KEY is missing`

Add the server-only key to `.env.local` and restart the development server.
Vocabulary and Review can work without Gemini, but Activate evaluation cannot.

### `The shared dictionary cache is not configured`

Add `SUPABASE_SECRET_KEY` to `.env.local` and restart the server. Get the secret
key from the Supabase project API settings. It must remain server-only. Shared
dictionary search still uses the signed-in user's RLS-protected session, while
this key is used only after a Gemini response passes Zod validation.

### Gemini returns `429` or a service error

The evaluator retries once for rate limits and retryable `5xx` responses. If it
still fails, wait for quota recovery or inspect the active model's project
limits. Failed evaluations do not save partial reviews.

### Supabase CLI asks for Docker during `db pull`

`db pull` creates a shadow database and may require Docker Desktop or Podman.
Use the checked-in schema/migration workflow or install a supported container
runtime. `db push` against a linked project does not normally need the local
Docker stack.

### Login works but data is empty or rejected

Confirm that:

- the schema and migration are applied to the same Supabase project as the env
  URL;
- the user has a valid session;
- RLS policies from `supabase/schema.sql` exist;
- the publishable key belongs to that project.

## Verification

Before committing or deploying:

```bash
bun run typecheck
bun run build
```

These checks validate TypeScript, Server/Client Component boundaries, route
generation, and the production bundle.
