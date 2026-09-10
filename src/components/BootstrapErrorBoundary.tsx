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
 * Colors use governed op-* tokens only (brand lint R9).
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
        className="m-0 min-h-dvh bg-op-bg p-8 font-mono-op text-op-text"
      >
        <p className="text-xs uppercase tracking-[0.12em] text-op-amber">
          {this.props.surface ?? "operator shell"} · bootstrap error
        </p>
        <h1 className="mt-3 text-xl text-op-text">Surface failed to start</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-op-text-dim">
          The cockpit root crashed during bootstrap. Refresh to retry. If this persists, check Worker
          deploy health and browser console for the underlying exception.
        </p>
        <pre className="mt-6 overflow-auto border border-op-amber/30 bg-op-panel-raised p-4 text-xs text-op-danger">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 cursor-pointer border border-op-amber/65 bg-transparent px-4 py-2 text-xs uppercase tracking-[0.08em] text-op-amber"
        >
          Reload surface
        </button>
      </main>
    );
  }
}
