import { useEffect } from "react";

// Read-only viewer for a local scenario's notes (Phase 30) — same overlay/
// dialog pattern as CatalogDetailModal.tsx (backdrop click + Escape to
// close, role="dialog"). Notes are free-text operator commentary, never
// editable from here — editing happens in the authoring form itself.
export function ScenarioNotesModal({ title, notes, onClose }: { title: string; notes: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="op-panel-raised w-full max-w-lg rounded-sm p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-notes-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="scenario-notes-title" className="text-base uppercase tracking-widest text-op-accent">
            {title} — Notes
          </h2>
          <button type="button" onClick={onClose} className="text-op-text-dim hover:text-op-text" aria-label="Close notes view">
            &times;
          </button>
        </div>
        <p className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-op-text">{notes}</p>
      </div>
    </div>
  );
}
