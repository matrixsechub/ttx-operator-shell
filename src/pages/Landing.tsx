import { useNavigate } from "react-router-dom";
import { SecurityNewsReel } from "../components/SecurityNewsReel";

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="public-surface public-landing min-h-dvh overflow-hidden bg-op-bg text-op-text">
      <div className="public-noise-grid" aria-hidden="true" />
      <div className="public-scanline-overlay" aria-hidden="true" />
      <div className="public-orbital-glow public-orbital-glow--left" aria-hidden="true" />
      <div className="public-orbital-glow public-orbital-glow--right" aria-hidden="true" />

      <div className="public-landing-shell">
        <header className="public-topbar">
          <div className="public-brand">
            <span className="public-brand-mark">MSH</span>
            <span className="public-brand-copy">
              <strong>MSH OPS</strong>
              <span>Storefront</span>
            </span>
          </div>
          <nav className="public-nav" aria-label="Landing navigation">
            <button type="button" onClick={() => navigate("/marketplace")} className="public-nav-link">
              Marketplace
            </button>
            <button type="button" onClick={() => navigate("/paywall")} className="public-nav-link">
              Pricing
            </button>
            <button type="button" onClick={() => navigate("/register")} className="public-nav-link">
              Register
            </button>
          </nav>
        </header>

        <section className="public-landing-hero surface-reveal">
          <div className="public-landing-copy">
            <span className="public-eyebrow terminal-reveal">MatrixSecHub // Public Operations Surface</span>
            <div className="public-logo-pulse" aria-hidden="true">
              <span>MSH OPS</span>
            </div>
            <h1 className="public-title">A storefront that feels like a live operator console.</h1>
            <p className="public-lead">
              Animated public surfaces for ecosystem discovery, marketplace inspection, readiness registration, and
              worker-visible status without turning on auth, identity, or payments.
            </p>
            <div className="public-terminal-line">
              <span className="public-chip">Ecosystem Online</span>
              <strong>Storefront uplink stable // observer mode active</strong>
            </div>
            <div className="public-hero-actions">
              <button type="button" onClick={() => navigate("/marketplace")} className="public-cta public-cta--primary">
                Marketplace
              </button>
              <button type="button" onClick={() => navigate("/paywall")} className="public-cta public-cta--secondary">
                Pricing
              </button>
              <button type="button" onClick={() => navigate("/register")} className="public-cta public-cta--ghost">
                Register
              </button>
            </div>
          </div>

          <aside className="public-console-preview">
            <article className="public-panel public-panel--holo">
              <span className="public-chip">Console Preview</span>
              <h2>Observer-ready marketplace</h2>
              <p>Browse public modules, inspect category summaries, and register for cockpit activation updates.</p>
            </article>
            <article className="public-panel public-panel--accent">
              <span className="public-chip">Status Rail</span>
              <h2>Worker-visible readiness</h2>
              <p>Public telemetry surfaces show what is online now and what is still coming online.</p>
            </article>
            <article className="public-panel">
              <span className="public-chip">Access Tiers</span>
              <h2>Pricing without payment plumbing</h2>
              <p>Observer, Operator, and Division access are explained clearly without introducing billing or auth dependencies.</p>
            </article>
          </aside>
        </section>

        <SecurityNewsReel className="surface-reveal" />

        <section className="public-section-grid surface-reveal">
          <article className="public-panel public-panel--console">
            <span className="public-chip">Surface One</span>
            <h2>Landing</h2>
            <p>Glowing identity, animated terminal reveal, and high-signal routing into the storefront.</p>
          </article>
          <article className="public-panel public-panel--console">
            <span className="public-chip">Surface Two</span>
            <h2>Marketplace</h2>
            <p>Observer-mode catalog discovery with animated cards, category filters, and access-upgrade prompts.</p>
          </article>
          <article className="public-panel public-panel--console">
            <span className="public-chip">Surface Three</span>
            <h2>Register</h2>
            <p>Readiness interest capture with transmission-state feedback and cockpit rollout messaging.</p>
          </article>
        </section>
      </div>
    </div>
  );
}
