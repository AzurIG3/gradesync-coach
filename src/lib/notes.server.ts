import { AI_MODEL, AI_MODEL_FAST } from "./ai-config";

/** Preferred model for Smart Notes (fast flash tier, with shared fallback). */
export const NOTES_MODEL = AI_MODEL_FAST;

export type GenMode = "summary" | "details" | "flashcards" | "quiz";

const CHART_HINT = `
If — and ONLY if — the notes contain clearly numeric data that is naturally suited to a bar or line chart (e.g. scores over time, comparisons between items, trends across years), append AT THE END of your reply a single fenced code block tagged \`chart\` with a JSON object:
\`\`\`chart
{"type":"bar","title":"Short title","xKey":"label","yKey":"value","data":[{"label":"A","value":10},{"label":"B","value":20}]}
\`\`\`
Use "type":"line" for trends over time, "bar" for comparisons. Keep data to at most 8 points. If the notes don't have numeric data suited to a chart, DO NOT include a chart block.`;

const HEADING_HINT = `
STRUCTURE the reply with proper Markdown heading levels so it's easy to scan:
- Use \`##\` for the main topic or section.
- Use \`###\` for subtopics under it.
- Use \`####\` only for very small sub-sub-labels (rare).
- Put paragraphs, bullet lists and tables UNDER the matching heading.
- Do not put everything under one heading and do not skip levels (no \`###\` without a parent \`##\`).
- Do NOT use a top-level \`#\` heading — the note already has a title.`;


const TABLE_HINT = `

TABLES AND COMPARISONS: Whenever content compares two or more things, or lists items with the same repeated fields (properties, units, dates, examples, differences), present it as a GitHub-flavoured Markdown table with a header row and \`---\` separator — not as long prose. Keep tables narrow so they read well on a phone: maximum 4 columns and short cell text (a few words). If more fields are needed, split into two tables or use \`###\` sub-headings with bullets instead.

PHONE-FRIENDLY STRUCTURE: Content that branches (cases, types, steps with sub-steps, if/else rules) must be laid out top-to-bottom: a \`###\` sub-heading or a bold label per branch, then short bullets under it. Never place branches side by side, never draw ASCII diagrams or trees, and keep nesting to two levels at most.`;

const VARIETY_HINT = `

VARIETY IS REQUIRED: Generate a FRESH, VARIED set each time. Deliberately pick different details, angles, phrasings and depth than the most obvious ones. Spread your picks across the WHOLE of the notes — beginning, middle and end — not just the first or most prominent facts. Mix question types (definition, application, cause/effect, comparison, numeric/example based). Assume this content has been used before: avoid repeating the same questions or the same wording.`;

export const MNEMONIC_HINT = `

MEMORY AIDS: Where a card covers a LIST, SEQUENCE, ORDER or FORMULA SET that is hard to remember, add a "mnemonic" field with a short memory trick (acronym, rhyme or vivid sentence). Omit the field for cards that don't need one — never force one.`;

const MNEMONIC_TEXT_HINT = `
MEMORY AIDS: When a group of key details is a list, sequence, order or set of formulas that must be memorised, add a short line right under it starting with **Memory aid:** giving an acronym, rhyme or vivid sentence to remember it. Only where it genuinely helps — never force one.`;

