import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Check,
  X,
  Download,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/lib/notes-parse";
import { downloadAnkiDeck } from "@/lib/anki-export";
import { deckSummary, recordCard, resetDeck, scheduleDeck, statFor } from "@/lib/srs";

export function FlashcardsView({
  cards,
  deckId,
  deckName = "Sophia Odyssey",
  onRegenerate,
  regenerating,
}: {
  cards: Flashcard[];
  /** Stable id used to remember spaced-repetition progress for this deck. */
  deckId?: string;
  deckName?: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const deck = deckId ?? "default";
  // Order the deck once per mount: hardest / due cards first.
  const ordered = useMemo(() => scheduleDeck(deck, cards), [deck, cards]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<Record<number, boolean>>({});
  const [summary, setSummary] = useState(() => deckSummary(deck, cards));

  useEffect(() => {
    setI(0);
    setFlipped(false);
    setGraded({});
  }, [ordered]);

  if (!ordered.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn't build flashcards from this response. Try generating again.
      </p>
    );
  }

  const card = ordered[i]!;
  const stat = statFor(deck, card);
  const total = ordered.length;
  const reviewed = Object.keys(graded).length;
  const knownCount = Object.values(graded).filter(Boolean).length;

  const go = (delta: number) => {
    setFlipped(false);
    setI((prev) => Math.min(total - 1, Math.max(0, prev + delta)));
  };

  const grade = (knew: boolean) => {
    recordCard(deck, card, knew);
    setGraded((g) => ({ ...g, [i]: knew }));
    setSummary(deckSummary(deck, cards));
    if (i < total - 1) go(1);
    else setFlipped(false);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>
          Card {i + 1} of {total}
        </span>
        <span className="inline-flex items-center gap-1">
          <RotateCw size={12} /> Tap to flip
        </span>
      </div>

      {/* Spaced-repetition status for the whole deck */}
      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
          {summary.due} due
        </span>
        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
          {summary.learning} learning
        </span>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
          {summary.known} known
        </span>
        {stat ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            this card: {stat.right}✓ / {stat.wrong}✗
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "relative flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 bg-gradient-to-br from-card to-muted/40 p-6 text-center shadow-sm transition active:scale-[0.98]",
          graded[i] === true
            ? "border-success/60"
            : graded[i] === false
              ? "border-destructive/60"
              : "border-border",
        )}
      >
        <span className="absolute left-4 top-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {flipped ? "Answer" : "Question"}
        </span>
        <p className="text-base font-semibold leading-relaxed">{flipped ? card.a : card.q}</p>
        {flipped && card.mnemonic ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-left text-xs font-semibold text-warning">
            <Lightbulb size={14} className="mt-0.5 shrink-0" />
            <span>Memory aid: {card.mnemonic}</span>
          </p>
        ) : null}
      </button>

      {/* Self-grading drives the spaced-repetition schedule */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl border-destructive/40 text-destructive"
          onClick={() => grade(false)}
        >
          <X size={18} /> Didn't know
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl border-success/40 text-success"
          onClick={() => grade(true)}
        >
          <Check size={18} /> Knew it
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="lg"
          className="flex-1 rounded-xl"
          disabled={i === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft size={18} /> Prev
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="flex-1 rounded-xl"
          disabled={i === total - 1}
          onClick={() => go(1)}
        >
          Next <ChevronRight size={18} />
        </Button>
      </div>

      {reviewed > 0 ? (
        <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">
          Reviewed {reviewed}/{total} this round · {knownCount} knew it
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => downloadAnkiDeck(ordered, deckName)}
        >
          <Download size={14} /> Export to Anki
        </Button>
        {onRegenerate ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            <Sparkles size={14} /> {regenerating ? "Generating…" : "Generate new set"}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-muted-foreground"
          onClick={() => {
            resetDeck(deck);
            setSummary(deckSummary(deck, cards));
            setGraded({});
            setI(0);
            setFlipped(false);
          }}
        >
          Reset progress
        </Button>
      </div>
    </div>
  );
}
