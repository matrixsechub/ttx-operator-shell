import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  surface?: string;
};

type State = {
  error: Error | null;
};

/**
 * Bootstrap / render error boundary so a blank #root is never the only signal.
 * Surfaces a recoverable operator-readable failure state.
 * Colors use op-* tokens only (R9 — no raw hex in OS surface code).
 */
export class BootstrapErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.surface ?? "shell"}] bootstrap failure`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          margin: 0,
          padding: "2rem",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          background: "var(--color-op-bg)",
          color: "var(--color-op-text)",
        }}
      >
        <p
          style={{
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-op-amber)",
            fontSize: 12,
          }}
        >
          {this.props.surface ?? "operator shell"} · bootstrap error
        </p>
        <h1 style={{ fontSize: 20, marginTop: 12 }}>Surface failed to start</h1>
        <p style={{ color: "var(--color-op-text-dim)", maxWidth: "42rem", lineHeight: 1.5 }}>
          The cockpit root crashed during bootstrap. Refresh to retry. If this persists, check Worker
          deploy health and browser console for the underlying exception.
        </p>
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            overflow: "auto",
            background: "var(--color-op-panel)",
            border: "1px solid var(--color-op-border)",
            fontSize: 12,
            color: "var(--color-op-danger)",
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 20,
            padding: "0.55rem 1rem",
            border: "1px solid var(--color-op-amber)",
            background: "transparent",
            color: "var(--color-op-amber)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Reload surface
        </button>
      </main>
    );
  }
}
