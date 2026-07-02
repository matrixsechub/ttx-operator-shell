import { useParams, Navigate } from "react-router-dom";
import { OperatorShell } from "../components/OperatorShell";
import { ComingSoon } from "../components/ComingSoon";
import { InfoCard } from "../components/InfoCard";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { RelatedLinksRail } from "../components/RelatedLinksRail";
import { getFutureRelatedLinks } from "../lib/ecosystem";
import { getFutureModule } from "./registry";

export function FutureModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const module = slug ? getFutureModule(slug) : undefined;

  if (!module) {
    return <Navigate to="/future" replace />;
  }

  return (
    <OperatorShell>
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          trail={[
            { label: "Cockpit", to: "/dashboard" },
            { label: "Future", to: "/future" },
            { label: module.name },
          ]}
        />

        <div>
          <h1 className="text-lg uppercase tracking-widest text-op-accent">{module.name}</h1>
          <p className="mt-1 text-xs text-op-text-dim">{module.tagline}</p>
        </div>

        <InfoCard label="Concept">{module.detail}</InfoCard>

        <ComingSoon title="Not yet built" detail="This module is a placeholder for future expansion — scaffold only." />

        <RelatedLinksRail title="Connects To" links={getFutureRelatedLinks(module.slug)} />
      </div>
    </OperatorShell>
  );
}
