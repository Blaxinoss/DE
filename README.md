# Wortweg

A personal German vocabulary coach that moves words from recognition to active use. Built with Next.js, TypeScript, Tailwind CSS, Supabase, and Bun.

## Run with Bun

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000`. Without Supabase variables, the app runs in an explicit local demo mode with sample vocabulary.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Put the project URL and anon key in `.env.local`.
4. Restart the app.

V1 intentionally has no authentication. The included policies allow anyone with the project URL and anon key to read and write the two tables, so use a private Supabase project and do not share the deployment publicly until authentication is added.

## Verify and deploy

```bash
bun run typecheck
bun run build
```

Import the repository into Vercel and add the same two environment variables. Standard `npm install`, `npm run dev`, and `npm run build` also work because the scripts are package-manager neutral.
