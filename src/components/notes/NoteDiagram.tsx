/**
 * Renders an AI-generated SVG diagram. The SVG comes from a model, so it is
 * sanitised here before it ever touches the DOM: only a small allow-list of
 * elements/attributes survives, and scripts, event handlers, external
 * references and foreignObject are dropped.
 */
import { useMemo } from "react";

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "title",
  "desc",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "marker",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
]);

const BLOCKED_ATTR_VALUE = /javascript:|data:text\/html|<script/i;

function sanitizeSvg(raw: string): string | null {
  if (typeof window === "undefined") return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  } catch {
    return null;
  }
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") return null;

  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED_TAGS.has(child.nodeName.toLowerCase())) {
        child.remove();
        continue;
      }
      walk(child);
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on") || name === "href" || name === "xlink:href" || name === "style") {
        el.removeAttribute(attr.name);
        continue;
      }
      if (BLOCKED_ATTR_VALUE.test(value)) el.removeAttribute(attr.name);
    }
  };
  walk(root);

  root.setAttribute("width", "100%");
  root.removeAttribute("height");
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 800 500");
  root.setAttribute("class", "h-auto w-full");
  return root.outerHTML;
}

export function NoteDiagram({ svg }: { svg: string }) {
  const clean = useMemo(() => sanitizeSvg(svg), [svg]);

  if (!clean) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This diagram could not be displayed. Try generating it again.
      </p>
    );
  }

  return (
    <figure className="space-y-2">
      <div
        className="overflow-x-auto rounded-xl border border-border bg-card p-3 text-foreground [&_svg]:max-w-full"
        // Sanitised above: allow-listed SVG elements/attributes only.
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      <figcaption className="text-xs text-muted-foreground">
        AI-generated diagram — check it against your notes.
      </figcaption>
    </figure>
  );
}
