"use client";

import Link from "next/link";
import { LoaderCircle, Plus, Trees } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, LoadingState, PageHeader } from "@/components/ui";
import { getVerbForestAction } from "@/features/word-tree/actions";
import { VerbForestCanvas } from "@/features/word-tree/components/verb-family-canvas";
import type {
  VerbFamily,
  VerbFamilyNode,
  VerbTreeSense,
} from "@/features/word-tree/types";
import { languageDetails } from "@/features/learning/language-config";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";

export default function WordTreePage() {
  const { language, createWords } = useVocabulary();
  const details = languageDetails[language];
  const requestId = useRef(0);
  const [families, setFamilies] = useState<VerbFamily[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingSenseId, setAddingSenseId] = useState<string | null>(null);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    void getVerbForestAction({ language }).then((result) => {
      if (currentRequest !== requestId.current) return;
      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setFamilies(result.families);
      setSelectedNodeId(result.families[0]?.rootId ?? null);
    });

    return () => {
      requestId.current += 1;
    };
  }, [language]);

  const selectedNode = useMemo(
    () =>
      families
        .flatMap((family) => family.nodes)
        .find((node) => node.id === selectedNodeId) ?? null,
    [families, selectedNodeId],
  );
  const nodeCount = useMemo(
    () => families.reduce((total, family) => total + family.nodes.length, 0),
    [families],
  );

  const addSense = async (node: VerbFamilyNode, sense: VerbTreeSense) => {
    setAddingSenseId(sense.lexiconId);
    try {
      await createWords([
        {
          lexiconId: sense.lexiconId,
          word: sense.word,
          meaningAr: sense.meaningAr,
          type: "verb",
          target: "active",
          state: "new",
          grammar: sense.grammar,
          commonness: sense.commonness,
          chunk: sense.chunk,
          example: sense.example,
        },
      ]);

      setFamilies((current) =>
        current.map((family) => ({
          ...family,
          nodes: family.nodes.map((item) =>
            item.id === node.id
              ? {
                  ...item,
                  unlocked: true,
                  senses: item.senses.map((itemSense) =>
                    itemSense.lexiconId === sense.lexiconId
                      ? { ...itemSense, inVocabulary: true }
                      : itemSense,
                  ),
                }
              : item,
          ),
        })),
      );
      toast.success(`“${sense.word}” added to your vocabulary`);
    } catch (reason) {
      toast.error("Could not add this word", {
        description: reason instanceof Error ? reason.message : "Please try again.",
      });
    } finally {
      setAddingSenseId(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <>
      <PageHeader
        eyebrow="Word explorer"
        title={`Your ${details.name} verb forest`}
        description={`Explore ${
          language === "en" ? "derived and phrasal" : "separable and derived"
        } verb families. Unlocked nodes are words already in your vocabulary.`}
        action={
          families.length ? (
            <span className="chip px-3 py-2 text-sm font-bold">
              {families.length} families · {nodeCount} verbs
            </span>
          ) : undefined
        }
      />

      {error ? (
        <EmptyState
          title="Could not load your word trees"
          text={error}
        />
      ) : !families.length ? (
        <EmptyState
          title="No connected verb families yet"
          text={`Add a mapped ${details.adjective.toLowerCase()} verb to your vocabulary and its family will appear here.`}
          action={
            <Link
              className="btn-primary"
              href="/vocabulary?add=1"
            >
              Add a {details.adjective} verb
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <VerbForestCanvas
            families={families}
            onSelect={setSelectedNodeId}
          />
          <ExplorerDetails
            node={selectedNode}
            addingSenseId={addingSenseId}
            onAdd={addSense}
          />
        </div>
      )}
    </>
  );
}

function ExplorerDetails({
  node,
  addingSenseId,
  onAdd,
}: {
  node: VerbFamilyNode | null;
  addingSenseId: string | null;
  onAdd(node: VerbFamilyNode, sense: VerbTreeSense): Promise<void>;
}) {
  return (
    <aside className="surface sticky top-6 p-5">
      {!node ? (
        <div className="py-10 text-center text-[var(--muted)]">
          <Trees className="mx-auto mb-3" />
          Select a verb on the canvas.
        </div>
      ) : (
        <>
          <p className="eyebrow">Selected verb</p>
          <h2
            className="mt-1 text-2xl font-black"
            lang="de"
          >
            {node.lemma}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            {node.unlocked ? "Unlocked in your vocabulary" : "Not learned yet"}
          </p>

          <div className="mt-5 space-y-3">
            {!node.senses.length ? (
              <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
                No dictionary sense is linked to this node yet.
              </p>
            ) : (
              node.senses.map((sense) => (
                <article
                  key={sense.lexiconId}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-4"
                >
                  <p
                    className="font-bold leading-relaxed"
                    dir="rtl"
                    lang="ar"
                  >
                    {sense.meaningAr}
                  </p>
                  {sense.chunk && (
                    <p
                      className="mt-2 text-sm font-bold text-[var(--blue)]"
                      lang="de"
                    >
                      {sense.chunk}
                    </p>
                  )}
                  {sense.inVocabulary ? (
                    <p className="mt-3 text-xs font-black text-[var(--lime)]">
                      In your vocabulary
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--blue-line)] bg-[var(--blue-soft)] px-3 py-2 text-xs font-black text-[var(--blue)] disabled:opacity-60"
                      disabled={addingSenseId !== null}
                      onClick={() => void onAdd(node, sense)}
                    >
                      {addingSenseId === sense.lexiconId ? (
                        <LoaderCircle
                          className="animate-spin"
                          size={14}
                        />
                      ) : (
                        <Plus size={14} />
                      )}
                      Add meaning
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
