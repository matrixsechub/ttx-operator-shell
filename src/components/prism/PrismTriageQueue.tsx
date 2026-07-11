import type { PrismTriageItemSummary } from "../../lib/prismTriageTypes";
import { PrismTriageItemCard } from "./PrismTriageItemCard";

type Props = {
  items: PrismTriageItemSummary[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (triageId: string) => void;
};

export function PrismTriageQueue({ items, selectedId, loading, onSelect }: Props) {
  if (loading) {
    return <p className="text-sm text-op-text-dim">Loading triage queue…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-op-text-dim">
        No triage items yet. Generate triage from a persisted PRISM audit.
      </p>
    );
  }
  return (
    <ul className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto op-scrollbar">
      {items.map((item) => (
        <li key={item.triageId}>
          <PrismTriageItemCard
            item={item}
            selected={selectedId === item.triageId}
            onSelect={() => onSelect(item.triageId)}
          />
        </li>
      ))}
    </ul>
  );
}
