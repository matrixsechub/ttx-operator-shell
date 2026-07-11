import { useParams, Navigate } from "react-router-dom";
import { StorefrontShell } from "../components/StorefrontShell";
import { CategoryPageBody } from "./marketplace/CategoryPageBody";
import { getMarketplaceCategory } from "./marketplace/categories";

export function StorefrontCategoryPage() {
  const { category: slug } = useParams<{ category: string }>();
  const category = slug ? getMarketplaceCategory(slug) : undefined;

  if (!category) {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <StorefrontShell>
      <CategoryPageBody
        category={category}
        showBreadcrumbs
        breadcrumbTrail={[
          { label: "Storefront", to: "/marketplace" },
          { label: "Marketplace", to: "/marketplace" },
          { label: category.label },
        ]}
      />
    </StorefrontShell>
  );
}
