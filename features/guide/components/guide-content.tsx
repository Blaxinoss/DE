import Image from "next/image";
import { ArrowRight, CalendarClock, ExternalLink } from "lucide-react";
import { StateBadge } from "@/components/ui";
import type { VocabularyState } from "@/features/learning/types";

type GuideTone = "blue" | "amber" | "teal" | "lime";

type GuideScreenshot = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type GuidePageDefinition = {
  id:
    | "journey"
    | "collect"
    | "states"
    | "schedule"
    | "review"
    | "activate"
    | "history"
    | "dashboard";
  eyebrow: string;
  title: string;
  description: string;
  points: readonly string[];
  note: string;
  tone: GuideTone;
  screenshot: GuideScreenshot | null;
};

export const guidePages = [
  {
    id: "journey",
    eyebrow: "The learning path",
    title: "Learn it. Recall it. Use it.",
    description: "Every word moves from New to Learning, Recall, then Active.",
    points: [],
    note: "Time makes a word due. Your answer moves it.",
    tone: "blue",
    screenshot: null,
  },
  {
    id: "collect",
    eyebrow: "1 · Add",
    title: "Choose the meaning you want",
    description:
      "Search, choose the right sense, then set Active use or Passive recognition.",
    points: ["Grammar, examples and noun articles are filled for you"],
    note: "A new word is ready for Review immediately.",
    tone: "teal",
    screenshot: {
      src: "/guide/add-vocabulary.webp",
      alt: "Adding a German word and choosing one of its meanings in Wortweg",
      width: 663,
      height: 979,
    },
  },
  {
    id: "states",
    eyebrow: "2 · States",
    title: "A state shows what you can do",
    description:
      "New and Learning build memory. Recall proves retrieval. Active proves use.",
    points: [
      "Review moves words toward Recall",
      "Activate moves Recall words toward Active",
    ],
    note: "A failed answer can move a word back one state.",
    tone: "amber",
    screenshot: {
      src: "/guide/vocabulary-bank.webp",
      alt: "Vocabulary bank showing words, states, targets and grammar details",
      width: 767,
      height: 997,
    },
  },
  {
    id: "schedule",
    eyebrow: "3 · Timing",
    title: "Practice only when a word is due",
    description: "Each state has a base delay; your answer adjusts the next date.",
    points: ["Strong answers wait longer; help brings the word back sooner"],
    note: "A failed answer returns in 2 hours.",
    tone: "amber",
    screenshot: null,
  },
  {
    id: "review",
    eyebrow: "4 · Review",
    title: "Remember before revealing",
    description: "Think of the answer, reveal it, then grade how recall really felt.",
    points: ["Instant · Slow · Hint · Wrong"],
    note: "No due words means Review is finished for now.",
    tone: "blue",
    screenshot: {
      src: "/guide/review-session.webp",
      alt: "A Wortweg review card with the four recall choices",
      width: 776,
      height: 759,
    },
  },
  {
    id: "activate",
    eyebrow: "5 · Activate",
    title: "Use the words yourself",
    description:
      "Write with due Recall words. AI checks the sentence and each target word.",
    points: [
      "Strong use moves Recall to Active",
      "Active words still return for maintenance",
    ],
    note: "Your answer and feedback are saved in History.",
    tone: "teal",
    screenshot: {
      src: "/guide/activation-feedback.webp",
      alt: "AI feedback for an activation exercise with sentence and word scores",
      width: 1175,
      height: 675,
    },
  },
  {
    id: "history",
    eyebrow: "6 · History",
    title: "Revisit useful corrections",
    description:
      "Open any saved Activation attempt to see your answer and its feedback again.",
    points: ["Compare the original and corrected sentences"],
    note: "Repeated mistakes show you what to practise next.",
    tone: "blue",
    screenshot: {
      src: "/guide/history.webp",
      alt: "Activation history listing saved attempts and their scores",
      width: 1526,
      height: 525,
    },
  },
  {
    id: "dashboard",
    eyebrow: "7 · Today",
    title: "Do the next useful action",
    description: "The dashboard sends you to Review first, then Activate when ready.",
    points: ["No task is due? You are done for now"],
    note: "Open Help any time to see this guide again.",
    tone: "lime",
    screenshot: {
      src: "/guide/dashboard-next-action.webp",
      alt: "Wortweg dashboard recommending the learner's next action",
      width: 1813,
      height: 995,
    },
  },
] as const satisfies readonly GuidePageDefinition[];

