/**
 * A hand-editable concept map. It starts from the labels found in the
 * AI-drawn diagram, then lets the student add, rename, move, connect and
 * delete shapes. Everything is plain JSON so it saves with the note and
 * travels between devices with account sync.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Link2, Plus, RotateCcw, Square, Trash2, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const W = 800;
const H = 500;
const NODE_W = 150;
const NODE_H = 56;

export type ShapeKind = "box" | "circle" | "label";

export interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: ShapeKind;
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
  const nodes: MapNode[] = labels.map((label, i) => ({
    id: uid(),
    label,
    kind: "box" as ShapeKind,
    x: 60 + (i % 3) * 250,
    y: 45 + Math.floor(i / 3) * 130,
  }));
  const edges: MapEdge[] = [];
  for (let i = 1; i < nodes.length; i++) edges.push({ from: nodes[i - 1].id, to: nodes[i].id });
  return { nodes, edges };
}

function parseSaved(saved?: string): DiagramMap | null {
  if (!saved) return null;
  try {
    const v = JSON.parse(saved);
    if (Array.isArray(v?.nodes))
      return { nodes: v.nodes as MapNode[], edges: Array.isArray(v.edges) ? (v.edges as MapEdge[]) : [] };
  } catch {}
  return null;
}

function centre(n: MapNode) {
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
  const [kind, setKind] = useState<ShapeKind>("box");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const first = useRef(true);

  const selectedNode = map.nodes.find((n) => n.id === selected) ?? null;

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
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
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

  function addNode(nextKind: ShapeKind = kind) {
    const t = label.trim() || (nextKind === "label" ? "New label" : "New shape");
    setMap((m) => ({
      ...m,
      nodes: [
        ...m.nodes,
        { id: uid(), label: t, kind: nextKind, x: 40 + ((m.nodes.length * 47) % 280), y: 370 },
      ],
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

  function renameSelected(text: string) {
    if (!selected) return;
    setMap((m) => ({ ...m, nodes: m.nodes.map((n) => (n.id === selected ? { ...n, label: text } : n)) }));
  }

  function setSelectedKind(nextKind: ShapeKind) {
    if (!selected) return;
    setMap((m) => ({ ...m, nodes: m.nodes.map((n) => (n.id === selected ? { ...n, kind: nextKind } : n)) }));
  }

  function removeEdge(index: number) {
    setMap((m) => ({ ...m, edges: m.edges.filter((_, i) => i !== index) }));
  }

  const byId = new Map(map.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Drag a shape to move it. Tap a shape to select it, then rename, change its style or remove
        it. Tap <strong>Connect</strong> then another shape to draw an arrow; tap an arrow to remove
        it.
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
            <marker
              id="map-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>

          {map.edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const pa = centre(a);
            const pb = centre(b);
            return (
              <g key={`${e.from}-${e.to}-${i}`} onClick={() => removeEdge(i)} className="cursor-pointer">
                <line x1={pa.cx} y1={pa.cy} x2={pb.cx} y2={pb.cy} stroke="transparent" strokeWidth={16} />
                <line
                  x1={pa.cx}
                  y1={pa.cy}
                  x2={pb.cx}
                  y2={pb.cy}
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-muted-foreground"
                  markerEnd="url(#map-arrow)"
                />
              </g>
            );
          })}

          {map.nodes.map((n) => {
            const active = selected === n.id || connectFrom === n.id;
            const k = n.kind ?? "box";
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                onPointerDown={(e) => onPointerDown(e, n)}
                onPointerMove={onPointerMove}
                onPointerUp={() => onPointerUp(n.id)}
                className="cursor-grab"
              >
                {k === "circle" ? (
                  <ellipse
                    cx={NODE_W / 2}
                    cy={NODE_H / 2}
                    rx={NODE_W / 2}
                    ry={NODE_H / 2}
                    className={cn("fill-primary/10 stroke-border", active && "fill-primary/25 stroke-primary")}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                ) : k === "box" ? (
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    className={cn("fill-primary/10 stroke-border", active && "fill-primary/25 stroke-primary")}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                ) : (
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill="transparent"
                    className={cn("stroke-transparent", active && "stroke-primary")}
                    strokeDasharray="4 4"
                    strokeWidth={active ? 2 : 0}
                  />
                )}
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 5}
                  textAnchor="middle"
                  fontSize={k === "label" ? 16 : 15}
                  fontFamily="inherit"
                  fontWeight={k === "label" ? 700 : 400}
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

      {selectedNode ? (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-semibold">Selected shape</p>
          <Input
            value={selectedNode.label}
            onChange={(e) => renameSelected(e.target.value)}
            className="h-10 rounded-xl"
            aria-label="Shape label"
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                { k: "box" as ShapeKind, icon: Square, name: "Box" },
                { k: "circle" as ShapeKind, icon: Circle, name: "Oval" },
                { k: "label" as ShapeKind, icon: Type, name: "Text only" },
              ]
            ).map(({ k, icon: Icon, name }) => (
              <Button
                key={k}
                size="sm"
                variant={(selectedNode.kind ?? "box") === k ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setSelectedKind(k)}
              >
                <Icon size={14} /> {name}
              </Button>
            ))}
            <Button
              size="sm"
              variant={connectFrom === selectedNode.id ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setConnectFrom(connectFrom === selectedNode.id ? null : selectedNode.id)}
            >
              {connectFrom === selectedNode.id ? <X size={14} /> : <Link2 size={14} />}
              {connectFrom === selectedNode.id ? "Cancel" : "Connect"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-destructive"
              onClick={removeSelected}
            >
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNode();
          }}
          placeholder="Label for a new shape…"
          className="h-10 rounded-xl"
          aria-label="New shape label"
        />
        <Button className="h-10 shrink-0 rounded-xl" onClick={() => addNode()}>
          <Plus size={16} /> Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setKind("box"); addNode("box"); }}>
          <Square size={14} /> Add box
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setKind("circle"); addNode("circle"); }}>
          <Circle size={14} /> Add oval
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setKind("label"); addNode("label"); }}>
          <Type size={14} /> Add text
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-xl"
          onClick={() => {
            setSelected(null);
            setConnectFrom(null);
            setMap(layout(labelsFromSvg(svg)));
          }}
        >
          <RotateCcw size={14} /> Reset layout
        </Button>
      </div>
    </div>
  );
}
