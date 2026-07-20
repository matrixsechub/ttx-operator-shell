/**
 * TelemetryCard + Sparkline — static telemetry presentation. The sparkline is
 * an inert SVG polyline (no animation this phase). Data is caller-supplied;
 * this component fabricates nothing.
 */

export function Sparkline({ points, stroke = "var(--color-spectral-cyan-stroke)", label }: {
  points: readonly number[];
  stroke?: string;
  label: string;
}) {
  const w = 200;
  const h = 26;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="pearl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <polyline points={path} style={{ stroke }} />
    </svg>
  );
}

export interface TelemetryRow {
  label: string;
  value: number;
  unit?: string;
  series: readonly number[];
}

export function TelemetryCard({ title, rows }: { title: string; rows: readonly TelemetryRow[] }) {
  return (
    <section className="pearl-glass-panel" aria-label={title}>
      <h2 className="pearl-panel-title">{title}</h2>
      <ul className="pearl-tele-list">
        {rows.map((row) => (
          <li key={row.label} className="pearl-tele-row">
            <span className="pearl-mono pearl-tele-label">{row.label}</span>
            <span className="pearl-tele-val">
              {row.value}
              {row.unit ?? "%"}
            </span>
            <Sparkline points={row.series} label={`${row.label} trend`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