export type GuidePage = (typeof guidePages)[number];

export const guideToneStyles = {
  blue: "border-[var(--blue-line)] bg-[var(--blue-soft)] text-[var(--blue)]",
  amber: "border-[#5a4d32] bg-[#302a20] text-[#d2b97f]",
  teal: "border-[#345b55] bg-[#192f2d] text-[#91c9bd]",
  lime: "border-[#465d3a] bg-[#243021] text-[#a9c981]",
} as const;

const stages: Array<{
  state: VocabularyState;
  time: string;
  detail: string;
}> = [
  { state: "new", time: "6h base", detail: "Not reviewed successfully yet" },
  { state: "learning", time: "1 day", detail: "Retrieval is still forming" },
  { state: "recall", time: "4 days", detail: "Quick retrieval is proven" },
  { state: "active", time: "14 days", detail: "Production is proven" },
];

function JourneyVisual() {
  return (
    <div className="space-y-2.5">
      {stages.map((stage, index) => (
        <div key={stage.state}>
          <div className="rounded-xl border border-white/10 bg-black/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <StateBadge state={stage.state} />
              <span className="text-xs font-black text-current/80">{stage.time}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
              {stage.detail}
            </p>
          </div>
          {index < stages.length - 1 && (
            <ArrowRight
              className="mx-auto my-1 rotate-90 opacity-55"
              size={14}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ResultRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/10 px-3 py-2 text-xs">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function ScheduleVisual() {
  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-4 gap-1.5">
        {[
          ["New", "6h"],
          ["Learning", "1d"],
          ["Recall", "4d"],
          ["Active", "14d"],
        ].map(([label, time]) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-black/10 p-2 text-center"
          >
            <strong className="block text-sm text-[var(--ink)]">{time}</strong>
            <span className="mt-1 block text-[9px] font-bold opacity-70">{label}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <ResultRow
          label="Instant / Easy"
          value="× 1.5"
          tone="text-[#91c9bd]"
        />
        <ResultRow
          label="Slow / Effort"
          value="× 1"
          tone="text-[#9eb4df]"
        />
        <ResultRow
          label="Hint / Help"
          value="× 0.35"
          tone="text-[#d2b97f]"
        />
        <ResultRow
          label="Wrong / Could not use"
          value="2 hours"
          tone="text-[#d99b96]"
        />
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-5 text-[var(--ink-soft)]">
        <CalendarClock
          size={18}
          className="shrink-0"
        />
        Time makes a word due. Performance moves it.
      </div>
    </div>
  );
}

function ScreenshotVisual({ screenshot }: { screenshot: GuideScreenshot }) {
  return (
    <div className="space-y-3">
      <a
        href={screenshot.src}
        target="_blank"
        rel="noreferrer"
        className="group block overflow-hidden rounded-2xl border border-white/15 bg-[#08101a] shadow-2xl shadow-black/20"
        aria-label={`${screenshot.alt}. Open full-size image`}
      >
        <Image
          src={screenshot.src}
          alt={screenshot.alt}
          width={screenshot.width}
          height={screenshot.height}
          sizes="(max-width: 640px) 90vw, 460px"
          className="max-h-[29rem] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
        />
      </a>
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-current/70">
        <ExternalLink size={12} />
        Open screenshot full size
      </p>
    </div>
  );
}

export function GuideVisual({ page }: { page: GuidePageDefinition }) {
  if (page.screenshot) {
    return <ScreenshotVisual screenshot={page.screenshot} />;
  }

  if (page.id === "schedule") {
    return <ScheduleVisual />;
  }

  return <JourneyVisual />;
}
