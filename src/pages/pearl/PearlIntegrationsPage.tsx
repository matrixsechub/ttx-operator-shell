import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import {
  INTEGRATIONS_FIXTURES,
  NON_EQUIVALENCES,
  authorityView,
  toolDisposition,
} from "../../pearl/chatIntegrations/index.js";
import "../../styles/pearl-chat-integrations.css";

type View = "overview" | "detail" | "secrets";
type Selection = { kind: "provider" | "mcp"; id: string } | null;

function Badge({
  tone,
  children,
}: {
  tone: "pass" | "hold" | "blocked" | "gold" | "neutral" | "signal";
  children: string;
}) {
  return <span className={`pearl-badge pearl-badge--${tone}`}>{children}</span>;
}

function healthTone(value: string): "pass" | "hold" | "blocked" | "neutral" {
  if (value === "Connected") return "pass";
  if (value === "Degraded") return "hold";
  if (value === "Blocked") return "blocked";
  return "neutral";
}

function authorityTone(label: string): "gold" | "hold" | "blocked" | "neutral" {
  if (label.startsWith("Authorized")) return "gold";
  if (label.includes("HOLD") || label.includes("Withheld")) return "hold";
  if (label.includes("BLOCKED") || label.includes("Denied")) return "blocked";
  return "neutral";
}

/** Authenticated Settings → Integrations preview — fixtures / read-only. */
export function PearlIntegrationsPage() {
  const [view, setView] = useState<View>("overview");
  const [selected, setSelected] = useState<Selection>(null);
  const [probe, setProbe] = useState("Probe is fixture-only · no network");

  const selectedItem = useMemo(() => {
    if (!selected) return null;
    const list = selected.kind === "provider" ? INTEGRATIONS_FIXTURES.providers : INTEGRATIONS_FIXTURES.mcp;
    return list.find((item: { id: string }) => item.id === selected.id) ?? null;
  }, [selected]);

  function openDetail(kind: "provider" | "mcp", id: string) {
    setSelected({ kind, id });
    setView("detail");
    setProbe("Probe is fixture-only · no network");
  }

  return (
    <OperatorShell>
      <div className="pearl-ci pearl-ci--embedded">
        <div className="pearl-ci-shell pearl-ci-shell--settings">
          <header className="pearl-ci-top" aria-label="PEARL settings preview chrome">
            <span className="brand">PEARL · SETTINGS</span>
            <Link to="/chat">Chat</Link>
            <Link to="/settings/integrations" aria-current="page">
              Integrations
            </Link>
            <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" onClick={() => setView("overview")}>
              Overview
            </button>
            <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" onClick={() => setView("secrets")}>
              Secret refs
            </button>
            <span className="pearl-ci-credits" style={{ marginLeft: "auto" }}>
              grantsAuthority:false · read-only fixtures
            </span>
          </header>

          <main className="pearl-ci-settings">
            {view === "secrets" ? (
              <SecretsView />
            ) : view === "detail" && selectedItem && selected ? (
              <DetailView
                kind={selected.kind}
                item={selectedItem}
                probe={probe}
                onBack={() => {
                  setView("overview");
                  setSelected(null);
                }}
                onProbe={() => {
                  const auth = authorityView(selectedItem);
                  setProbe(
                    `Fixture probe · health=${selectedItem.health} · Beacon=${selectedItem.beacon} · authority=${auth.authority} · no runtime`,
                  );
                }}
              />
            ) : (
              <OverviewView onOpen={openDetail} />
            )}
          </main>
        </div>
      </div>
    </OperatorShell>
  );
}

