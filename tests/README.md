# Testing

This project uses Bun's built-in test runner.

## Commands

```bash
bun test
bun run test:watch
bun run test:coverage
bun run test:integration
bun run test:all
```

- Keep unit tests next to the code they test: `rules.ts` and `rules.test.ts`.
- Put real database tests under `tests/integration/`.
- Put browser journeys under `tests/e2e/` when Playwright is introduced.
- Reuse small data builders from `tests/factories/`.

Write each test as Arrange, Act, Assert. A test must prepare its own data and
must not depend on another test running first.

Database tests must use a disposable test project, never the production
Supabase project. They require `TEST_PUBLIC_SUPABASE_URL`,
`TEST_PUBLIC_SUPABASE_ANON_KEY`, and `TEST_SUPABASE_SECRET_KEY` in `.env.local`.
The integration-test guard refuses to run when the test project URL or secret
matches the application project.

The starter-pack integration test expects the current pack entries to exist in
the test project's `global_lexicon`. Validate and seed that project first:

```bash
bun scripts/database_seed_AllLevels.ts --validate-only
bun --env-file=.env.local scripts/database_seed_AllLevels.ts
bun run test:integration
```
