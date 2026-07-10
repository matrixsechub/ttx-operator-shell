import { StatusPill } from "../StatusPill";
import type { PrismTriageItemSummary, PrismTriageSeverity } from "../../lib/prismTriageTypes";

function severityTone(severity: PrismTriageSeverity): "danger" | "warn" | "neutral" | "ok" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warn";
    case "low":
      return "neutral";
    default: {
      const never: never = severity;
      return never;
    }
  }
}

type Props = {
  item: PrismTriageItemSummary;
  selected: boolean;
  onSelect: () => void;
};

export function PrismTriageItemCard({ item, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-sm border px-3 py-3 text-left text-sm transition-colors ${
        selected
          ? "border-op-accent bg-op-panel-raised text-op-text"
          : "border-op-border text-op-text-dim hover:border-op-border-bright"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-op-accent">P{item.priorityScore}</span>
        <StatusPill tone={severityTone(item.highestSeverity)}>{item.highestSeverity}</StatusPill>
      </div>
      <p className="mt-2 text-sm text-op-text">{item.title}</p>
      <p className="mt-1 text-xs text-op-text-dim">
        {item.routes.join(", ") || "—"} · {item.status}
      </p>
    </button>
  );
}