export const MODE_PROMPTS: Record<GenMode, string> = {
  summary:
    "Summarize the following study notes for a Pakistani Matric (Grade 9-10) student. Use simple words and short sentences. Reply in Markdown: start with a 3-6 sentence overview paragraph, then use `##` / `###` headings to group the main ideas, and put a short bulleted list under each. Use **bold** for key terms. If the notes contain a table of data, you may include a small Markdown table under the relevant heading." +
    HEADING_HINT +
    TABLE_HINT +
    CHART_HINT,
  details:
    "Pull out the KEY DETAILS a Matric (Grade 9-10) student must remember from the following study notes: important definitions, formulas, dates, names and facts. Reply in Markdown, grouped under `##` / `###` headings by topic, with short bullet points under each heading. Use **bold** for the label and plain text for the explanation. Keep the language simple. If the notes contain tabular data, you may include a small Markdown table." +
    HEADING_HINT +
    TABLE_HINT +
    MNEMONIC_TEXT_HINT +
    CHART_HINT,
  flashcards:
    'Create 8-12 flashcards from the following study notes for a Matric (Grade 9-10) student. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"q":"short question","a":"short simple answer (1-2 sentences)","mnemonic":"optional short memory trick"}]. Do not include any text before or after the JSON.' +
    MNEMONIC_HINT +
    VARIETY_HINT,
  quiz:
    'Create a 5-question multiple-choice practice quiz from the following study notes for a Matric (Grade 9-10) student. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"question":"...","options":["A option","B option","C option","D option"],"answerIndex":0,"explanation":"one short sentence explaining WHY the answer is right, using only facts from the notes","topic":"the sub-topic this question is about (2-4 words)"}]. Exactly 4 options per question. answerIndex is 0-3. Keep the language simple. Always fill in "explanation" and "topic".' +
    VARIETY_HINT,
};


/** Guarantees a single generated set never repeats itself internally. */
export const WITHIN_SET_HINT = `

NO REPEATS INSIDE THIS SET: Every question in this reply must be about a DIFFERENT fact. No two questions may share the same or a nearly identical stem/wording, and no two questions may have the same or nearly identical set of answer options. Before you finish, re-read your own list and replace any question that overlaps another one.`;

export type Difficulty = "easy" | "medium" | "hard";

/** Tunes how deep the generated questions go. */
export function difficultyHint(d: Difficulty): string {
  if (d === "easy") {
    return `

DIFFICULTY — EASY: Ask straightforward recall questions about clearly stated facts, definitions and names. Keep the wording very short and simple. Make the wrong options obviously different from the right one.`;
  }
  if (d === "hard") {
    return `

DIFFICULTY — HARD: Ask deeper questions that need understanding, not just recall: application to a new example, cause and effect, comparing two ideas, multi-step reasoning or working out a number. Make the wrong options plausible and close to the right one, so guessing is hard. Still keep the language simple.`;
  }
  return `

DIFFICULTY — MEDIUM: Mix straightforward recall with some questions that need real understanding or applying an idea. Keep distractors sensible but not tricky.`;
}

/**
 * Builds an explicit "already asked — do not repeat" block from previously
 * generated questions so the model has to find fresh angles.
 */
export function buildAvoidBlock(avoid: string[]): string {
  const list = avoid.filter(Boolean).slice(-40);
  if (!list.length) return "";
  return `\n\nALREADY ASKED — DO NOT REPEAT OR PARAPHRASE ANY OF THESE. Also avoid reusing their answer options or testing the same fact from a slightly different angle. Choose genuinely new questions from parts of the notes these do not cover:\n${list
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n")}`;
}

/**
 * Mastery-driven focus: topics the student keeps getting wrong get more
 * questions, topics they've mastered get fewer.
 */
export function buildFocusBlock(weak: string[], strong: string[]): string {
  const w = weak.filter(Boolean).slice(0, 8);
  const s = strong.filter(Boolean).slice(0, 8);
  if (!w.length && !s.length) return "";
  let out = "\n\nPERSONALISED FOCUS (based on this student's past results):";
  if (w.length) {
    out += `\n- The student is WEAK on these topics — spend MORE questions here and probe them from new angles: ${w.join(
      "; ",
    )}.`;
  }
  if (s.length) {
    out += `\n- The student has already MASTERED these — include at most one question each, and make it a deeper one: ${s.join(
      "; ",
    )}.`;
  }
  return out;
}



export const EXTRACT_PROMPT =
  "Extract ALL readable text content from this file exactly as it appears. Keep headings, lists and line breaks. Do not summarize, do not add any commentary. If the file has no readable text, reply with exactly: NO_TEXT_FOUND";

/**
 * One-pass prompt: read the file AND clean it up in a single Gemini call,
 * so image/PDF notes don't need a second round trip.
 */
