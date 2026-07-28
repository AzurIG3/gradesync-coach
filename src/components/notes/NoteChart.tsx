import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/notes-parse";

export function NoteChart({ spec }: { spec: ChartSpec }) {
  const stroke = "hsl(var(--muted-foreground) / 0.3)";
  const axis = "currentColor";
  return (
    <figure className="mb-4 rounded-2xl border border-border bg-card/60 p-3">
      {spec.title && (
        <figcaption className="mb-2 text-center text-xs font-bold text-muted-foreground">
          {spec.title}
        </figcaption>
      )}
      <div className="h-56 w-full text-[10px] text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "bar" ? (
            <BarChart data={spec.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={stroke} strokeDasharray="3 3" />
              <XAxis dataKey={spec.xKey} stroke={axis} tick={{ fill: "currentColor", fontSize: 10 }} />
              <YAxis stroke={axis} tick={{ fill: "currentColor", fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey={spec.yKey} fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={spec.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={stroke} strokeDasharray="3 3" />
              <XAxis dataKey={spec.xKey} stroke={axis} tick={{ fill: "currentColor", fontSize: 10 }} />
              <YAxis stroke={axis} tick={{ fill: "currentColor", fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              />
              <Line
                dataKey={spec.yKey}
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ fill: "var(--primary)", r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
