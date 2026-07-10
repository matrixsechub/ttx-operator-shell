import { useParams, Navigate } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { SystemHUD } from "../../components/SystemHUD";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { RelatedLinksRail } from "../../components/RelatedLinksRail";
import { getSystemRelatedLinks, getSystemMarketplaceCategory } from "../../lib/ecosystem";
import { getOperatorSystem } from "../../operator/registry";
import { CategoryPageBody } from "../marketplace/CategoryPageBody";

export function SystemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const system = slug ? getOperatorSystem(slug) : undefined;
  const marketplaceCategory = slug ? getSystemMarketplaceCategory(slug) : undefined;

  if (!system) {
    return <Navigate to="/systems" replace />;
  }

  return (
    <OperatorShell hud={<SystemHUD compact />}>
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          trail={[
            { label: "Cockpit", to: "/dashboard" },
            { label: "Systems", to: "/systems" },
            { label: system.label },
          ]}
        />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">{system.label}</h1>
        <system.Component />

        <RelatedLinksRail links={getSystemRelatedLinks(system.slug)} />

        {marketplaceCategory && (
          <div className="border-t border-op-border pt-6">
            <h2 className="mb-3 text-xs uppercase tracking-widest text-op-text-dim">
              Embedded // {marketplaceCategory.label}
            </h2>
            <CategoryPageBody category={marketplaceCategory} showBreadcrumbs={false} />
          </div>
        )}
      </div>
    </OperatorShell>
  );
}
