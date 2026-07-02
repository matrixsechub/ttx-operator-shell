import { useParams, Navigate } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { CategoryPageBody } from "./CategoryPageBody";
import { getMarketplaceCategory } from "./categories";

export function MarketplaceCategoryPage() {
  const { category: slug } = useParams<{ category: string }>();
  const category = slug ? getMarketplaceCategory(slug) : undefined;

  if (!category) {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <OperatorShell>
      <CategoryPageBody category={category} />
    </OperatorShell>
  );
}
