/**
 * Export flashcards in an Anki-compatible format.
 *
 * Anki's "Import file" reads plain text with one note per line and fields
 * separated by a tab. We emit the documented header lines so the separator,
 * HTML handling and deck/tags are picked up automatically.
 */

import type { Flashcard } from "./notes-parse";

function field(text: string): string {
  // Tabs and newlines are the record separators, so they must go.
  return text.replace(/\r?\n/g, "<br>").replace(/\t/g, " ").trim();
}

function safeTag(text: string): string {
  return (
    text
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "Sophia_Odyssey"
  );
}

export function buildAnkiDeck(
  cards: Flashcard[],
  opts: { deckName: string; tags?: string[] } = { deckName: "Sophia Odyssey" },
): string {
  const tags = [safeTag(opts.deckName), ...(opts.tags ?? []).map(safeTag)].join(" ");
  const lines = [
    "#separator:tab",
    "#html:true",
    `#deck:${opts.deckName.replace(/[\r\n\t]/g, " ")}`,
    "#tags column:3",
  ];
  for (const c of cards) {
    const q = field(c.q);
    const a = field(c.a + (c.mnemonic ? `<br><br><i>Memory aid: ${c.mnemonic}</i>` : ""));
    if (!q || !a) continue;
    lines.push(`${q}\t${a}\t${tags}`);
  }
  return lines.join("\n") + "\n";
}

/** Triggers a download of the Anki text file. */
export function downloadAnkiDeck(cards: Flashcard[], deckName: string): void {
  if (typeof document === "undefined") return;
  const text = buildAnkiDeck(cards, { deckName });
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deckName.replace(/[^\w\- ]+/g, "").trim() || "flashcards"}-anki.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
