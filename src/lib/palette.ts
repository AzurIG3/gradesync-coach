/**
 * Colour theme presets.
 *
 * Light/dark mode stays in `theme.tsx`; this file only swaps the ACCENT
 * palette (primary / ring / accent / secondary) so both modes keep their
 * readable contrast. The values are written into a single <style> tag so
 * they override the defaults in styles.css without touching components.
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

export const PALETTES: Palette[] = [
  {
    id: "ocean",
    label: "Ocean",
    swatch: ["#8fcadd", "#7ee0c0", "#2e5b7a"],
    themeColor: "#8fcadd",
    light: {
      "--primary": "oklch(0.68 0.12 220)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--ring": "oklch(0.68 0.12 220)",
      "--accent": "oklch(0.85 0.08 165)",
      "--accent-foreground": "oklch(0.28 0.05 200)",
      "--secondary": "oklch(0.93 0.05 175)",
      "--secondary-foreground": "oklch(0.32 0.06 200)",
    },
    dark: {
      "--primary": "oklch(0.75 0.13 220)",
      "--primary-foreground": "oklch(0.17 0.03 250)",
      "--ring": "oklch(0.75 0.13 220)",
      "--accent": "oklch(0.38 0.07 190)",
      "--accent-foreground": "oklch(0.96 0.01 200)",
      "--secondary": "oklch(0.3 0.04 220)",
      "--secondary-foreground": "oklch(0.95 0.01 220)",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: ["#f6a97a", "#f2748c", "#7a3b46"],
    themeColor: "#f6a97a",
    light: {
      "--primary": "oklch(0.66 0.15 40)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--ring": "oklch(0.66 0.15 40)",
      "--accent": "oklch(0.87 0.08 60)",
      "--accent-foreground": "oklch(0.3 0.07 40)",
      "--secondary": "oklch(0.94 0.05 55)",
      "--secondary-foreground": "oklch(0.34 0.08 40)",
    },
    dark: {
      "--primary": "oklch(0.74 0.14 45)",
      "--primary-foreground": "oklch(0.18 0.04 40)",
      "--ring": "oklch(0.74 0.14 45)",
      "--accent": "oklch(0.4 0.08 40)",
      "--accent-foreground": "oklch(0.96 0.02 60)",
      "--secondary": "oklch(0.32 0.05 40)",
      "--secondary-foreground": "oklch(0.95 0.01 60)",
    },
  },
  {
    id: "forest",
    label: "Forest",
    swatch: ["#7cc79a", "#3f8f6b", "#22402f"],
    themeColor: "#7cc79a",
    light: {
      "--primary": "oklch(0.6 0.12 155)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--ring": "oklch(0.6 0.12 155)",
      "--accent": "oklch(0.86 0.08 145)",
      "--accent-foreground": "oklch(0.28 0.06 155)",
      "--secondary": "oklch(0.93 0.05 150)",
      "--secondary-foreground": "oklch(0.3 0.06 155)",
    },
    dark: {
      "--primary": "oklch(0.72 0.13 155)",
      "--primary-foreground": "oklch(0.16 0.03 155)",
      "--ring": "oklch(0.72 0.13 155)",
      "--accent": "oklch(0.38 0.07 155)",
      "--accent-foreground": "oklch(0.96 0.01 150)",
      "--secondary": "oklch(0.3 0.04 155)",
      "--secondary-foreground": "oklch(0.95 0.01 150)",
    },
  },
  {
    id: "purple",
    label: "Midnight Purple",
    swatch: ["#b39df", "#7c5ce0", "#2c2350"],
    themeColor: "#b39df",
    light: {
      "--primary": "oklch(0.58 0.17 300)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--ring": "oklch(0.58 0.17 300)",
      "--accent": "oklch(0.86 0.07 305)",
      "--accent-foreground": "oklch(0.3 0.08 300)",
      "--secondary": "oklch(0.93 0.05 300)",
      "--secondary-foreground": "oklch(0.32 0.08 300)",
    },
    dark: {
      "--primary": "oklch(0.72 0.15 300)",
      "--primary-foreground": "oklch(0.17 0.04 300)",
      "--ring": "oklch(0.72 0.15 300)",
      "--accent": "oklch(0.4 0.09 300)",
      "--accent-foreground": "oklch(0.96 0.01 300)",
      "--secondary": "oklch(0.32 0.06 300)",
      "--secondary-foreground": "oklch(0.95 0.01 300)",
    },
  },
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
