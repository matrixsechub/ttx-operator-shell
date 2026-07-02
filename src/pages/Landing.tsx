import { useNavigate } from "react-router-dom";

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-op-bg text-op-text">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(57,255,199,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,199,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="animate-scan pointer-events-none absolute inset-x-0 h-32 bg-gradient-to-b from-op-accent/10 via-op-accent/0 to-transparent" />

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <span className="text-[11px] uppercase tracking-[0.4em] text-op-text-dim">MatrixSecHub // Ops Division</span>
        <h1 className="text-4xl font-semibold tracking-[0.18em] text-op-accent sm:text-6xl">MSH OPS</h1>
        <p className="max-w-md text-sm leading-relaxed text-op-text-dim">
          Operator-grade cockpit, marketplace, and harness telemetry. Authenticate the link and step into the
          system.
        </p>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="group relative overflow-hidden rounded-sm border border-op-accent/60 px-8 py-3 text-sm uppercase tracking-[0.3em] text-op-accent transition-colors hover:bg-op-accent/10"
        >
          Enter the System
          <span className="ml-3 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
        </button>
        <span className="text-[10px] uppercase tracking-widest text-op-text-dim/70">v0.1 // worker-served</span>
      </div>
    </div>
  );
}
