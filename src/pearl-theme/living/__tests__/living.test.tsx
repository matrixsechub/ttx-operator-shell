import { describe, it, expect, afterEach, vi } from "vitest";
import { StrictMode, useRef } from "react";
import { render, act, cleanup } from "@testing-library/react";
import { LivingRoot } from "../LivingRoot";
import { useValueHeartbeat } from "../behaviors";
import { diagnostics } from "../diagnostics";
import { MOTION_POLICY } from "../policy";

/**
 * Living Layer unit tests (jsdom). jsdom has no IntersectionObserver, so
 * useInView degrades to "in view"; visibility defaults to visible. We drive
 * reduced motion by installing a matchMedia mock. The diagnostics singleton is
 * balanced up/down, so after each test's cleanup every counter returns to 0 —
 * which is itself the leak-free assertion.
 */

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/** Controllable IntersectionObserver so offscreen suspension is deterministic. */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  emit(isIntersecting: boolean) {
    this.cb([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

afterEach(() => {
  cleanup();
  // @ts-expect-error allow removing the mock between tests
  delete window.matchMedia;
  // @ts-expect-error allow removing the mock between tests
  delete window.IntersectionObserver;
  MockIntersectionObserver.instances = [];
  setVisibility("visible");
  vi.useRealTimers();
});

describe("LivingRoot — active state", () => {
  it("activates ambient gate and runs exactly the shared frame loop", () => {
    render(
      <LivingRoot>
        <div>content</div>
      </LivingRoot>,
    );
    const root = document.querySelector(".pearl-living-root") as HTMLElement;
    expect(root).toBeTruthy();
    // shouldAnimate → data-living gate is on
    expect(root.getAttribute("data-living")).toBe("on");

    const snap = diagnostics.getSnapshot();
    expect(snap.livingState).toBe("active");
    // pointer-halo + ghost-motes engines
    expect(snap.enginesActive).toBe(2);
    // one shared rAF loop (pointer halo), never more
    expect(snap.frameLoops).toBeLessThanOrEqual(1);
  });

  it("keeps decorative layers out of the accessibility tree and non-interactive", () => {
    render(
      <LivingRoot>
        <div>content</div>
      </LivingRoot>,
    );
    const decor = document.querySelector(".pearl-living-decor") as HTMLElement;
    expect(decor.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("LivingRoot — reduced motion", () => {
  it("starts no engine, binds no pointer listener, spawns no mote, sets no gate", () => {
    mockReducedMotion(true);
    render(
      <LivingRoot>
        <div>content</div>
      </LivingRoot>,
    );
    const root = document.querySelector(".pearl-living-root") as HTMLElement;
    expect(root.hasAttribute("data-living")).toBe(false);

    const snap = diagnostics.getSnapshot();
    expect(snap.livingState).toBe("reduced");
    expect(snap.enginesActive).toBe(0);
    expect(snap.motes).toBe(0);
    expect(snap.frameLoops).toBe(0);
    // content is fully present regardless
    expect(document.body.textContent).toContain("content");
  });
});

describe("ghost motes — hard cap", () => {
  it("never exceeds MOTION_POLICY.maxMotes even after many spawn ticks", () => {
    vi.useFakeTimers();
    render(
      <LivingRoot>
        <div>content</div>
      </LivingRoot>,
    );
    // Advance well past 16 spawn intervals (2400ms each). jsdom fires no
    // animationend, so motes only accumulate — proving the cap holds.
    act(() => {
      vi.advanceTimersByTime(2400 * 30);
    });
    const snap = diagnostics.getSnapshot();
    expect(snap.motes).toBeLessThanOrEqual(MOTION_POLICY.maxMotes);
    expect(snap.motes).toBe(MOTION_POLICY.maxMotes);
  });
});

function HeartbeatProbe({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useValueHeartbeat(ref, value, true);
  return <span ref={ref} className="pearl-tele-val" data-testid="val">{value}</span>;
}

describe("value heartbeat — fires only on change", () => {
  it("does not beat on first render or when the value is unchanged, but beats on change", () => {
    const { rerender, getByTestId } = render(<HeartbeatProbe value={10} />);
    const el = getByTestId("val");
    expect(el.classList.contains("pearl-beat")).toBe(false);

    // same value → no beat
    rerender(<HeartbeatProbe value={10} />);
    expect(el.classList.contains("pearl-beat")).toBe(false);

    // changed value → beat
    act(() => {
      rerender(<HeartbeatProbe value={20} />);
    });
    expect(el.classList.contains("pearl-beat")).toBe(true);
  });
});

describe("lifecycle — suspends when unobserved", () => {
  it("suspends all engines when the document becomes hidden", () => {
    setVisibility("hidden");
    render(
      <LivingRoot>
        <div>content</div>
      </LivingRoot>,
    );
    const root = document.querySelector(".pearl-living-root") as HTMLElement;
    const snap = diagnostics.getSnapshot();
    expect(snap.livingState).toBe("hidden");
    expect(snap.enginesActive).toBe(0);
    expect(root.hasAttribute("data-living")).toBe(false);
    // content stays fully present while suspended
    expect(document.body.textContent).toContain("content");
  });

  it("suspends when scrolled offscreen and resumes when back in view", () => {
    // @ts-expect-error install controllable IO
    window.IntersectionObserver = MockIntersectionObserver;
    render(
      <LivingRoot>
        <div>content</div>
      </LivingRoot>,
    );
    const io = MockIntersectionObserver.instances.at(-1)!;

    act(() => io.emit(false)); // leaves viewport
    let snap = diagnostics.getSnapshot();
    expect(snap.livingState).toBe("offscreen");
    expect(snap.enginesActive).toBe(0);

    act(() => io.emit(true)); // returns to viewport
    snap = diagnostics.getSnapshot();
    expect(snap.livingState).toBe("active");
    expect(snap.enginesActive).toBe(2);
  });
});

describe("lifecycle — no leaks, Strict-Mode safe", () => {
  it("returns every counter to zero after unmount and does not multiply engines under StrictMode", () => {
    const { unmount } = render(
      <StrictMode>
        <LivingRoot>
          <div>content</div>
        </LivingRoot>
      </StrictMode>,
    );
    // StrictMode double-invokes effects; engines must not multiply.
    expect(diagnostics.getSnapshot().enginesActive).toBe(2);

    act(() => {
      unmount();
    });
    const snap = diagnostics.getSnapshot();
    expect(snap.enginesActive).toBe(0);
    expect(snap.timers).toBe(0);
    expect(snap.listeners).toBe(0);
    expect(snap.observers).toBe(0);
    expect(snap.motes).toBe(0);
    expect(snap.decorativeNodes).toBe(0);
  });
});
