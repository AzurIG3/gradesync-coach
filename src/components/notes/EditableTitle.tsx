import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Inline editable title. Tap the title (or the pencil) to rename. */
export function EditableTitle({
  value,
  onSave,
  className,
  inputClassName,
  ariaLabel = "Rename",
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const t = draft.trim();
    if (t && t !== value) onSave(t);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          aria-label={ariaLabel}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-primary bg-background px-2 py-1 text-base font-bold outline-none",
            inputClassName,
          )}
        />
        <button
          type="submit"
          aria-label="Save"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <X size={16} />
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-left transition hover:opacity-80",
        className,
      )}
    >
      <span className="min-w-0 truncate">{value}</span>
      <Pencil
        size={14}
        className="shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100"
      />
    </button>
  );
}

/** Small pencil-only trigger for list rows. */
export function RenameIconButton({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!open) {
    return (
      <button
        aria-label="Rename note"
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
      >
        <Pencil size={16} />
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = draft.trim();
        if (t && t !== value) onSave(t);
        setOpen(false);
      }}
      className="flex w-full items-center gap-2"
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="min-w-0 flex-1 rounded-lg border border-primary bg-background px-2 py-1 text-sm font-bold outline-none"
      />
      <Button type="submit" size="sm" className="rounded-lg">
        Save
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </form>
  );
}
