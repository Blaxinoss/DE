"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  verbFamilyQuerySchema,
  verbForestQuerySchema,
} from "@/features/word-tree/schema";
import type {
  VerbFamilyActionResult,
  VerbForestActionResult,
} from "@/features/word-tree/types";
import {
  getVerbFamily,
  getUserVerbForest,
} from "@/features/word-tree/word-tree-repository";

export async function getVerbFamilyAction(
  rawInput: unknown,
): Promise<VerbFamilyActionResult> {
  const parsed = verbFamilyQuerySchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, error: "Choose a valid verb and language." };
  }

  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  try {
    const family = await getVerbFamily(client, parsed.data);
    return { ok: true, family };
  } catch (error) {
    console.error("Could not load the verb family.", error);
    return {
      ok: false,
      error: "Could not load this word family. Please try again.",
    };
  }
}

export async function getVerbForestAction(
  rawInput: unknown,
): Promise<VerbForestActionResult> {
  const parsed = verbForestQuerySchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, error: "Choose a valid learning language." };
  }

  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Your session expired. Please sign in again." };
  }

  try {
    const families = await getUserVerbForest(client, parsed.data);
    return { ok: true, families };
  } catch (error) {
    console.error("Could not load the verb forest.", error);
    return {
      ok: false,
      error: "Could not load your word trees. Please try again.",
    };
  }
}
