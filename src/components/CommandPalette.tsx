import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "./OperatorShell";
import { DIVISIONS } from "../pages/divisions/data";
import { OPERATOR_SYSTEMS } from "../operator/registry";
import { MARKETPLACE_CATEGORIES } from "../pages/marketplace/categories";
import { FUTURE_MODULES } from "../future/registry";

interface Command {
  label: string;
  to: string;
  group: string;
}

// Ctrl/Cmd+K quick-nav palette. Pure client-side navigation over the
// existing registries — no new data source, no backend.
function buildCommands(): Command[] {
  const nav = NAV_ITEMS.map((item) => ({ label: item.label, to: item.to, group: "Navigation" }));
  const divisions = DIVISIONS.map((d) => ({ label: d.name, to: `/divisions/${d.slug}`, group: "Divisions" }));
  const systems = OPERATOR_SYSTEMS.map((s) => ({ label: s.label, to: `/systems/${s.slug}`, group: "Systems" }));
  const categories = MARKETPLACE_CATEGORIES.map((c) => ({
    label: c.label,
    to: `/marketplace/${c.slug}`,
    group: "Marketplace",
  }));
  const future = FUTURE_MODULES.map((f) => ({ label: f.name, to: `/future/${f.slug}`, group: "Future" }));
  return [...nav, ...divisions, ...systems, ...categories, ...future];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands = useMemo(buildCommands, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    function onGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(command: Command) {
    navigate(command.to);
    setOpen(false);
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = filtered[activeIndex];
      if (command) select(command);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="op-panel-raised w-full max-w-md rounded-sm p-3"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Jump to…"
          className="w-full rounded-sm border border-op-border-bright bg-transparent px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
        />

        <div className="op-scrollbar mt-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-xs italic text-op-text-dim">No matches.</p>
          ) : (
            filtered.map((command, index) => (
              <button
                key={`${command.group}-${command.to}`}
                type="button"
                onClick={() => select(command)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-op-accent/10 text-op-accent" : "text-op-text hover:bg-white/5"
                }`}
              >
                <span>{command.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-op-text-dim">{command.group}</span>
              </button>
            ))
          )}
        </div>

        <p className="mt-2 border-t border-op-border pt-2 text-[10px] text-op-text-dim">
          &uarr;&darr; navigate &middot; enter select &middot; esc close
        </p>
      </div>
    </div>
  );
}
