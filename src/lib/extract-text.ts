import { cleanNoteText, extractFileText } from "./notes.functions";

export type ExtractResult =
  | { ok: true; text: string }
  | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result ?? "");
      resolve(r.slice(r.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

const DOCX = /\.(docx?)$/i;
const XLSX = /\.(xlsx|xls|csv)$/i;
const TXT = /\.(txt|md|rtf)$/i;

/**
 * Turns an uploaded file into raw plain text.
 * Word / Excel / text are parsed in the browser; PDFs and photos go to Gemini.
 */
async function extractRawTextFromFile(file: File, apiKey: string): Promise<ExtractResult> {
  const name = file.name;

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

  // PDFs and images -> Gemini text extraction (explicit user upload action).
  const mimeType = file.type || (name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (!mimeType) {
    return { ok: false, kind: "error", message: "This file type isn't supported yet." };
  }
  const data = await toBase64(file);
  const res = (await extractFileText({ data: { data, mimeType, apiKey } })) as ExtractResult;
  if (res.ok && res.text.trim() === "NO_TEXT_FOUND") {
    return { ok: false, kind: "error", message: "We couldn't find any readable text in that file." };
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
 * Extracts text from an uploaded file and then runs an AI cleanup pass that
 * fixes OCR/extraction errors and reformats the text into clean notes without
 * summarising. Spreadsheets are already structured, so they skip the cleanup.
 * If cleanup fails for any reason we keep the raw text rather than blocking.
 */
export async function extractTextFromFile(file: File, apiKey: string): Promise<ExtractResult> {
  const raw = await extractRawTextFromFile(file, apiKey);
  if (!raw.ok) return raw;

  const text = raw.text.trim();
  if (!text || XLSX.test(file.name)) return { ok: true, text };

  try {
    const res = (await cleanNoteText({ data: { text: text.slice(0, 60_000), apiKey } })) as
      | { ok: true; text: string }
      | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };
    if (res.ok && res.text.trim().length > 0) return { ok: true, text: res.text.trim() };
  } catch (e) {
    console.error("Note cleanup failed, keeping raw text", e);
  }
  return { ok: true, text };
}