function OverviewView({ onOpen }: { onOpen: (kind: "provider" | "mcp", id: string) => void }) {
  return (
    <section>
      <header className="page-head">
        <p className="pearl-ci-credits">SETTINGS · INTEGRATIONS</p>
        <h1 tabIndex={-1}>Integrations overview</h1>
        <p>Connection health and Beacon authority are separate axes. Connected ≠ Authorized.</p>
        <ul className="pearl-ci-legend" aria-label="State legend">
          <li><Badge tone="pass">Connected / PASS</Badge></li>
          <li><Badge tone="hold">Degraded / HOLD</Badge></li>
          <li><Badge tone="blocked">Blocked / BLOCKED</Badge></li>
          <li><Badge tone="gold">Beacon / Authority</Badge></li>
          <li><Badge tone="neutral">Disabled / Dormant</Badge></li>
        </ul>
      </header>

      <section className="pearl-panel" aria-labelledby="api-h">
        <div className="pearl-panel__hd"><h2 className="pearl-panel__title" id="api-h">API providers</h2></div>
        <div className="table-wrap" role="region" tabIndex={0} aria-label="API providers table">
          <table className="pearl-ci-table">
            <thead>
              <tr>
                <th>Provider</th><th>Health</th><th>Beacon</th><th>Authority</th><th>Enablement</th><th>Last check</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATIONS_FIXTURES.providers.map((provider: { id: string; name: string; health: string; beacon: string; enabled: boolean; safeMode?: boolean; lastCheck?: string }) => {
                const auth = authorityView(provider);
                return (
                  <tr key={provider.id} className={provider.enabled ? undefined : "is-off"}>
                    <td data-label="Provider">
                      <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" onClick={() => onOpen("provider", provider.id)}>
                        {provider.name}
                      </button>
                    </td>
                    <td data-label="Health"><Badge tone={healthTone(provider.health)}>{provider.health}</Badge></td>
                    <td data-label="Beacon"><Badge tone={provider.beacon === "PASS" ? "pass" : provider.beacon === "HOLD" ? "hold" : "blocked"}>{provider.beacon}</Badge></td>
                    <td data-label="Authority"><Badge tone={authorityTone(auth.authority)}>{auth.authority}</Badge></td>
                    <td data-label="Enablement">{provider.enabled ? "Enabled" : "Off · operator"}{provider.safeMode ? " · Safe mode" : ""}</td>
                    <td data-label="Last check">{provider.lastCheck || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pearl-panel" style={{ marginTop: 16 }} aria-labelledby="mcp-h">
        <div className="pearl-panel__hd"><h2 className="pearl-panel__title" id="mcp-h">MCP servers</h2></div>
        <div className="table-wrap" role="region" tabIndex={0} aria-label="MCP servers table">
          <table className="pearl-ci-table">
            <thead>
              <tr>
                <th>MCP</th><th>Health</th><th>Beacon</th><th>Authority</th><th>grantsAuthority</th><th>Tools</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATIONS_FIXTURES.mcp.map((server: { id: string; name: string; health: string; beacon: string; enabled: boolean; tools?: number; grantsAuthority?: boolean }) => {
                const auth = authorityView(server);
                return (
                  <tr key={server.id} className={server.enabled ? undefined : "is-off"}>
                    <td data-label="MCP">
                      <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" onClick={() => onOpen("mcp", server.id)}>
                        {server.name}
                      </button>
                    </td>
                    <td data-label="Health"><Badge tone={healthTone(server.health)}>{server.health}</Badge></td>
                    <td data-label="Beacon"><Badge tone={server.beacon === "PASS" ? "pass" : server.beacon === "HOLD" ? "hold" : "blocked"}>{server.beacon}</Badge></td>
                    <td data-label="Authority"><Badge tone={authorityTone(auth.authority)}>{auth.authority}</Badge></td>
                    <td data-label="grantsAuthority"><code>{String(server.grantsAuthority === true)}</code></td>
                    <td data-label="Tools">{server.tools ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="pearl-ci-credits" style={{ marginTop: 12 }}>{INTEGRATIONS_FIXTURES.disclosure}</p>
    </section>
  );
}

function SecretsView() {
  return (
    <section>
      <header className="page-head">
        <h1 tabIndex={-1}>Secret references</h1>
        <p>Reference status only. No secret values are present in the fixture model.</p>
      </header>
      <div className="table-wrap" role="region" tabIndex={0} aria-label="Secret references">
        <table className="pearl-ci-table">
          <thead>
            <tr><th>Reference</th><th>State</th><th>Storage</th></tr>
          </thead>
          <tbody>
            {INTEGRATIONS_FIXTURES.secrets.map((secret: { name: string; state: string; storage: string }) => (
              <tr key={secret.name}>
                <td data-label="Reference"><code>{secret.name}</code></td>
                <td data-label="State">
                  <Badge tone={secret.state === "configured" ? "pass" : secret.state === "rotation-needed" ? "hold" : "blocked"}>
                    {secret.state}
                  </Badge>
                </td>
                <td data-label="Storage">{secret.storage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailView({
  kind,
  item,
  probe,
  onBack,
  onProbe,
}: {
  kind: "provider" | "mcp";
  item: {
    name: string;
    health: string;
    beacon: string;
    enabled: boolean;
    safeMode?: boolean;
    models?: number;
    tools?: number;
    lastCheck?: string;
  };
  probe: string;
  onBack: () => void;
  onProbe: () => void;
}) {
  const auth = authorityView(item);
  const sample = toolDisposition({
    sourceBeacon: item.beacon,
    cls: kind === "mcp" ? "write" : "read",
    safeMode: !!item.safeMode,
  });
  const noticeClass =
    auth.authority.includes("BLOCKED") || item.health === "Blocked"
      ? "pearl-ci-notice--blocked"
      : auth.authority.includes("HOLD") || item.health === "Degraded"
        ? "pearl-ci-notice--hold"
        : "pearl-ci-notice--beacon";

  return (
    <section>
      <p>
        <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" onClick={onBack}>
          ← Overview
        </button>
      </p>
      <header className="page-head">
        <p className="pearl-ci-credits">{kind === "provider" ? "API PROVIDER" : "MCP SERVER"}</p>
        <h1 tabIndex={-1}>{item.name}</h1>
        <div className={`pearl-ci-notice ${noticeClass}`} role="status">{auth.note}</div>
      </header>
      <div className="detail-grid">
        <section className="pearl-panel">
          <div className="pearl-panel__hd"><h2 className="pearl-panel__title">Identity · health · telemetry</h2></div>
          <dl className="pearl-ci-kv">
            <dt>Health</dt><dd><Badge tone={healthTone(item.health)}>{item.health}</Badge></dd>
            <dt>Enablement</dt><dd>{item.enabled ? "Enabled" : "Off · operator"}{item.safeMode ? " · Safe mode" : ""}</dd>
            <dt>Models / tools</dt><dd>{item.models ?? item.tools ?? "—"}</dd>
            <dt>Last check</dt><dd>{item.lastCheck || "—"}</dd>
            <dt>Sample capability</dt><dd>{sample.disposition} · {sample.gate} · {sample.reason}</dd>
            <dt>Secret reference</dt><dd><Badge tone="neutral">ref-only · value never displayed</Badge></dd>
          </dl>
          <h3 className="pearl-panel__title" style={{ marginTop: 16 }}>Non-equivalences</h3>
          <ul>
            {NON_EQUIVALENCES.map((itemLabel: string) => (
              <li key={itemLabel}>{itemLabel}</li>
            ))}
          </ul>
        </section>
        <aside className="pearl-panel pearl-panel--beacon" data-state={item.beacon.toLowerCase()}>
          <div className="pearl-panel__hd"><h2 className="pearl-panel__title">Beacon authority</h2></div>
          <p>
            <Badge tone="gold">Beacon</Badge>{" "}
            <Badge tone={item.beacon === "PASS" ? "pass" : item.beacon === "HOLD" ? "hold" : "blocked"}>{item.beacon}</Badge>
          </p>
          <p style={{ marginTop: 10 }}><Badge tone={authorityTone(auth.authority)}>{auth.authority}</Badge></p>
          <p className="pearl-ci-credits">grantsAuthority:false · simulation / display only</p>
          <p className="pearl-ci-credits">Beacon PASS ≠ Operator approval</p>
          <div className="pearl-ci-actions" style={{ marginTop: 12 }}>
            <button type="button" className="pearl-btn pearl-btn--inspect pearl-btn--xs" onClick={onProbe}>Test connection</button>
            <button type="button" className="pearl-btn pearl-btn--ghost pearl-btn--xs" disabled title="Runtime HOLD">Disable</button>
          </div>
          <p className="pearl-ci-credits" role="status" aria-live="polite">{probe}</p>
        </aside>
      </div>
    </section>
  );
}
