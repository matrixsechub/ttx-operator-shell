import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { RequireAuth } from "../../../lib/RequireAuth";
import { PearlPilotRoute } from "../PearlPilotRoute";
import { __setPearlPilotOverride } from "../featureFlag";

/**
 * F1 runtime-evidence closure: router-level authentication for the pilot route,
 * mirroring cockpitRouter's guarded `/dashboard/pearl-pilot` (RequireAuth →
 * PearlPilotRoute). The auth context is mocked so we exercise the guard, not a
 * live session. Proves the flag is EXPOSURE control layered *behind* auth —
 * unauthenticated users are redirected regardless of the flag.
 */

const h = vi.hoisted(() => ({ auth: { isAuthenticated: false, initializing: false } }));
vi.mock("../../../lib/AuthContext", () => ({ useAuth: () => h.auth }));

function renderPilotAt() {
  const router = createMemoryRouter(
    [
      { element: <RequireAuth />, children: [{ path: "/dashboard/pearl-pilot", element: <PearlPilotRoute /> }] },
      { path: "/login", element: <div>LOGIN PAGE</div> },
    ],
    { initialEntries: ["/dashboard/pearl-pilot"] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  h.auth = { isAuthenticated: false, initializing: false };
  __setPearlPilotOverride(null);
});
afterEach(() => {
  cleanup();
  __setPearlPilotOverride(null);
});

describe("cockpit pilot route — auth boundary", () => {
  it("unauthenticated → redirected through the login flow (flag irrelevant)", () => {
    h.auth = { isAuthenticated: false, initializing: false };
    __setPearlPilotOverride(true); // even flag ON must not bypass auth
    renderPilotAt();
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
    expect(document.querySelector('[data-testid="pilot-disabled"]')).toBeNull();
    expect(document.body.textContent).not.toContain("BEACON");
  });

  it("initializing → shows the session-check loading state, not a redirect", () => {
    h.auth = { isAuthenticated: false, initializing: true };
    renderPilotAt();
    expect(screen.getByText(/Checking session/i)).toBeInTheDocument();
    expect(screen.queryByText("LOGIN PAGE")).toBeNull();
  });

  it("authenticated + flag OFF → governed unavailable (disabled) panel", () => {
    h.auth = { isAuthenticated: true, initializing: false };
    __setPearlPilotOverride(false);
    renderPilotAt();
    expect(document.querySelector('[data-testid="pilot-disabled"]')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("BEACON");
  });

  it("authenticated + flag ON → pilot renders through the guarded route", () => {
    h.auth = { isAuthenticated: true, initializing: false };
    __setPearlPilotOverride(true);
    renderPilotAt();
    expect(document.body.textContent).toContain("BEACON");
    expect(document.body.textContent).toContain("GHOST LAYER");
    expect(document.querySelectorAll('[data-testid="no-target"]').length).toBeGreaterThanOrEqual(3);
  });
});
