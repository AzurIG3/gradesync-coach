/**
 * Signature "journey" visuals — a winding path that fills as progress grows,
 * plus a dotted trail used for streaks and schedule timelines.
 * All colours come from theme tokens so every palette coordinates.
 */

function windingPath(width: number, height: number) {
  const mid = height / 2;
  const amp = height / 2 - 3;
  const q = width / 4;
  return `M 4 ${mid} C ${q * 0.6} ${mid - amp}, ${q * 1.4} ${mid + amp}, ${q * 2} ${mid} S ${q * 3.4} ${mid - amp}, ${width - 4} ${mid}`;
}

export function PathProgress({
  value,
  color,
  height = 26,
  className = "",
}: {
  /** 0–100 */
  value: number;
  /** Optional accent (e.g. the subject colour); defaults to the theme primary. */
  color?: string;
  height?: number;
  className?: string;
}) {
  const width = 320;
  const d = windingPath(width, height);
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const stroke = color ?? "var(--primary)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={`${Math.round(value * 1)}% complete`}
    >
      <path d={d} fill="none" stroke="var(--path)" strokeWidth={7} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - pct}
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
      {pct > 0.02 && (
        <circle r={4.5} fill="var(--gold)" stroke="var(--card)" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.85;1;0.85" dur="2.4s" repeatCount="indefinite" />
          <animateMotion dur="0.001s" fill="freeze" keyPoints={`${pct};${pct}`} keyTimes="0;1" path={d} />
        </circle>
      )}
    </svg>
  );
}

/** Dotted trail — filled dots mark completed steps along the journey. */
export function DottedTrail({
  total,
  filled,
  className = "",
}: {
  total: number;
  filled: number;
  className?: string;
}) {
  const n = Math.max(1, Math.min(total, 14));
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const on = i < filled;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className={`block rounded-full transition-colors ${
                on ? "h-2.5 w-2.5 bg-gold" : "h-1.5 w-1.5 bg-path"
              }`}
            />
            {i < n - 1 && (
              <span className={`block h-px w-2 ${on ? "bg-gold/60" : "bg-path"}`} />
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Vertical dotted path used down the left edge of the schedule timeline. */
export function TrailSpine({ active = false }: { active?: boolean }) {
  return (
    <div className="flex w-4 shrink-0 flex-col items-center pt-1.5" aria-hidden>
      <span
        className={`h-2.5 w-2.5 rounded-full ring-2 ${
          active ? "bg-gold ring-gold/25" : "bg-primary/70 ring-primary/15"
        }`}
      />
      <span className="mt-1 w-px flex-1 border-l border-dashed border-path" />
    </div>
  );
}
