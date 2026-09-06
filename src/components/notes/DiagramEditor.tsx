/**
 * A small hand-editable concept map. It starts from the labels found in the
 * AI-drawn diagram, then lets the student drag the boxes around and connect
 * them with arrows. Everything is kept as plain JSON so it can be saved with
 * the note.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const W = 800;
const H = 500;
const NODE_W = 150;
const NODE_H = 52;

export interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
}
export interface MapEdge {
  from: string;
  to: string;
}
export interface DiagramMap {
  nodes: MapNode[];
  edges: MapEdge[];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/** Pulls the text labels out of an AI-generated SVG, in reading order. */
export function labelsFromSvg(svg: string): string[] {
  const out: string[] = [];
  const re = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const text = m[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text && text.length <= 40 && !out.includes(text)) out.push(text);
  }
  return out.slice(0, 8);
}

function layout(labels: string[]): DiagramMap {
  const nodes = labels.map((label, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      id: uid(),
      label,
      x: 60 + col * 250,
      y: 50 + row * 130,
    };
  });
  const edges: MapEdge[] = [];
  for (let i = 1; i < nodes.length; i++) edges.push({ from: nodes[i - 1].id, to: nodes[i].id });
  return { nodes, edges };
}

function parseSaved(saved?: string): DiagramMap | null {
  if (!saved) return null;
  try {
    const v = JSON.parse(saved);
    if (Array.isArray(v?.nodes)) return { nodes: v.nodes, edges: Array.isArray(v.edges) ? v.edges : [] };
  } catch {}
  return null;
}

function anchor(n: MapNode) {
  return { cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2 };
}

export function DiagramEditor({
  svg,
  saved,
  onChange,
}: {
  svg: string;
  saved?: string;
  onChange: (json: string) => void;
}) {
  const initial = useMemo(() => parseSaved(saved) ?? layout(labelsFromSvg(svg)), [saved, svg]);
  const [map, setMap] = useState<DiagramMap>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange(JSON.stringify(map));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  function toBoard(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H };
  }

  function onPointerDown(e: React.PointerEvent, n: MapNode) {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toBoard(e.clientX, e.clientY);
    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = toBoard(e.clientX, e.clientY);
    d.moved = true;
    setMap((m) => ({
      ...m,
      nodes: m.nodes.map((n) =>
        n.id === d.id
          ? {
              ...n,
              x: Math.max(0, Math.min(W - NODE_W, p.x - d.dx)),
              y: Math.max(0, Math.min(H - NODE_H, p.y - d.dy)),
            }
          : n,
      ),
    }));
  }

  function onPointerUp(id: string) {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) return;
    // A tap (not a drag): select, or complete a connection.
    if (connectFrom && connectFrom !== id) {
      setMap((m) =>
        m.edges.some((e) => e.from === connectFrom && e.to === id)
          ? m
          : { ...m, edges: [...m.edges, { from: connectFrom, to: id }] },
      );
      setConnectFrom(null);
      return;
    }
    setSelected((s) => (s === id ? null : id));
  }

  function addNode() {
    const t = label.trim();
    if (!t) return;
    setMap((m) => ({
      ...m,
      nodes: [...m.nodes, { id: uid(), label: t, x: 40 + ((m.nodes.length * 37) % 300), y: 380 }],
    }));
    setLabel("");
  }

  function removeSelected() {
    if (!selected) return;
    setMap((m) => ({
      nodes: m.nodes.filter((n) => n.id !== selected),
      edges: m.edges.filter((e) => e.from !== selected && e.to !== selected),
    }));
    setSelected(null);
  }

  const byId = new Map(map.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Drag a box to move it. Tap <strong>Connect</strong>, then tap two boxes to join them with an
        arrow. Tap a box to select it.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none"
          role="application"
          aria-label="Editable concept map"
        >
          <defs>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {map.edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const pa = anchor(a);
            const pb = anchor(b);
            return (
              <line
                key={`${e.from}-${e.to}-${i}`}
                x1={pa.cx}
                y1={pa.cy}
                x2={pb.cx}
                y2={pb.cy}
                stroke="currentColor"
                strokeWidth={2}
                className="text-muted-foreground"
                markerEnd="url(#map-arrow)"
              />
            );
          })}
          {map.nodes.map((n) => {
            const active = selected === n.id || connectFrom === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                onPointerDown={(e) => onPointerDown(e, n)}
                onPointerMove={onPointerMove}
                onPointerUp={() => onPointerUp(n.id)}
                className="cursor-grab"
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  className={cn(
                    "fill-primary/10 stroke-border",
                    active && "fill-primary/25 stroke-primary",
                  )}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 5}
                  textAnchor="middle"
                  fontSize={15}
                  fontFamily="inherit"
                  fill="currentColor"
                  className="pointer-events-none text-foreground"
                >
                  {n.label.length > 20 ? `${n.label.slice(0, 19)}…` : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={connectFrom ? "default" : "outline"}
          size="sm"
          className="rounded-xl"
          onClick={() => setConnectFrom(connectFrom ? null : (selected ?? map.nodes[0]?.id ?? null))}
        >
          {connectFrom ? <X size={15} /> : <Link2 size={15} />}
          {connectFrom ? "Cancel connect" : "Connect"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-destructive"
          disabled={!selected}
          onClick={removeSelected}
        >
          <Trash2 size={15} /> Remove box
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl"
          onClick={() => setMap(layout(labelsFromSvg(svg)))}
        >
          <RotateCcw size={15} /> Reset layout
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNode();
          }}
          placeholder="Add your own box…"
          className="h-10 rounded-xl"
          aria-label="New box label"
        />
        <Button className="h-10 rounded-xl" onClick={addNode} disabled={!label.trim()}>
          <Plus size={16} /> Add
        </Button>
      </div>
    </div>
  );
}
