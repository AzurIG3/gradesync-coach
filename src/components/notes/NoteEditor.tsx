import { useRef, useState } from "react";
import { Bold, Italic, Heading2, Heading3, List, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tool = { id: string; label: string; icon: typeof Bold; wrap?: string; prefix?: string };

const TOOLS: Tool[] = [
  { id: "bold", label: "Bold", icon: Bold, wrap: "**" },
  { id: "italic", label: "Italic", icon: Italic, wrap: "*" },
  { id: "h2", label: "Heading", icon: Heading2, prefix: "## " },
  { id: "h3", label: "Subheading", icon: Heading3, prefix: "### " },
  { id: "list", label: "Bullet list", icon: List, prefix: "- " },
];

/**
 * Simple markdown editor with a formatting toolbar. Used to hand-edit the
 * cleaned notes and the AI-generated Summary / Key Details.
 */
export function NoteEditor({
  value,
  onSave,
  onCancel,
  label = "Edit",
}: {
  value: string;
  onSave: (next: string) => void;
  onCancel: () => void;
  label?: string;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draft.slice(start, end);

    let next = draft;
    let caret = end;

    if (tool.wrap) {
      const w = tool.wrap;
      next = `${draft.slice(0, start)}${w}${selected || "text"}${w}${draft.slice(end)}`;
      caret = start + w.length + (selected || "text").length + w.length;
    } else if (tool.prefix) {
      // Prefix every selected line (or the current line).
      const lineStart = draft.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = draft.indexOf("\n", end);
      const stop = lineEnd === -1 ? draft.length : lineEnd;
      const block = draft.slice(lineStart, stop);
      const prefixed = block
        .split("\n")
        .map((l) => (l.startsWith(tool.prefix!) ? l : `${tool.prefix}${l}`))
        .join("\n");
      next = `${draft.slice(0, lineStart)}${prefixed}${draft.slice(stop)}`;
      caret = lineStart + prefixed.length;
    }

    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-border bg-muted/60 p-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            aria-label={tool.label}
            title={tool.label}
            onClick={() => apply(tool)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <tool.icon size={16} />
          </button>
        ))}
      </div>

      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={label}
        className="min-h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-sm leading-relaxed outline-none focus:border-primary"
      />

      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1 rounded-xl font-bold" onClick={() => onSave(draft)}>
          <Check size={16} /> Save changes
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onCancel}>
          <X size={16} /> Cancel
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Markdown works here: **bold**, *italic*, ## headings and - bullets.
      </p>
    </div>
  );
}
