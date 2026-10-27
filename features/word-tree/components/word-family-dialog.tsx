"use client";

import { GitBranch, Layers3, LoaderCircle, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getVerbFamilyAction } from "@/features/word-tree/actions";
import {
  VerbFamilyCanvas,
  type FamilyCanvasView,
} from "@/features/word-tree/components/verb-family-canvas";
import type {
  VerbFamily,
  VerbFamilyNode,
  VerbTreeSense,
} from "@/features/word-tree/types";
import type { LearningLanguage } from "@/features/learning/types";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";

type Props = {
  language: LearningLanguage;
  lemma: string | null;
  lexiconId: string | null;
  onClose(): void;
};

export function WordFamilyDialog({ language, lemma, lexiconId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);
  const { createWords } = useVocabulary();
  const [family, setFamily] = useState<VerbFamily | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [view, setView] = useState<FamilyCanvasView>("structure");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingSenseId, setAddingSenseId] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!lemma) {
      if (dialog?.open) dialog.close();
      return;
    }

    if (dialog && !dialog.open) dialog.showModal();

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    setFamily(null);

    void getVerbFamilyAction({ language, lemma, lexiconId }).then((result) => {
      if (currentRequest !== requestId.current) return;

      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setFamily(result.family);
      const requestedNode = result.family?.nodes.find(
        (node) => node.normalizedLemma === result.family?.requestedLemma,
      );
      setSelectedNodeId(requestedNode?.id ?? result.family?.rootId ?? null);
    });

    return () => {
      requestId.current += 1;
    };
  }, [language, lemma, lexiconId]);

  const selectedNode = family?.nodes.find((node) => node.id === selectedNodeId) ?? null;

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

      setFamily((current) =>
        current
          ? {
              ...current,
              nodes: current.nodes.map((item) =>
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
            }
          : current,
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

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[96vh] w-[min(1540px,calc(100%-1rem))] overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-[#02060c]/80 backdrop:backdrop-blur-sm"
      aria-labelledby="word-family-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div onPointerDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <div>
            <p className="eyebrow">Verb family</p>
            <h2
              id="word-family-title"
              className="mt-1 text-2xl font-black"
              lang={language}
            >
              {lemma ?? "Word tree"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Explore related verbs, then add the meanings you want to learn.
            </p>
          </div>
          <button
            type="button"
            className="icon-button shrink-0"
            onClick={onClose}
            aria-label="Close word family"
          >
            <X size={20} />
          </button>
        </header>

        <div className="max-h-[calc(96vh-112px)] overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="grid min-h-80 place-items-center text-[var(--muted)]">
              <div className="text-center">
                <LoaderCircle className="mx-auto mb-3 animate-spin" />
                Loading the verb family…
              </div>
            </div>
          ) : error ? (
            <FamilyMessage
              title="Could not load this family"
              text={error}
            />
          ) : !family || !family.nodes.length ? (
            <FamilyMessage
              title="This family has not been mapped yet"
              text="The verb can stay in your vocabulary; its family will appear after the dictionary relationship is added."
            />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] p-1">
                  <ViewButton
                    active={view === "structure"}
                    icon={<GitBranch size={16} />}
                    onClick={() => setView("structure")}
                  >
                    Structure
                  </ViewButton>
                  <ViewButton
                    active={view === "overview"}
                    icon={<Layers3 size={16} />}
                    onClick={() => setView("overview")}
                  >
                    All words
                  </ViewButton>
                </div>
                <p className="text-sm font-semibold text-[var(--muted)]">
                  {family.nodes.length} related verbs
                </p>
              </div>

              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <VerbFamilyCanvas
                  family={family}
                  view={view}
                  onSelect={setSelectedNodeId}
                />

                <SensePanel
                  node={selectedNode}
                  addingSenseId={addingSenseId}
                  onAdd={addSense}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

function SensePanel({
  node,
  addingSenseId,
  onAdd,
}: {
  node: VerbFamilyNode | null;
  addingSenseId: string | null;
  onAdd(node: VerbFamilyNode, sense: VerbTreeSense): Promise<void>;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4 sm:p-5">
      {!node ? (
        <p className="text-sm text-[var(--muted)]">
          Choose a verb to see its meanings.
        </p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Meanings</p>
              <h3
                className="mt-1 text-xl font-black"
                lang={node.language}
              >
                {node.lemma}
              </h3>
            </div>
            <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">
              {node.senses.length} {node.senses.length === 1 ? "sense" : "senses"}
            </span>
          </div>

          {!node.senses.length ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
              This relationship exists, but its dictionary entry is not available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {node.senses.map((sense) => (
                <article
                  key={sense.lexiconId}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className="font-bold leading-relaxed text-[var(--ink-soft)]"
                      dir="rtl"
                      lang="ar"
                    >
                      {sense.meaningAr}
                    </p>
                    {sense.inVocabulary ? (
                      <span className="shrink-0 rounded-full border border-[var(--lime-line)] bg-[var(--lime-soft)] px-2 py-1 text-[11px] font-black text-[var(--lime)]">
                        In vocabulary
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--blue-line)] bg-[var(--blue-soft)] px-2.5 py-1.5 text-xs font-black text-[var(--blue)] transition hover:border-[var(--blue-strong)] disabled:opacity-60"
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
                        Add
                      </button>
                    )}
                  </div>
                  {sense.chunk && (
                    <p
                      className="mt-3 text-sm font-bold text-[var(--blue)]"
                      lang={node.language}
                    >
                      {sense.chunk}
                    </p>
                  )}
                  {sense.example && (
                    <p
                      className="mt-2 border-l-2 border-[var(--lime)] pl-3 text-sm leading-relaxed text-[var(--muted)]"
                      lang={node.language}
                    >
                      {sense.example}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ViewButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition ${
        active
          ? "bg-[var(--panel)] text-[var(--ink)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

function FamilyMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-80 place-items-center text-center">
      <div className="max-w-md">
        <GitBranch
          className="mx-auto mb-4 text-[var(--blue)]"
          size={34}
        />
        <h3 className="text-xl font-black">{title}</h3>
        <p className="mt-2 leading-relaxed text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}
