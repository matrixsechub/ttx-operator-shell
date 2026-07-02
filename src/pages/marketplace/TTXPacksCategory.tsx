import { OperatorShell } from "../../components/OperatorShell";
import { CategoryPageBody } from "./CategoryPageBody";
import { getMarketplaceCategory } from "./categories";

const TTX_PACKS_CATEGORY = getMarketplaceCategory("ttx-packs")!;

// The TTX SaaS module's "marketplace hooks" requirement — TTX scenario packs,
// inject bundles, and division-specific TTX modules surface here. Mounted both
// at /marketplace/ttx-packs (via the generic category route) and embedded
// directly inside the TTX shell (src/operator/ttx/index.tsx) as a teaser.
export function TTXPacksCategory({ embedded = false }: { embedded?: boolean }) {
  if (embedded) {
    return <CategoryPageBody category={TTX_PACKS_CATEGORY} showBreadcrumbs={false} />;
  }

  return (
    <OperatorShell>
      <CategoryPageBody category={TTX_PACKS_CATEGORY} />
    </OperatorShell>
  );
}
