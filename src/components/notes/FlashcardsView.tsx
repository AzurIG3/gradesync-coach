import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/lib/notes-parse";

export function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn't build flashcards from this response. Try generating again.
      </p>
    );
  }

  const card = cards[i];
  const go = (delta: number) => {
    setFlipped(false);
    setI((prev) => Math.min(cards.length - 1, Math.max(0, prev + delta)));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Card {i + 1} of {cards.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <RotateCw size={12} /> Tap to flip
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-border bg-gradient-to-br from-card to-muted/40 p-6 text-center shadow-sm transition active:scale-[0.98]"
      >
        <span className="absolute left-4 top-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {flipped ? "Answer" : "Question"}
        </span>
        <p className="text-base font-semibold leading-relaxed">
          {flipped ? card.a : card.q}
        </p>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 rounded-xl"
          disabled={i === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft size={18} /> Prev
        </Button>
        <Button
          size="lg"
          className="flex-1 rounded-xl"
          disabled={i === cards.length - 1}
          onClick={() => go(1)}
        >
          Next <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}
