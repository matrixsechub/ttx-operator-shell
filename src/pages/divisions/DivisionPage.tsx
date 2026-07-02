import { useParams, Navigate } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { SectionHeader } from "../../components/SectionHeader";
import { InfoCard } from "../../components/InfoCard";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { RelatedLinksRail } from "../../components/RelatedLinksRail";
import { getDivisionRelatedLinks } from "../../lib/ecosystem";
import { getDivision } from "./data";

export function DivisionPage() {
  const { slug } = useParams<{ slug: string }>();
  const division = slug ? getDivision(slug) : undefined;

  if (!division) {
    return <Navigate to="/divisions" replace />;
  }

  return (
    <OperatorShell>
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          trail={[
            { label: "Cockpit", to: "/dashboard" },
            { label: "Divisions", to: "/divisions" },
            { label: division.name },
          ]}
        />

        <SectionHeader index={division.codename} tone={division.tone} title={division.name} subtitle="MSH OPS Division" />

        <InfoCard label="Overview">{division.summary}</InfoCard>

        <InfoCard label="Focus Areas">
          <div className="flex flex-wrap gap-1.5">
            {division.focus.map((item) => (
              <span
                key={item}
                className="rounded-sm border border-op-border-bright px-2 py-0.5 text-[11px] uppercase tracking-wider text-op-text-dim"
              >
                {item}
              </span>
            ))}
          </div>
        </InfoCard>

        <RelatedLinksRail links={getDivisionRelatedLinks(division.slug)} />
      </div>
    </OperatorShell>
  );
}
