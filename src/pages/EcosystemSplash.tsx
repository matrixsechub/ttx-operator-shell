import { useEffect } from "react";
import { AdaptiveEntryHero } from "../components/AdaptiveEntryHero";
import { useAdaptiveEntryMode } from "../lib/useAdaptiveEntryMode";
import { recordUsageEvent } from "../lib/usageBeacon";
import { DIVISIONS } from "./divisions/data";
import { OPERATOR_SYSTEMS } from "../operator/registry";
import { MARKETPLACE_CATEGORIES } from "./marketplace/categories";

const AGENTS = [
  {
    codename: "AGT-01 // ARCHITECT",
    name: "Architect",
    summary: "Specs missions, defines constraints, and routes work into the operator pipeline.",
  },
  {
    codename: "AGT-02 // BUILDER",
    name: "Builder",
    summary: "Executes approved specs through harness runs, deploy steps, and artifact assembly.",
  },
  {
    codename: "AGT-03 // AUDITOR",
    name: "Auditor",
    summary: "Validates outputs, enforces FedGrade gates, and signs off before release.",
  },
  {
    codename: "AGT-04 // SENTINEL",
    name: "Sentinel",
    summary: "Watches live telemetry, marketplace integrity, and edge auth posture.",
  },
] as const;

const MARKETPLACE_PREVIEW = MARKETPLACE_CATEGORIES.slice(0, 4);

function SectionHeader({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4 border-b border-op-accent/20 pb-3">
      <span className="text-[10px] uppercase tracking-[0.35em] text-op-text-dim">{index}</span>
      <h2 className="mt-1 text-sm uppercase tracking-[0.25em] text-op-accent">{title}</h2>
      <p className="mt-1 text-xs text-op-text-dim">{subtitle}</p>
    </div>
  );
}

function PreviewCard({ title, body, meta }: { title: string; body: string; meta?: string }) {
  return (
    <article className="rounded-sm border border-op-accent/20 bg-op-bg/80 p-4 transition-colors hover:border-op-accent/40">
      {meta ? <span className="text-[10px] uppercase tracking-widest text-op-text-dim">{meta}</span> : null}
      <h3 className="mt-1 text-sm font-medium text-op-text">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-op-text-dim">{body}</p>
    </article>
  );
}

export function EcosystemSplash() {
  const { uiMode } = useAdaptiveEntryMode();

  useEffect(() => {
    recordUsageEvent("visit");
  }, []);

  useEffect(() => {
    recordUsageEvent("ui_mode_view", { uiMode });
  }, [uiMode]);

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-op-bg text-op-text">
      <div className="msh-grid-overlay pointer-events-none fixed inset-0 opacity-50" />

      <AdaptiveEntryHero uiMode={uiMode} />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:px-10">
        <section>
          <SectionHeader index="01" title="Divisions" subtitle="Organizational lanes across the operator graph." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIVISIONS.slice(0, 6).map((division) => (
              <PreviewCard
                key={division.slug}
                meta={division.codename}
                title={division.name}
                body={division.summary}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader index="02" title="Agents" subtitle="Pipeline roles executing missions through the harness." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {AGENTS.map((agent) => (
              <PreviewCard key={agent.codename} meta={agent.codename} title={agent.name} body={agent.summary} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader index="03" title="Systems" subtitle="Live operator modules available inside the cockpit." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OPERATOR_SYSTEMS.slice(0, 6).map((system) => (
              <PreviewCard key={system.slug} meta={`SYS // ${system.slug.toUpperCase()}`} title={system.label} body="Registered operator module — available after authentication." />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader index="04" title="Marketplace Preview" subtitle="Public catalog lanes — browse before you enter." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MARKETPLACE_PREVIEW.map((category) => (
              <PreviewCard
                key={category.slug}
                meta={`MKT // ${category.slug}`}
                title={category.label}
                body={category.description}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="relative border-t border-op-accent/10 px-6 py-8 text-center text-[10px] uppercase tracking-widest text-op-text-dim/70">
        v0.1 // ttx-operator-shell // first-touch ecosystem layer
      </footer>
    </div>
  );
}
