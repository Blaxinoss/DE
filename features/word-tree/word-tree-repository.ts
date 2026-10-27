import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Json } from "@/lib/database.types";
import type { VerbFamilyQuery, VerbForestQuery } from "@/features/word-tree/schema";
import type {
  VerbFamily,
  VerbFamilyNode,
  VerbTreeSense,
} from "@/features/word-tree/types";

type FamilyRow = Database["public"]["Functions"]["get_verb_family"]["Returns"][number];
type ForestRow =
  Database["public"]["Functions"]["get_user_verb_forest"]["Returns"][number];

type LexiconRow = Pick<
  Database["public"]["Tables"]["global_lexicon"]["Row"],
  | "id"
  | "sense_key"
  | "word"
  | "verb_tree_node_id"
  | "meaning_ar"
  | "grammar_json"
  | "commonness"
  | "chunk"
  | "example"
>;

type VocabularyIdentityRow = Pick<
  Database["public"]["Tables"]["vocabulary"]["Row"],
  "lexicon_id" | "word"
>;

function normalizeLemma(value: string, language: VerbFamilyQuery["language"]): string {
  const locale = language === "de" ? "de-DE" : "en-US";

  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase(locale);
}

function groupSenses(
  lexiconRows: LexiconRow[],
  ownedLexiconIds: Set<string>,
): Map<string, VerbTreeSense[]> {
  const grouped = new Map<string, VerbTreeSense[]>();

  for (const row of lexiconRows) {
    if (!row.verb_tree_node_id) continue;
    const senses = grouped.get(row.verb_tree_node_id) ?? [];
    senses.push({
      lexiconId: row.id,
      senseKey: row.sense_key,
      word: row.word,
      meaningAr: row.meaning_ar,
      grammar: (row.grammar_json as Record<string, unknown>) ?? {},
      commonness: row.commonness,
      chunk: row.chunk,
      example: row.example,
      inVocabulary: ownedLexiconIds.has(row.id),
    });
    grouped.set(row.verb_tree_node_id, senses);
  }

  return grouped;
}

export async function getVerbFamily(
  client: SupabaseClient<Database>,
  input: VerbFamilyQuery,
): Promise<VerbFamily | null> {
  let lookupLemma = input.lemma;

  if (input.lexiconId) {
    const { data: lexicon, error: lexiconError } = await client
      .from("global_lexicon")
      .select("verb_tree_node_id")
      .eq("id", input.lexiconId)
      .eq("language", input.language)
      .maybeSingle();

    if (lexiconError) throw lexiconError;

    if (lexicon?.verb_tree_node_id) {
      const { data: linkedNode, error: nodeError } = await client
        .from("verb_tree_nodes")
        .select("lemma")
        .eq("id", lexicon.verb_tree_node_id)
        .eq("language", input.language)
        .single();

      if (nodeError) throw nodeError;
      lookupLemma = linkedNode.lemma;
    }
  }

  const { data: familyRows, error: familyError } = await client.rpc("get_verb_family", {
    p_language: input.language,
    p_lemma: lookupLemma,
  });

  if (familyError) throw familyError;
  if (!familyRows || familyRows.length === 0) return null;

  const nodes = await hydrateNodes(client, input.language, familyRows);

  return {
    rootId: nodes[0]!.rootId,
    requestedLemma: normalizeLemma(lookupLemma, input.language),
    nodes,
  };
}

export async function getUserVerbForest(
  client: SupabaseClient<Database>,
  input: VerbForestQuery,
): Promise<VerbFamily[]> {
  const { data: forestRows, error } = await client.rpc("get_user_verb_forest", {
    p_language: input.language,
  });

  if (error) throw error;
  if (!forestRows?.length) return [];

  const nodes = await hydrateNodes(client, input.language, forestRows);
  const familiesByRoot = new Map<string, VerbFamilyNode[]>();

  for (const node of nodes) {
    const family = familiesByRoot.get(node.rootId) ?? [];
    family.push(node);
    familiesByRoot.set(node.rootId, family);
  }

  return [...familiesByRoot.entries()]
    .map(([rootId, familyNodes]) => ({
      rootId,
      requestedLemma:
        familyNodes.find((node) => node.id === rootId)?.normalizedLemma ?? "",
      nodes: familyNodes,
    }))
    .filter((family) => family.nodes.length > 1);
}

async function hydrateNodes(
  client: SupabaseClient<Database>,
  language: VerbFamilyQuery["language"],
  familyRows: Array<FamilyRow | ForestRow>,
): Promise<VerbFamilyNode[]> {
  const familyIds = familyRows.map((node) => node.id);
  const [lexiconResult, vocabularyResult] = await Promise.all([
    client
      .from("global_lexicon")
      .select(
        "id, sense_key, word, verb_tree_node_id, meaning_ar, grammar_json, commonness, chunk, example",
      )
      .eq("language", language)
      .eq("type", "verb")
      .in("verb_tree_node_id", familyIds),
    client.from("vocabulary").select("lexicon_id, word").eq("language", language),
  ]);

  if (lexiconResult.error) throw lexiconResult.error;
  if (vocabularyResult.error) throw vocabularyResult.error;

  const vocabularyRows = vocabularyResult.data as VocabularyIdentityRow[];
  const ownedLexiconIds = new Set(
    vocabularyRows
      .map((word) => word.lexicon_id)
      .filter((id): id is string => id !== null),
  );
  const ownedLemmas = new Set(
    vocabularyRows.map((word) => normalizeLemma(word.word, language)),
  );
  const sensesByNode = groupSenses(
    lexiconResult.data as (LexiconRow & { grammar_json: Json })[],
    ownedLexiconIds,
  );

  return familyRows.map((row) => {
    const senses = sensesByNode.get(row.id) ?? [];

    return {
      id: row.id,
      language: row.language as VerbFamilyNode["language"],
      lemma: row.lemma,
      normalizedLemma: row.normalized_lemma,
      parentId: row.parent_id ?? null,
      rootId: row.root_id,
      depth: row.depth,
      unlocked:
        ownedLemmas.has(row.normalized_lemma) ||
        senses.some((sense) => sense.inVocabulary),
      senses,
    };
  });
}
