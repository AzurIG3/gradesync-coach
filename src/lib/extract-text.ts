import { cleanNoteText, extractFileText } from "./notes.functions";
import { getCachedText, hashFile, setCachedText } from "./extract-cache";
import { compressImage, toBase64 } from "./image-compress";

export type ExtractResult =
  | { ok: true; text: string }
  | { ok: false; kind: "rate_limit" | "bad_key" | "timeout" | "error"; message: string };

/** Stages reported back to the UI so the wait feels intentional. */
export type ExtractStage = "compressing" | "reading" | "cleaning" | "cached";
export type OnStage = (stage: ExtractStage, current?: number, total?: number) => void;

/**
 * Hard cap per file so a stalled model call surfaces a retry instead of hanging.
 * Sits just above the server's own 55s per-call cap so the server error wins
 * when it can, and the client still gives up well before the user does.
 */
const FILE_TIMEOUT_MS = 65_000;

function withTimeout<T>(work: Promise<T>, ms = FILE_TIMEOUT_MS): Promise<T | { timedOut: true }> {
  return Promise.race([
    work,
    new Promise<{ timedOut: true }>((resolve) => setTimeout(() => resolve({ timedOut: true }), ms)),
  ]);
}


const DOCX = /\.(docx?)$/i;
const XLSX = /\.(xlsx|xls|csv)$/i;
const TXT = /\.(txt|md|rtf)$/i;

/**
 * Turns an uploaded file into text.
 * Word / Excel / text are parsed in the browser; PDFs and photos go to Gemini,
 * which extracts AND cleans them in a single call (`cleaned: true`).
 */
async function extractRawTextFromFile(
  file: File,
  apiKey: string,
  onStage?: OnStage,
): Promise<(ExtractResult & { ok: true; cleaned?: boolean }) | (ExtractResult & { ok: false })> {
  const name = file.name;

  // Same file uploaded again? Serve the previous extraction instantly.
  const hash = await hashFile(file);
  const cached = getCachedText(hash);
  if (cached) {
    onStage?.("cached");
    return { ok: true, text: cached, cleaned: true };
  }

  if (TXT.test(name) || file.type.startsWith("text/")) {
    return { ok: true, text: (await file.text()).trim() };
  }


  if (DOCX.test(name)) {
    const mammoth = (await import("mammoth/mammoth.browser.js" as string)) as any;

    const buffer = await file.arrayBuffer();
    const res = await (mammoth as any).extractRawText({ arrayBuffer: buffer });
    return { ok: true, text: String(res.value ?? "").trim() };
  }


  if (XLSX.test(name)) {
    const XLSXLib = await import("xlsx");
    const wb = XLSXLib.read(await file.arrayBuffer(), { type: "array" });
    const parts: string[] = [];
    for (const sheet of wb.SheetNames) {
      const rows = XLSXLib.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], {
        header: 1,
        blankrows: false,
        defval: "",
      });
      parts.push(`## ${sheet}`);
      if (!rows.length) {
        parts.push("");
        continue;
      }
      const width = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
      if (width === 0) {
        parts.push("");
        continue;
      }
      const norm = (r: unknown[]) => {
        const out: string[] = [];
        for (let i = 0; i < width; i++) {
          const v = r[i];
          out.push(String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim());
        }
        return out;
      };
      const header = norm(rows[0] as unknown[]);
      // If header row is all empty, synthesize column names.
      const finalHeader = header.every((h) => !h)
        ? Array.from({ length: width }, (_, i) => `Col ${i + 1}`)
        : header.map((h, i) => h || `Col ${i + 1}`);
      parts.push(`| ${finalHeader.join(" | ")} |`);
      parts.push(`| ${finalHeader.map(() => "---").join(" | ")} |`);
      const bodyStart = header.every((h) => !h) ? 0 : 1;
      for (let i = bodyStart; i < rows.length; i++) {
        parts.push(`| ${norm(rows[i] as unknown[]).join(" | ")} |`);
      }
      parts.push("");
    }
    return { ok: true, text: parts.join("\n").trim() };
  }

  // PDFs and images -> Gemini extraction + cleanup in ONE call.
  const isImage = file.type.startsWith("image/");
  let mimeType = file.type || (name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (!mimeType) {
    return { ok: false, kind: "error", message: "This file type isn't supported yet." };
  }

  let data: string;
  if (isImage) {
    onStage?.("compressing");
    const shrunk = await compressImage(file);
    data = shrunk.data;
    mimeType = shrunk.mimeType || mimeType;
  } else {
    data = await toBase64(file);
  }

  onStage?.("reading");
  const raced = await withTimeout(
    extractFileText({ data: { data, mimeType, clean: true, apiKey } }) as Promise<ExtractResult>,
  );
  if ("timedOut" in raced) {
    return {
      ok: false,
      kind: "timeout",
      message:
        "Reading that file took too long and timed out. Please try again — smaller or clearer photos are usually much faster.",
    };
  }
  const res = raced;
  if (res.ok && res.text.trim() === "NO_TEXT_FOUND") {
    return { ok: false, kind: "error", message: "We couldn't find any readable text in that file." };
  }
  if (res.ok) {
    setCachedText(hash, res.text);
    return { ok: true, text: res.text, cleaned: true };
  }
  return res;
}


