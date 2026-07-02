import type { ReactNode } from "react";
import { OperatorShell } from "../components/OperatorShell";
import { SystemTelemetryPanel } from "../components/SystemTelemetryPanel";
import { ComingSoon } from "../components/ComingSoon";
import { SectionHeader } from "../components/SectionHeader";
import { InfoCard } from "../components/InfoCard";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { RelatedLinksRail } from "../components/RelatedLinksRail";
import { OPERATOR_TOOLS } from "../lib/tools";

function Placeholder({ children }: { children: ReactNode }) {
  return <span className="italic text-op-text-dim">{children}</span>;
}

export function AboutPage() {
  return (
    <OperatorShell telemetry={<SystemTelemetryPanel compact />}>
      <div className="flex flex-col gap-10 pb-10">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "About" }]} />

        <header>
          <h1 className="text-lg uppercase tracking-widest text-op-accent">About // Operator Identity</h1>
          <p className="mt-1 text-xs text-op-text-dim">Profile, division doctrine, and system identity.</p>
        </header>

        {/* ============================================================ */}
        {/* A. Operator Profile (About Me)                                */}
        {/* ============================================================ */}
        <section id="operator-profile" className="flex flex-col gap-4">
          <SectionHeader index="A" tone="accent" title="Operator Profile" subtitle="About Me" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard label="Operator Identity">
              <Placeholder>
                // callsign and identity — replace this placeholder with who you are at the terminal.
              </Placeholder>
            </InfoCard>

            <InfoCard label="My Mission">
              <Placeholder>// what you're here to build, break, or defend — your personal mission.</Placeholder>
            </InfoCard>

            <InfoCard label="My Background">
              <Placeholder>// where you came from — the short version of your background.</Placeholder>
            </InfoCard>

            <InfoCard label="My Operator Philosophy">
              <Placeholder>// the principles you build and ship by, in your own words.</Placeholder>
            </InfoCard>

            <InfoCard label="My Cockpit Setup" className="lg:col-span-2">
              <Placeholder>
                // hardware, monitors, OS, terminal, multi-monitor layout — describe your physical cockpit.
              </Placeholder>
            </InfoCard>
          </div>

          <div className="op-panel rounded-sm p-4">
            <h3 className="text-xs uppercase tracking-widest text-op-text-dim">Tools I Use</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPERATOR_TOOLS.map((tool) => (
                <span
                  key={tool}
                  className="rounded-sm border border-op-border-bright px-3 py-1 text-xs uppercase tracking-wider text-op-text"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* B. Division Overview (MSH OPS Division)                       */}
        {/* ============================================================ */}
        <section id="division-overview" className="flex flex-col gap-4">
          <SectionHeader index="B" tone="accent-2" title="Division Overview" subtitle="MSH OPS Division" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard label="What MSH OPS Is">
              MSH OPS is MatrixSecHub&apos;s operator-grade execution system — the harness, engine, and cockpit
              that turn a request into shipped, audited work.
            </InfoCard>

            <InfoCard label="Division Purpose">
              Coordinate operator workflows end to end — intake, build, audit, deploy — under repeatable
              doctrine instead of ad hoc effort.
            </InfoCard>

            <InfoCard label="Operator Hierarchy">
              The division runs on a five-role chain: Architect specs the work, Builder executes it, Auditor
              validates it, Recon gathers intel, and Planning sequences the pipeline. A human operator owns the
              harness that runs them.
            </InfoCard>

            <InfoCard label="Division Mission">
              Ship operator-grade systems with governance and an audit trail built in from the start, not
              bolted on after the fact.
            </InfoCard>

            <InfoCard label="Role of the Storefront">
              The storefront is the operator&apos;s entry point into the division — Enter the System, then the
              cockpit, marketplace, and status surfaces sit on top of the harness and engine running underneath.
            </InfoCard>

            <InfoCard label="Operator Workflow">
              Enter the System &rarr; Dashboard for session and quick actions &rarr; dispatch into Marketplace
              or Status &rarr; the harness executes through the agents pipeline &rarr; telemetry reports back
              through Status.
            </InfoCard>
          </div>
        </section>

        {/* ============================================================ */}
        {/* C. Identity Statement (MatrixSecHub Identity)                 */}
        {/* ============================================================ */}
        <section id="identity-statement" className="flex flex-col gap-4">
          <SectionHeader index="C" tone="magenta" title="Identity Statement" subtitle="MatrixSecHub Identity" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard label="What MatrixSecHub Stands For">
              A build-and-security practice that treats software delivery as an operations discipline:
              precision, accountability, repeatability.
            </InfoCard>

            <InfoCard label="Operator Culture">
              Dark, deliberate, low-noise. The tooling carries the weight so a single operator can run a full
              pipeline alone.
            </InfoCard>

            <InfoCard label="Operator Values">
              Clarity over chaos. Audited over assumed. Shipped over theorized.
            </InfoCard>

            <InfoCard label="Mission of the System">
              Build and maintain the harness, engine, and cockpit stack that lets one operator do what used to
              take a team.
            </InfoCard>

            <InfoCard label="Future Direction">
              MSH OPS moves from a Phase 1 skeleton toward a fully reconciled runtime — deeper agents
              integration, a wider marketplace, and live multi-operator telemetry.
            </InfoCard>

            <InfoCard label="Operator Aesthetic">
              Dark backgrounds, scanlines, monospace type, neon accents used as instruments — never decoration
              for its own sake.
            </InfoCard>
          </div>
        </section>

        {/* ============================================================ */}
        {/* D. Operator Doctrine (Identity expansion)                     */}
        {/* ============================================================ */}
        <section id="operator-doctrine" className="flex flex-col gap-4">
          <SectionHeader index="D" tone="amber" title="Operator Doctrine" subtitle="Identity, Expanded" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoCard label="Operator Philosophy">
              Move first, document always, never guess at what can be verified. The terminal doesn&apos;t reward
              confidence — it rewards operators who checked.
            </InfoCard>

            <InfoCard label="MSH OPS Identity">
              MSH OPS is the name for the harness, engine, and cockpit working as one system. The operator is the
              one constant across every division it runs.
            </InfoCard>

            <InfoCard label="Operator Culture">
              No standups for their own sake, no status theater. If it&apos;s not in the logbook or the audit
              trail, it didn&apos;t happen — culture here is what the system can actually show you.
            </InfoCard>

            <InfoCard label="Aesthetic Anchors">
              Scanlines, grid backgrounds, monospace type, neon against near-black. Borrowed from terminals and
              cockpits, not dashboards — instruments you operate, not a page you read.
            </InfoCard>

            <InfoCard label="Operator Values">
              Clarity over chaos. Audited over assumed. Shipped over theorized. Reused over rebuilt, when reuse
              is honest.
            </InfoCard>

            <InfoCard label="Operator Creed" className="lg:col-span-2">
              <span className="italic">
                I enter the system knowing what I&apos;m here to do. I build what&apos;s asked, audit what I
                build, and leave a trail anyone after me can follow. I trust the harness because I verify the
                harness. The mission ends when it&apos;s shipped — not when it&apos;s claimed.
              </span>
            </InfoCard>
          </div>
        </section>

        {/* ============================================================ */}
        {/* Reserved for future expansion. Each stub below is a known    */}
        {/* future section; swap the ComingSoon placeholder for the real */}
        {/* component when it's built. "Operator Systems" graduated out  */}
        {/* of this list once /systems shipped — see the rail below.     */}
        {/* ============================================================ */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Reserved // Future Expansion</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* TODO: <OperatorTimeline /> — chronological bio/career log, distinct from the Dashboard's mission timeline */}
            <ComingSoon title="Operator Timeline" />

            {/* TODO: <OperatorTools /> — detailed tool loadout beyond the summary chips above */}
            <ComingSoon title="Operator Tools" />

            {/* TODO: <CockpitSpecs /> — structured hardware/monitor/peripheral spec sheet; see Cockpit Hardware in the Marketplace meanwhile */}
            <ComingSoon title="Cockpit Specs" detail="Reserved for future expansion. See Cockpit Hardware in the Marketplace meanwhile." />
          </div>
        </section>

        <RelatedLinksRail
          title="See the Doctrine in Practice"
          links={[
            { label: "Divisions", to: "/divisions" },
            { label: "Systems", to: "/systems" },
            { label: "MSH TTX", to: "/ttx" },
            { label: "Future", to: "/future" },
          ]}
        />
      </div>
    </OperatorShell>
  );
}
