"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function dismissGuide(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Authentication required." };
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      show_guide: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Could not dismiss onboarding guide", error);
    return { ok: false, error: "Could not save your guide preference." };
  }

  return { ok: true };
}
