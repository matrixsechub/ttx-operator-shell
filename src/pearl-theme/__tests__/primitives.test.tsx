import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PearlSurface,
  GlassPanel,
  GraphitePanel,
  GoldActionButton,
  EntityOrb,
  TelemetryCard,
  MissionLadder,
  StateBadge,
} from "../components";

describe("PearlSurface — theme boundary", () => {
  it("sets data-theme=pearl on a real element (scoped/reversible)", () => {
    const { container } = render(<PearlSurface>content</PearlSurface>);
    expect(container.querySelector('[data-theme="pearl"]')).toBeInTheDocument();
  });
});

describe("GoldActionButton — governance action", () => {
  it("renders a real, keyboard-operable button", () => {
    render(<GoldActionButton>Start Diagnostic</GoldActionButton>);
    const btn = screen.getByRole("button", { name: "Start Diagnostic" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveClass("pearl-focusable"); // focus-visible affordance present
  });
});

describe("Panels — semantic + labelled", () => {
  it("glass and graphite panels expose accessible labels", () => {
    render(
      <>
        <GlassPanel label="Live System Overview">x</GlassPanel>
        <GraphitePanel label="Agent Load">y</GraphitePanel>
      </>,
    );
    expect(screen.getByRole("region", { name: "Live System Overview" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Agent Load" })).toBeInTheDocument();
  });
});

describe("EntityOrb — identity in text, not color alone", () => {
  it("renders all four entities with name + role text", () => {
    for (const e of ["beacon", "aurelius", "hsx", "ghost"] as const) {
      const { unmount } = render(<EntityOrb entity={e} />);
      unmount();
    }
    render(
      <>
        <EntityOrb entity="beacon" />
        <EntityOrb entity="aurelius" />
        <EntityOrb entity="hsx" />
        <EntityOrb entity="ghost" />
      </>,
    );
    expect(screen.getByText("BEACON")).toBeInTheDocument();
    expect(screen.getByText("AURELIUS")).toBeInTheDocument();
    expect(screen.getByText("HSX")).toBeInTheDocument();
    expect(screen.getByText("GHOST LAYER")).toBeInTheDocument();
    // decorative orb is aria-hidden (meaning lives in the caption text)
    expect(document.querySelector(".pearl-orb")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("StateBadge — meaning via icon + text + color, never color alone", () => {
  it("each state carries a text label", () => {
    render(
      <>
        <StateBadge kind="verified" />
        <StateBadge kind="attention" />
        <StateBadge kind="critical" />
        <StateBadge kind="info" />
      </>,
    );
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Attention")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
  });
});

describe("MissionLadder — status from props (no timers), accessible per node", () => {
  it("derives node status from props and labels it in text", () => {
    render(
      <MissionLadder
        nodes={[
          { id: "a", label: "Start", status: "done" },
          { id: "b", label: "Review", status: "active" },
          { id: "c", label: "Deploy", status: "pending" },
        ]}
        percent={72}
      />,
    );
    expect(screen.getByLabelText("Start: complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Review: in progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Deploy: pending")).toBeInTheDocument();
  });
});

describe("TelemetryCard — caller data only, sparkline is labelled inert SVG", () => {
  it("renders supplied rows with accessible sparklines", () => {
    render(
      <TelemetryCard
        title="Live System Overview"
        rows={[{ label: "CPU", value: 32, series: [1, 2, 3, 2, 4] }]}
      />,
    );
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "CPU trend" })).toBeInTheDocument();
  });
});

describe("Motion absence — substrate renders correct with zero animation", () => {
  it("no primitive markup relies on animation to convey content", () => {
    const { container } = render(
      <PearlSurface>
        <GoldActionButton>Go</GoldActionButton>
        <MissionLadder nodes={[{ id: "a", label: "Start", status: "done" }]} />
        <StateBadge kind="verified" />
      </PearlSurface>,
    );
    // No inline animation/transition styles are emitted by the primitives.
    expect(container.innerHTML).not.toMatch(/animation:|@keyframes|transition:/i);
  });
});