export const EXTRACT_CLEAN_PROMPT = `Read this file and return its text as clean, well-structured study notes.

Do BOTH of these in one pass:
1. Extract ALL readable text exactly as it appears (headings, lists, tables, formulas, line breaks).
2. Fix obvious OCR/extraction errors using context (misread characters like "rn" -> "m", "0" -> "O", "l" -> "1", garbled characters, broken or joined words, stray symbols, page numbers, watermark fragments and scan noise), then reformat into readable notes: proper paragraphs, correct punctuation and capitalisation, Markdown headings (\`##\` / \`###\`) where the source clearly has headings, bullet or numbered lists where the source has lists, Markdown tables for tables, and $...$ / $$...$$ for maths.

Formatting that must be preserved and emphasised:
- Turn the page's own titles into Markdown headings: \`##\` for the main topic, \`###\` for each sub-topic. Never use a single \`#\`, and never skip a level.
- Turn every list on the page into a real Markdown bullet ("- ") or numbered list — one item per line. Never run list items together in a paragraph.
- Put **bold** on the important structure the page emphasises: key terms, definitions being named, labels before a colon, formula names, and anything underlined, boxed or written larger in the source.
- Use nested bullets (two spaces then "- ") where the source clearly has sub-points, and keep a blank line between headings, paragraphs and lists.

Strict rules:
- PRESERVE the original meaning and EVERY fact, number, name, date, definition and example. Do NOT summarize, shorten, merge or drop any information.
- Do NOT add new facts, explanations or commentary of your own.
- If a word is truly unreadable, use your best guess from context rather than inventing content.
- Reply with ONLY the cleaned notes. No preamble, no code fences around the whole answer.
- If the file has no readable text at all, reply with exactly: NO_TEXT_FOUND` + TABLE_HINT;


/** Cleans raw extracted/OCR text into readable notes WITHOUT losing information. */
export const CLEANUP_PROMPT = `You are cleaning up text that was extracted from a scanned page, photo or document. The extraction may contain OCR mistakes from blur, warping, shadows or bad lighting.

Your job:
1. Fix obvious OCR/extraction errors using context: misread words and characters (e.g. "rn" -> "m", "0" -> "O", "l" -> "1"), garbled characters, broken or split sentences, joined words, stray symbols and page artifacts (page numbers, watermark fragments, scan noise).
2. Reformat into clean, well-structured notes: proper paragraphs, correct spacing, correct punctuation and capitalisation, Markdown headings (\`##\` / \`###\`) where the source clearly has headings, and bullet or numbered lists where the source has lists.
3. Keep any tables as Markdown tables. Keep formulas and math as they are (use $...$ / $$...$$ if the source is mathematical).

Strict rules:
- PRESERVE the original meaning and EVERY fact, number, name, date, definition and example. Do NOT summarize, shorten, merge or drop any information.
- Do NOT add new facts, explanations or commentary of your own.
- If a word is truly unreadable, keep your best guess from context rather than inventing new content.
- Reply with ONLY the cleaned text. No preamble, no code fences around the whole answer.` + TABLE_HINT;

import {
  callGeminiShared,
  type GeminiFeature,
  type GeminiResult as SharedGeminiResult,
  type Part,
} from "./gemini.server";

export type { Part };
export type GeminiResult = SharedGeminiResult;

/**
 * Thin wrapper kept for the existing Smart Notes call sites — all of the
 * timeout / retry / logging behaviour now lives in the shared client.
 */
export async function callGemini(
  key: string,
  parts: Part[],
  systemPrompt: string,
  userProvidedKey: boolean,
  opts?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    feature?: GeminiFeature;
    models?: string[];
    responseMimeType?: string;
    timeoutMessage?: string;
  },
): Promise<GeminiResult> {
  return callGeminiShared({
    feature: opts?.feature ?? "generateFromNote",
    key,
    parts,
    systemPrompt,
    userProvidedKey,
    models: opts?.models ?? [...new Set([NOTES_MODEL, AI_MODEL])],
    ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts?.topP !== undefined ? { topP: opts.topP } : {}),
    maxOutputTokens: opts?.maxOutputTokens ?? 2048,
    ...(opts?.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
    ...(opts?.timeoutMessage ? { timeoutMessage: opts.timeoutMessage } : {}),
  });
}


