/**
 * Content-addressed cache for extracted note text.
 *
 * Extraction (OCR + AI cleanup) is the slowest part of adding a note, and
 * students often re-upload the exact same photo or PDF. Hashing the file bytes
 * lets us return the previous result instantly instead of paying for another
 * Gemini round trip.
 */

const KEY = "sophia.extract-cache.v1";
const MAX_ENTRIES = 40;
const MAX_TEXT = 120_000;

type Entry = { hash: string; text: string; at: number };

/** SHA-256 of the raw file bytes, hex encoded. Null when crypto is unavailable. */
export async function hashFile(file: Blob): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const digest = await subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    console.error("Could not hash file for cache", e);
    return null;
  }
}

function read(): Entry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    return Array.isArray(list) ? list.filter((e) => e && e.hash && e.text) : [];
  } catch {
    return [];
  }
}

function write(list: Entry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full — drop the oldest half and try once more.
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, Math.floor(MAX_ENTRIES / 2))));
    } catch {
      /* give up silently; the cache is only an optimisation */
    }
  }
}

export function getCachedText(hash: string | null): string | null {
  if (!hash) return null;
  const hit = read().find((e) => e.hash === hash);
  return hit ? hit.text : null;
}

export function setCachedText(hash: string | null, text: string) {
  if (!hash || !text.trim() || text.length > MAX_TEXT) return;
  const list = read().filter((e) => e.hash !== hash);
  list.unshift({ hash, text, at: Date.now() });
  write(list);
}

/**
 * Rough processing estimate so the wait feels predictable. Calibrated against
 * observed runs (a single photo is typically 20–40s end to end, PDFs longer),
 * deliberately erring on the generous side so the bar doesn't stall at 95%.
 * Images are shrunk before upload, so big photos cost less than raw bytes suggest.
 */
export function estimateSeconds(files: File[]): number {
  let total = 0;
  for (const f of files) {
    const mb = f.size / (1024 * 1024);
    const isImage = f.type.startsWith("image/");
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (isImage) total += 18 + Math.min(mb, 12) * 2;
    else if (isPdf) total += 22 + Math.min(mb, 20) * 3;
    else total += 4 + Math.min(mb, 10) * 0.6;
  }
  return Math.max(5, Math.round(total));
}


/** "about 25 seconds" / "about 1 min 10 sec" */
export function formatEstimate(seconds: number): string {
  if (seconds < 60) return `about ${seconds} seconds`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `about ${m} min ${s} sec` : `about ${m} min`;
}
