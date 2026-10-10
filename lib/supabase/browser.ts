import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

export { isSupabaseConfigured };

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
