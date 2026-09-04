/** Server-only prompts for the extra AI helpers (re-explain, classify, cheat sheet, voice). */

export type Depth = "simple" | "standard" | "advanced";

export const DEPTH_PROMPTS: Record<Depth, string> = {
  simple:
    "Explain at the SIMPLEST level: very short sentences, everyday words, no jargon. Use one relatable everyday analogy. Aim for a student who is confused and needs the big picture first.",
  standard:
    "Explain at the NORMAL Matric exam level: clear definitions, the key steps, and one worked example. Keep it exam-appropriate.",
  advanced:
    "Explain at an ADVANCED level: go deeper into the why, mention the underlying rules or derivations, edge cases and common exam traps. Still keep the language readable.",
};

export const CONFUSED_PROMPT = `The student is confused by the answer below. Re-explain the SAME content in a much simpler way.

Rules:
- Start with one plain-language sentence: what this is really about.
- Use ONE relatable everyday analogy (cricket, cooking, buses, mobile phones, school) and connect each part of the analogy back to the real idea.
- Then give 3-5 short bullet points with the key facts, in the simplest words possible.
- End with one line: "In one sentence: ...".
- Do NOT add new topics. Do NOT use jargon without explaining it.
- Reply in Markdown, using \`##\` / \`###\` headings where it helps scanning.`;

export function reexplainSystem(depth: Depth, analogy: boolean): string {
  return (
    (analogy ? CONFUSED_PROMPT : "Re-explain the answer below for a Pakistani Matric/Intermediate student.") +
    "\n\nDEPTH: " +
    DEPTH_PROMPTS[depth]
  );
}

export const CONTINUE_PROMPT = `Continue the explanation below with MORE DEPTH. Do not repeat what has already been said.

- Add the next level of detail: further steps, more examples, exceptions, exam tips.
- Reply in Markdown with \`##\` / \`###\` headings and short bullets.
- Keep the language simple and exam-appropriate.`;

export const CLASSIFY_PROMPT = `You are filing a student's note under the correct chapter of an official syllabus.

You will get a numbered CHAPTER LIST and then the note content.
Reply with ONLY the exact chapter name copied from the list, nothing else — no numbering, no quotes, no explanation.
If the note does not clearly belong to any chapter in the list, reply with exactly: UNSORTED`;

export const CHEATSHEET_PROMPT = `Build a condensed one-page CHEAT SHEET for a Pakistani student from the notes below.

Include ONLY the things worth revising minutes before an exam:
- Key formulas (as math, using $...$ / $$...$$)
- Definitions in one line each
- Important constants, units, values, dates or names
- Short "remember this" rules and common mistakes
- A tiny Markdown table where it helps (e.g. units, comparisons)

Rules:
- Group with \`##\` headings per topic and \`###\` sub-headings where useful.
- Be extremely concise — no paragraphs of prose, no introductions, no summary of the summary.
- Use only facts present in the notes. Do not invent content.
- Where a list, sequence or formula set can be memorised with a trick, add a short **Memory aid:** line.`;

export const TRANSCRIBE_PROMPT =
  "Transcribe this audio recording of a student's spoken study note into text, exactly as spoken, in the same language. Keep sentences and natural paragraph breaks. Do not summarize, do not add commentary. If there is no intelligible speech, reply with exactly: NO_TEXT_FOUND";

export function weakSpotSystem(): string {
  return (
    'Create a multiple-choice practice quiz for a Pakistani Matric/Intermediate student that targets the WEAK TOPICS listed below. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"question":"...","options":["a","b","c","d"],"answerIndex":0,"explanation":"one short sentence explaining why","topic":"the weak topic this question belongs to (copy it exactly from the list)"}]. Exactly 4 options per question, answerIndex 0-3. ' +
    "Spread questions across ALL the listed topics, giving more questions to the topics with the lowest score. Keep the language simple and the facts standard-curriculum correct. Always fill in \"explanation\" and \"topic\"."
  );
}

export const MNEMONIC_HINT = `

MEMORY AIDS: Where a card covers a LIST, SEQUENCE, ORDER or FORMULA SET that is hard to remember, add a "mnemonic" field with a short memory trick (acronym, rhyme or vivid sentence). Omit the field for cards that don't need one — never force one.`;

/** Asks Gemini for a small, self-contained SVG diagram of a concept. */
export const DIAGRAM_PROMPT = `Draw ONE simple diagram that helps a Pakistani Matric/Intermediate student understand the notes below.

Reply with ONLY a raw SVG element. No prose, no code fences, no XML declaration, no <!DOCTYPE>.

SVG rules (must all be followed):
- Root: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" role="img" aria-label="...">
- Use ONLY these elements: svg, g, title, rect, circle, ellipse, line, polyline, polygon, path, text, tspan, marker, defs, linearGradient, stop.
- NO script, NO foreignObject, NO image, NO external links, NO event attributes (onclick etc.), NO CSS @import.
- Use currentColor for strokes/text so it works in dark mode, plus soft fills like fill="rgba(99,102,241,0.12)". Never rely on a white background.
- Keep text short (2-6 words per label), font-size between 14 and 20, font-family="inherit", and keep every label INSIDE the viewBox.
- Prefer a clear structure: a labelled flow/cycle (arrows via a marker), a labelled parts diagram, a comparison of 2-3 boxes, or a simple tree/hierarchy.
- Maximum ~15 shapes. Simple and legible beats detailed.
- Diagram only what the notes actually say. Do not invent facts.`;
