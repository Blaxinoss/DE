import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type AiAction = "generate_word" | "activate";

export async function consumeAiQuota(
  client: SupabaseClient<Database>,
  action: AiAction,
): Promise<void> {
  const { data: allowed, error } = await client.rpc("consume_ai_quota", {
    p_action: action,
  });

  if (error) {
    throw new Error("AI_QUOTA_CHECK_FAILED", { cause: error });
  }

  if (!allowed) {
    throw new Error("AI_DAILY_LIMIT_REACHED");
  }
}
