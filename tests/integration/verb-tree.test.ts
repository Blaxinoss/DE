import { describe, expect, test } from "bun:test";
import {
  createSupabaseTestEnvironment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./supabase-test-environment";
import type { Json } from "@/lib/database.types";

describe("verb tree", () => {
  test("returns a complete family and protects its hierarchy", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const rootLemma = `${token}nehmen`;
    const childLemma = `${token}aufnehmen`;
    const grandchildLemma = `${token}wiederaufnehmen`;
    const attemptedLemma = `${token}forbidden`;
    const lemmas = [rootLemma, childLemma, grandchildLemma, attemptedLemma];

    try {
      const user = await createTestUser(environment, "verb-tree");
      users.push(user);

      const { data: root, error: rootError } = await environment.admin
        .from("verb_tree_nodes")
        .insert({
          language: "de",
          lemma: rootLemma,
          normalized_lemma: rootLemma,
        })
        .select("id")
        .single();

      expect(rootError).toBeNull();
      expect(root).not.toBeNull();

      const { data: child, error: childError } = await environment.admin
        .from("verb_tree_nodes")
        .insert({
          language: "de",
          lemma: childLemma,
          normalized_lemma: childLemma,
          parent_id: root!.id,
        })
        .select("id")
        .single();

      expect(childError).toBeNull();
      expect(child).not.toBeNull();

      const { data: grandchild, error: grandchildError } = await environment.admin
        .from("verb_tree_nodes")
        .insert({
          language: "de",
          lemma: grandchildLemma,
          normalized_lemma: grandchildLemma,
          parent_id: child!.id,
        })
        .select("id")
        .single();

      expect(grandchildError).toBeNull();
      expect(grandchild).not.toBeNull();

      const { data: family, error: familyError } = await user.client.rpc(
        "get_verb_family",
        {
          p_language: "de",
          p_lemma: grandchildLemma,
        },
      );

      expect(familyError).toBeNull();
      expect(family).toHaveLength(3);
      expect(family?.map((node) => node.id)).toEqual([
        root!.id,
        child!.id,
        grandchild!.id,
      ]);
      expect(family?.map((node) => node.depth)).toEqual([0, 1, 2]);
      expect(family?.every((node) => node.root_id === root!.id)).toBe(true);

      const { error: duplicateError } = await environment.admin
        .from("verb_tree_nodes")
        .insert({
          language: "de",
          lemma: rootLemma,
          normalized_lemma: rootLemma,
        });
      expect(duplicateError?.code).toBe("23505");

      const { error: wrongLanguageError } = await environment.admin
        .from("verb_tree_nodes")
        .insert({
          language: "en",
          lemma: attemptedLemma,
          normalized_lemma: attemptedLemma,
          parent_id: root!.id,
        });
      expect(wrongLanguageError).not.toBeNull();

      const { error: cycleError } = await environment.admin
        .from("verb_tree_nodes")
        .update({ parent_id: grandchild!.id })
        .eq("id", root!.id);
      expect(cycleError).not.toBeNull();

      const { error: forbiddenInsertError } = await user.client
        .from("verb_tree_nodes")
        .insert({
          language: "de",
          lemma: attemptedLemma,
          normalized_lemma: attemptedLemma,
        });
      expect(forbiddenInsertError?.code).toBe("42501");
    } finally {
      await environment.admin
        .from("verb_tree_nodes")
        .delete()
        .in("normalized_lemma", lemmas);
      await deleteTestUsers(environment, users);
    }
  }, 30_000);

  test("atomically saves generated paths and returns the owned forest", async () => {
    const environment = createSupabaseTestEnvironment();
    const users: TestUser[] = [];
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const rootLemma = `${token}nehmen`;
    const childLemma = `${token}aufnehmen`;
    const leafLemma = `${token}wiederaufnehmen`;
    const conflictingRoot = `${token}other`;
    const senseKey = `${token}-generated-family`;
    const conflictingSenseKey = `${token}-conflict`;

    try {
      const user = await createTestUser(environment, "generated-verb-tree");
      users.push(user);

      const { data: saved, error: saveError } = await environment.admin.rpc(
        "save_generated_lexicon_entries",
        {
          p_language: "de",
          p_model: "integration-test",
          p_schema_version: 1,
          p_entries: [
            {
              sense_key: senseKey,
              word: leafLemma,
              normalized_word: leafLemma,
              meaning_ar: "معنى اختباري",
              type: "verb",
              grammar_json: {},
              commonness: "common",
              chunk: null,
              example: null,
              search_terms: [leafLemma],
              verb_family_path: [rootLemma, childLemma, leafLemma],
            },
          ] as Json,
        },
      );

      expect(saveError).toBeNull();
      expect(saved).toHaveLength(1);
      expect(saved?.[0]?.verb_tree_node_id).not.toBeNull();

      const { data: nodes, error: nodesError } = await environment.admin
        .from("verb_tree_nodes")
        .select("id, normalized_lemma, parent_id")
        .in("normalized_lemma", [rootLemma, childLemma, leafLemma]);
      expect(nodesError).toBeNull();
      expect(nodes).toHaveLength(3);

      const byLemma = new Map(nodes!.map((node) => [node.normalized_lemma, node]));
      expect(byLemma.get(rootLemma)?.parent_id).toBeNull();
      expect(byLemma.get(childLemma)?.parent_id).toBe(byLemma.get(rootLemma)?.id);
      expect(byLemma.get(leafLemma)?.parent_id).toBe(byLemma.get(childLemma)?.id);
      expect(saved?.[0]?.verb_tree_node_id).toBe(byLemma.get(leafLemma)?.id);

      const { error: copyError } = await user.client.from("vocabulary").insert({
        lexicon_id: saved![0]!.id,
        word: leafLemma,
        meaning_ar: "معنى اختباري",
        type: "verb",
        target: "active",
        grammar_json: {},
      });
      expect(copyError).toBeNull();

      const { data: forest, error: forestError } = await user.client.rpc(
        "get_user_verb_forest",
        { p_language: "de" },
      );
      expect(forestError).toBeNull();
      expect(forest?.map((node) => node.normalized_lemma)).toEqual([
        rootLemma,
        childLemma,
        leafLemma,
      ]);

      const { error: forbiddenSaveError } = await user.client.rpc(
        "save_generated_lexicon_entries",
        {
          p_language: "de",
          p_model: "forbidden",
          p_schema_version: 1,
          p_entries: [] as Json,
        },
      );
      expect(forbiddenSaveError?.code).toBe("42501");

      const { error: conflictError } = await environment.admin.rpc(
        "save_generated_lexicon_entries",
        {
          p_language: "de",
          p_model: "integration-test",
          p_schema_version: 1,
          p_entries: [
            {
              sense_key: conflictingSenseKey,
              word: leafLemma,
              normalized_word: leafLemma,
              meaning_ar: "تعارض",
              type: "verb",
              grammar_json: {},
              commonness: "common",
              chunk: null,
              example: null,
              search_terms: [leafLemma],
              verb_family_path: [conflictingRoot, leafLemma],
            },
          ] as Json,
        },
      );
      expect(conflictError).not.toBeNull();

      const { count: rolledBackNodes } = await environment.admin
        .from("verb_tree_nodes")
        .select("id", { count: "exact", head: true })
        .eq("normalized_lemma", conflictingRoot);
      const { count: rolledBackSenses } = await environment.admin
        .from("global_lexicon")
        .select("id", { count: "exact", head: true })
        .eq("sense_key", conflictingSenseKey);
      expect(rolledBackNodes).toBe(0);
      expect(rolledBackSenses).toBe(0);
    } finally {
      await environment.admin
        .from("global_lexicon")
        .delete()
        .in("sense_key", [senseKey, conflictingSenseKey]);
      await environment.admin
        .from("verb_tree_nodes")
        .delete()
        .in("normalized_lemma", [rootLemma, childLemma, leafLemma, conflictingRoot]);
      await deleteTestUsers(environment, users);
    }
  }, 30_000);
});
