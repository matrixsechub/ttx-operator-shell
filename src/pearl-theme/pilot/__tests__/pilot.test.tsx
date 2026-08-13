import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { PearlPilotRoute } from "../PearlPilotRoute";
import { __setPearlPilotOverride } from "../featureFlag";
import { diagnostics } from "../../living/diagnostics";

/**
 * Pilot integration tests (jsdom). They prove the governance contract of the
 * authenticated pilot: fail-closed when the flag is off, no fabricated data,
 * and Living motion suspended under SAFE_MODE / BLOCKED / CRITICAL.
 */

afterEach(() => {
  cleanup();
  __setPearlPilotOverride(null); // clear the flag override between tests
});

describe("Pearl pilot — feature flag (default OFF, fail closed)", () => {
  it("renders the disabled panel and starts no Living engine when the flag is OFF", () => {
    __setPearlPilotOverride(false);
    render(<PearlPilotRoute />);
    expect(document.querySelector('[data-testid="pilot-disabled"]')).toBeInTheDocument();
    expect(document.querySelector(".pearl-living-root")).toBeNull();
    expect(diagnostics.getSnapshot().enginesActive).toBe(0);
  });

  it("defaults to OFF when no override and no env flag is set", () => {
    // no override set → isPearlPilotEnabled() reads unset env → false
    render(<PearlPilotRoute />);
    expect(document.querySelector('[data-testid="pilot-disabled"]')).toBeInTheDocument();
  });
});

describe("Pearl pilot — enabled, nominal condition", () => {
  it("renders the Pearl composition and mounts Living under a nominal condition", () => {
    __setPearlPilotOverride(true);
    render(<PearlPilotRoute condition="NOMINAL" />);
    // identity present
    expect(document.body.textContent).toContain("BEACON");
    expect(document.body.textContent).toContain("GHOST LAYER");
    // Living is active
    expect(document.querySelector(".pearl-living-root")).toBeInTheDocument();
    expect(diagnostics.getSnapshot().enginesActive).toBeGreaterThan(0);
  });

  it("renders NO_TARGET data as explicit unavailable, never fabricated numbers", () => {
    __setPearlPilotOverride(true);
    render(<PearlPilotRoute condition="NOMINAL" />);
    const noTargets = document.querySelectorAll('[data-testid="no-target"]');
    expect(noTargets.length).toBeGreaterThanOrEqual(3);
    noTargets.forEach((el) => expect(el.textContent).toContain("UNAVAILABLE"));
    // governance action is a real, focusable button
    const btn = document.querySelector("button.pearl-gold-btn") as HTMLButtonElement;
    expect(btn).toBeInTheDocument();
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });
});

describe("Pearl pilot — motion suspended under adverse conditions", () => {
  for (const condition of ["SAFE_MODE", "BLOCKED", "CRITICAL"] as const) {
    it(`suspends Living motion under ${condition} while keeping the substrate complete`, () => {
      __setPearlPilotOverride(true);
      render(<PearlPilotRoute condition={condition} />);
      // no Living engine mounted
      expect(document.querySelector(".pearl-living-root")).toBeNull();
      expect(diagnostics.getSnapshot().enginesActive).toBe(0);
      // suspension marker + condition recorded
      const marker = document.querySelector('[data-testid="pilot-motion-suspended"]');
      expect(marker).toBeInTheDocument();
      expect(marker?.getAttribute("data-condition")).toBe(condition);
      // static substrate remains fully present
      expect(document.body.textContent).toContain("BEACON");
    });
  }
});

describe("Pearl pilot — lifecycle", () => {
  it("returns Living engines to zero after unmount when enabled", () => {
    __setPearlPilotOverride(true);
    const { unmount } = render(<PearlPilotRoute condition="NOMINAL" />);
    expect(diagnostics.getSnapshot().enginesActive).toBeGreaterThan(0);
    act(() => unmount());
    expect(diagnostics.getSnapshot().enginesActive).toBe(0);
  });
});
