import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type TestUser = {
  id: string;
  client: SupabaseClient<Database>;
};

export type SupabaseTestEnvironment = {
  admin: SupabaseClient<Database>;
  anonKey: string;
  url: string;
};

function requiredTestVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for database integration tests.`);
  }

  return value;
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "").toLowerCase();
}

export function createSupabaseTestEnvironment(): SupabaseTestEnvironment {
  const url = requiredTestVariable("TEST_PUBLIC_SUPABASE_URL");
  const anonKey = requiredTestVariable("TEST_PUBLIC_SUPABASE_ANON_KEY");
  const secretKey = requiredTestVariable("TEST_SUPABASE_SECRET_KEY");
  const applicationUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const applicationSecret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (applicationUrl && normalizeUrl(url) === normalizeUrl(applicationUrl)) {
    throw new Error(
      "Integration tests refused to use the application Supabase project.",
    );
  }

  if (applicationSecret && secretKey === applicationSecret) {
    throw new Error(
      "Integration tests refused to use the application Supabase secret key.",
    );
  }

  return {
    url,
    anonKey,
    admin: createClient<Database>(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}

export async function createTestUser(
  environment: SupabaseTestEnvironment,
  label: string,
): Promise<TestUser> {
  const uniquePart = crypto.randomUUID();
  const email = `rls-${label}-${uniquePart}@example.com`;
  const password = `Test-${uniquePart}-Aa1!`;
  const { data: created, error: createError } =
    await environment.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    throw createError ?? new Error(`Could not create test user ${label}.`);
  }

  const client = createClient<Database>(environment.url, environment.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    await environment.admin.auth.admin.deleteUser(created.user.id);
    throw signInError;
  }

  return {
    id: created.user.id,
    client,
  };
}

export async function deleteTestUsers(
  environment: SupabaseTestEnvironment,
  users: TestUser[],
): Promise<void> {
  const failures: string[] = [];

  for (const user of users) {
    const { error } = await environment.admin.auth.admin.deleteUser(user.id);

    if (error) {
      failures.push(`${user.id}: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Could not clean up test users: ${failures.join("; ")}`);
  }
}