/**
 * Runs the shared AI cleanup pass over already-extracted raw text (used for
 * uploads and for transcribed voice notes). Falls back to the raw text.
 */
export async function cleanRawText(raw: string, apiKey: string): Promise<string> {
  const text = raw.trim();
  if (!text) return text;
  try {
    const res = (await cleanNoteText({ data: { text: text.slice(0, 60_000), apiKey } })) as
      | { ok: true; text: string }
      | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };
    if (res.ok && res.text.trim().length > 0) return res.text.trim();
  } catch (e) {
    console.error("Note cleanup failed, keeping raw text", e);
  }
  return text;
}

/**
 * Extracts text from an uploaded file. Images and PDFs come back already
 * cleaned from the single combined Gemini call; browser-parsed documents get
 * the separate cleanup pass. Spreadsheets are structured already, so they skip
 * cleanup. If cleanup fails we keep the raw text rather than blocking.
 */
export async function extractTextFromFile(
  file: File,
  apiKey: string,
  onStage?: OnStage,
): Promise<ExtractResult> {
  const raw = await extractRawTextFromFile(file, apiKey, onStage);
  if (!raw.ok) return raw;

  const text = raw.text.trim();
  if (!text || raw.cleaned || XLSX.test(file.name)) return { ok: true, text };

  onStage?.("cleaning");
  return { ok: true, text: await cleanRawText(text, apiKey) };
}

/**
 * Multi-file upload: extracts text from every file in the order given and
 * joins them with a small heading per file. Only text that isn't already clean
 * (browser-parsed documents) needs the extra cleanup pass.
 */
export async function extractTextFromFiles(
  files: File[],
  apiKey: string,
  onStage?: OnStage,
): Promise<ExtractResult> {
  if (files.length === 0) return { ok: false, kind: "error", message: "No files selected." };
  if (files.length === 1) return extractTextFromFile(files[0], apiKey, onStage);

  const parts: string[] = [];
  let needsCleanup = false;

  // Own-key users have their personal Google quota, so read files in parallel.
  // Shared-key users stay sequential so the pooled quota isn't hammered.
  if (apiKey) {
    let done = 0;
    const results = await Promise.all(
      files.map((file) =>
        extractRawTextFromFile(file, apiKey, (stage) => onStage?.(stage, done + 1, files.length)).then(
          (r) => {
            done += 1;
            onStage?.("reading", done, files.length);
            return r;
          },
        ),
      ),
    );
    for (let idx = 0; idx < results.length; idx++) {
      const res = results[idx];
      if (!res.ok) return res;
      const text = res.text.trim();
      if (!text) continue;
      if (!res.cleaned && !XLSX.test(files[idx].name)) needsCleanup = true;
      parts.push(`## ${files[idx].name.replace(/\.[^.]+$/, "")}\n\n${text}`);
    }
  } else {
    let i = 0;
    for (const file of files) {
      i += 1;
      const res = await extractRawTextFromFile(file, apiKey, (stage) =>
        onStage?.(stage, i, files.length),
      );
      if (!res.ok) return res;
      const text = res.text.trim();
      if (!text) continue;
      if (!res.cleaned && !XLSX.test(file.name)) needsCleanup = true;
      parts.push(`## ${file.name.replace(/\.[^.]+$/, "")}\n\n${text}`);
    }
  }

  const combined = parts.join("\n\n").trim();
  if (!combined) {
    return { ok: false, kind: "error", message: "We couldn't find any readable text in those files." };
  }
  if (!needsCleanup) return { ok: true, text: combined };
  onStage?.("cleaning");
  return { ok: true, text: await cleanRawText(combined, apiKey) };
}
