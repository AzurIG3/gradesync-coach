/**
 * Coordinated colour theme presets.
 *
 * Light/dark mode lives in `theme.tsx`; this file swaps a FULL coordinated
 * palette — background/parchment tint, surfaces, borders, primary, accent,
 * gold marker, path colour and the hero gradient — so each theme speaks the
 * same "journey to wisdom" design language rather than only swapping accents.
 * Values are written into one <style> tag so they override styles.css without
 * touching components.
 */

export type PaletteId = "ocean" | "sunset" | "forest" | "purple";

export interface Palette {
  id: PaletteId;
  label: string;
  /** Swatch colours shown in Settings. */
  swatch: [string, string, string];
  /** Browser/PWA theme colour (also used to tint the app icon). */
  themeColor: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface Recipe {
  /** Primary hue (oklch) */
  h: number;
  /** Chroma for the primary */
  c: number;
  /** Neutral/parchment hue for light backgrounds */
  paperH: number;
  /** Grounding dark hue (navy/indigo/etc.) */
  darkH: number;
  /** Gold / warm marker hue */
  goldH: number;
}

function light(r: Recipe): Record<string, string> {
  return {
    "--background": `oklch(0.973 0.014 ${r.paperH})`,
    "--surface": `oklch(0.953 0.02 ${r.paperH})`,
    "--foreground": `oklch(0.26 0.045 ${r.darkH})`,
    "--card": `oklch(0.995 0.006 ${r.paperH})`,
    "--card-foreground": `oklch(0.26 0.045 ${r.darkH})`,
    "--popover": `oklch(0.995 0.006 ${r.paperH})`,
    "--popover-foreground": `oklch(0.26 0.045 ${r.darkH})`,
    "--primary": `oklch(0.6 ${r.c} ${r.h})`,
    "--primary-foreground": `oklch(0.99 0.005 ${r.paperH})`,
    "--secondary": `oklch(0.93 0.035 ${r.h})`,
    "--secondary-foreground": `oklch(0.31 0.05 ${r.darkH})`,
    "--muted": `oklch(0.945 0.016 ${r.h})`,
    "--muted-foreground": `oklch(0.49 0.03 ${r.darkH})`,
    "--accent": `oklch(0.88 0.06 ${r.h})`,
    "--accent-foreground": `oklch(0.28 0.05 ${r.darkH})`,
    "--gold": `oklch(0.79 0.12 ${r.goldH})`,
    "--gold-foreground": `oklch(0.27 0.06 ${r.goldH})`,
    "--deep": `oklch(0.26 0.06 ${r.darkH})`,
    "--deep-foreground": `oklch(0.96 0.01 ${r.paperH})`,
    "--path": `oklch(0.885 0.025 ${r.h})`,
    "--border": `oklch(0.9 0.022 ${r.h})`,
    "--input": `oklch(0.915 0.022 ${r.h})`,
    "--ring": `oklch(0.6 ${r.c} ${r.h})`,
    "--grad-from": `oklch(0.62 ${r.c} ${r.h})`,
    "--grad-to": `oklch(0.79 0.11 ${r.goldH})`,
    "--shadow-tint": `oklch(0.35 0.06 ${r.darkH} / 0.22)`,
  };
}

function dark(r: Recipe): Record<string, string> {
  return {
    "--background": `oklch(0.185 0.035 ${r.darkH})`,
    "--surface": `oklch(0.215 0.036 ${r.darkH})`,
    "--foreground": `oklch(0.95 0.012 ${r.paperH})`,
    "--card": `oklch(0.235 0.037 ${r.darkH})`,
    "--card-foreground": `oklch(0.95 0.012 ${r.paperH})`,
    "--popover": `oklch(0.235 0.037 ${r.darkH})`,
    "--popover-foreground": `oklch(0.95 0.012 ${r.paperH})`,
    "--primary": `oklch(0.73 ${Math.min(r.c + 0.01, 0.16)} ${r.h})`,
    "--primary-foreground": `oklch(0.17 0.04 ${r.darkH})`,
    "--secondary": `oklch(0.31 0.045 ${r.darkH})`,
    "--secondary-foreground": `oklch(0.95 0.012 ${r.paperH})`,
    "--muted": `oklch(0.275 0.035 ${r.darkH})`,
    "--muted-foreground": `oklch(0.75 0.02 ${r.h})`,
    "--accent": `oklch(0.38 0.06 ${r.h})`,
    "--accent-foreground": `oklch(0.96 0.01 ${r.paperH})`,
    "--gold": `oklch(0.82 0.13 ${r.goldH})`,
    "--gold-foreground": `oklch(0.2 0.05 ${r.goldH})`,
    "--deep": `oklch(0.15 0.035 ${r.darkH})`,
    "--deep-foreground": `oklch(0.96 0.01 ${r.paperH})`,
    "--path": `oklch(0.33 0.035 ${r.darkH})`,
    "--border": `oklch(0.33 0.03 ${r.darkH})`,
    "--input": `oklch(0.32 0.03 ${r.darkH})`,
    "--ring": `oklch(0.73 ${r.c} ${r.h})`,
    "--grad-from": `oklch(0.4 0.08 ${r.h})`,
    "--grad-to": `oklch(0.55 0.09 ${r.goldH})`,
    "--shadow-tint": "oklch(0 0 0 / 0.55)",
  };
}

function build(
  id: PaletteId,
  label: string,
  swatch: [string, string, string],
  themeColor: string,
  r: Recipe,
): Palette {
  return { id, label, swatch, themeColor, light: light(r), dark: dark(r) };
}

export const PALETTES: Palette[] = [
  build("ocean", "Ocean", ["#7fb0e0", "#e2b869", "#1e2a4a"], "#7fb0e0", {
    h: 240,
    c: 0.11,
    paperH: 88,
    darkH: 265,
    goldH: 84,
  }),
  build("sunset", "Sunset", ["#f0a071", "#e8788c", "#4a2230"], "#f0a071", {
    h: 38,
    c: 0.14,
    paperH: 70,
    darkH: 20,
    goldH: 62,
  }),
  build("forest", "Forest", ["#79bd94", "#d8bd74", "#1f3529"], "#79bd94", {
    h: 155,
    c: 0.11,
    paperH: 95,
    darkH: 165,
    goldH: 90,
  }),
  build("purple", "Midnight Purple", ["#a892f0", "#e0b877", "#241d45"], "#a892f0", {
    h: 300,
    c: 0.15,
    paperH: 80,
    darkH: 295,
    goldH: 78,
  }),
];

export const PALETTE_STORAGE_KEY = "sophia.palette.v1";
const STYLE_ID = "sophia-palette-vars";

export function getPalette(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

function cssFor(p: Palette): string {
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join("");
  return `:root{${block(p.light)}}\n.dark{${block(p.dark)}}`;
}

/** Writes the palette variables into the document and tints the icon/theme colour. */
export function applyPalette(id: PaletteId): void {
  if (typeof document === "undefined") return;
  const p = getPalette(id);
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = cssFor(p);
  document.documentElement.dataset.palette = p.id;

  // PWA / browser chrome + splash accent
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = p.themeColor;

  void tintIcon(p.themeColor);
}

export function loadPaletteId(): PaletteId {
  if (typeof window === "undefined") return "ocean";
  try {
    return getPalette(window.localStorage.getItem(PALETTE_STORAGE_KEY)).id;
  } catch {
    return "ocean";
  }
}

export function savePaletteId(id: PaletteId): void {
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  applyPalette(id);
}

/**
 * Redraws the favicon / apple-touch icon with the palette accent blended in so
 * the installed app icon and splash screen match the chosen theme.
 */
async function tintIcon(color: string): Promise<void> {
  if (typeof document === "undefined" || typeof Image === "undefined") return;
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = "/icon-512.png";
    await img.decode();
    const size = 192;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, size, size);
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    const url = canvas.toDataURL("image/png");
    for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
      const link = document.querySelector(sel) as HTMLLinkElement | null;
      if (link) link.href = url;
    }
  } catch {
    /* keep the untinted icon */
  }
}

/** Inline script so the palette is present before hydration (no colour flash). */
export const PALETTE_INIT_SCRIPT = `try{var id=localStorage.getItem('${PALETTE_STORAGE_KEY}');var m=${JSON.stringify(
  Object.fromEntries(PALETTES.map((p) => [p.id, cssFor(p)])),
)};var t=${JSON.stringify(
  Object.fromEntries(PALETTES.map((p) => [p.id, p.themeColor])),
)};if(id&&m[id]){var s=document.createElement('style');s.id='${STYLE_ID}';s.textContent=m[id];document.head.appendChild(s);document.documentElement.dataset.palette=id;var mt=document.querySelector('meta[name="theme-color"]');if(mt){mt.content=t[id];}}}catch(e){}`;
