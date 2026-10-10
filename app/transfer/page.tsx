"use client";

import { ChangeEvent, useState } from "react";
import { Download, FileJson, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { useVocabulary } from "@/components/vocabulary-provider";
import { buildExport, parseImport } from "@/lib/import-export";
import { languageDetails } from "@/lib/languages";
import { LearningLanguage } from "@/lib/types";

const samples: Record<LearningLanguage, string> = {
  de: `{
  "words": [
    {
      "word": "vermeiden",
      "meaningAr": "يتجنب",
      "type": "verb",
      "target": "active",
      "grammar": { "past": "vermied", "auxiliary": "haben" },
      "chunk": "Fehler vermeiden"
    }
  ]
}`,
  en: `{
  "words": [
    {
      "word": "avoid",
      "meaningAr": "يتجنب",
      "type": "verb",
      "target": "active",
      "grammar": { "past": "avoided", "participle": "avoided" },
      "chunk": "avoid making a mistake"
    }
  ]
}`,
};

export default function TransferPage() {
  const { language, words, reviews, importWords } = useVocabulary();
  const details = languageDetails[language];
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const importData = async () => {
    try {
      setBusy(true);
      const result = await importWords(parseImport(json, language));
      setMessage(
        `Imported ${result.created} new and updated ${result.updated} existing ${result.updated === 1 ? "word" : "words"}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not import this JSON.",
      );
    } finally {
      setBusy(false);
    }
  };

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJson(String(reader.result));
    reader.readAsText(file);
  };

  const download = () => {
    const blob = new Blob(
      [JSON.stringify(buildExport(words, reviews, language), null, 2)],
      {
        type: "application/json",
      },
    );
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `wortweg-${language}-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <>
      <PageHeader
        eyebrow="Data portability"
        title="Import & export"
        description={`Bring ${details.name} vocabulary in or keep a portable snapshot of its learning data.`}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
              <Upload size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[var(--ink)]">
                Import vocabulary
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Existing words are matched and updated automatically.
              </p>
            </div>
          </div>
          <textarea
            className="field mt-6 min-h-80 resize-y font-mono text-sm leading-relaxed"
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder={samples[language]}
            spellCheck={false}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="btn-secondary flex-1">
              <FileJson size={18} />
              Choose JSON file
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={readFile}
              />
            </label>
            <button
              className="btn-primary flex-1"
              disabled={!json.trim() || busy}
              onClick={() => void importData()}
            >
              {busy ? "Importing…" : "Import words"}
            </button>
          </div>
          {message && (
            <p
              className="mt-4 rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] p-3 text-sm font-bold text-[var(--blue)]"
              role="status"
            >
              {message}
            </p>
          )}
        </section>

        <section className="surface flex flex-col p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--lime)] text-[#17200e]">
              <Download size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[var(--ink)]">Export progress</h2>
              <p className="text-sm text-[var(--muted)]">
                Download a complete, current JSON snapshot.
              </p>
            </div>
          </div>
          <div className="surface-muted my-8 p-6">
            <p className="eyebrow">Included</p>
            <ul className="mt-5 space-y-3 text-sm font-semibold text-[var(--ink-soft)]">
              <li>{details.name} words and Arabic meanings</li>
              <li>Target and current learning state</li>
              <li>Recent failures and latest result</li>
              <li>Grammar, chunks, examples and next review</li>
            </ul>
          </div>
          <div className="mt-auto">
            <p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">
              The export contains {words.length} {words.length === 1 ? "word" : "words"}{" "}
              and their review history.
            </p>
            <button
              className="btn-primary w-full"
              disabled={!words.length}
              onClick={download}
            >
              <Download size={18} />
              Download progress JSON
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
