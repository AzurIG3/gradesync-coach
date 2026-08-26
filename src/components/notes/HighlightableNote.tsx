import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Highlighter, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/notes/Markdown";
import { highlightActions, paintHighlights, useHighlights } from "@/lib/highlights";

/**
 * Note content with a tap-and-drag highlighter.
 *
 * Turn the highlighter on, select some text and it is saved for this note.
 * Tapping an existing highlight removes it.
 */
export function HighlightableNote({ noteId, content }: { noteId: string; content: string }) {
  const phrases = useHighlights(noteId);
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Remount the markdown subtree whenever the highlight set changes so the DOM
  // starts clean before we paint <mark> elements into it.
  const version = useMemo(() => phrases.join("|"), [phrases]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    paintHighlights(root, phrases);
  }, [version, content, phrases]);

  const capture = useCallback(() => {
    if (!on) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    if (!ref.current || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) return;
    highlightActions.add(noteId, text);
    sel.removeAllRanges();
  }, [noteId, on]);

  function onClick(e: React.MouseEvent) {
    const mark = (e.target as HTMLElement).closest("mark");
    const phrase = mark?.getAttribute("data-phrase");
    if (phrase) highlightActions.remove(noteId, phrase);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant={on ? "default" : "outline"}
          size="sm"
          className="rounded-xl"
          onClick={() => setOn((v) => !v)}
          aria-pressed={on}
        >
          <Highlighter size={15} /> {on ? "Highlighting on" : "Highlight"}
        </Button>
        {phrases.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={() => highlightActions.clear(noteId)}
          >
            <Eraser size={15} /> Clear {phrases.length}
          </Button>
        )}
      </div>

      {on && (
        <p className="mb-2 text-xs text-muted-foreground">
          Select any text to mark it. Tap a highlight to remove it.
        </p>
      )}

      <div
        ref={ref}
        onMouseUp={capture}
        onTouchEnd={capture}
        onClick={onClick}
        className={on ? "select-text" : undefined}
      >
        <Markdown key={version}>{content}</Markdown>
      </div>
    </div>
  );
}
