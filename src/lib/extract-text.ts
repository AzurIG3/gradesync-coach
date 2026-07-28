import { extractFileText } from "./notes.functions";

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
 * Turns an uploaded file into plain text.
 * Word / Excel / text are parsed in the browser; PDFs and photos go to Gemini.
 */
export async function extractTextFromFile(file: File, apiKey: string): Promise<ExtractResult> {
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
      parts.push(`## ${sheet}`);
      parts.push(XLSXLib.utils.sheet_to_csv(wb.Sheets[sheet]));
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
