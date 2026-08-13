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
          background: "#050608",
          color: "#f0eee8",
        }}
      >
        <p style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: "#f2c14e", fontSize: 12 }}>
          {this.props.surface ?? "operator shell"} · bootstrap error
        </p>
        <h1 style={{ fontSize: 20, marginTop: 12 }}>Surface failed to start</h1>
        <p style={{ color: "#97a0a8", maxWidth: "42rem", lineHeight: 1.5 }}>
          The cockpit root crashed during bootstrap. Refresh to retry. If this persists, check Worker
          deploy health and browser console for the underlying exception.
        </p>
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            overflow: "auto",
            background: "rgba(18, 22, 28, 0.96)",
            border: "1px solid rgba(242, 193, 78, 0.28)",
            fontSize: 12,
            color: "#ff8b8b",
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
            border: "1px solid rgba(242, 193, 78, 0.65)",
            background: "transparent",
            color: "#f2c14e",
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
