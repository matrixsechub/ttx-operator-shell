import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CHAT_MESSAGES,
  CHAT_ROOMS,
  CHAT_WRISTBANDS,
  INTEGRATIONS_FIXTURES,
  authorityView,
  bandState,
  canSimulatePending,
  decisionRowForRequest,
  requestOutcomeAfterDecision,
  wristbandCannotGrantAuthority,
} from "../src/pearl/chatIntegrations/index.js";

const cockpitRouter = readFileSync(new URL("../src/routes/cockpitRouter.tsx", import.meta.url), "utf8");
const operatorShell = readFileSync(new URL("../src/components/OperatorShell.tsx", import.meta.url), "utf8");
const surfaceRegistry = readFileSync(new URL("../worker/surfaceRegistry.ts", import.meta.url), "utf8");
const requireAuth = readFileSync(new URL("../src/lib/RequireAuth.tsx", import.meta.url), "utf8");
const pearlCss = readFileSync(
  new URL("../src/styles/pearl-chat-integrations.css", import.meta.url),
  "utf8",
);
const chatIntegrationsFixtures = readFileSync(
  new URL("../src/pearl/chatIntegrations/fixtures/chat-integrations-fixtures.js", import.meta.url),
  "utf8",
);
const pearlChatPage = readFileSync(
  new URL("../src/pages/pearl/PearlChatPage.tsx", import.meta.url),
  "utf8",
);
const pearlIntegrationsPage = readFileSync(
  new URL("../src/pages/pearl/PearlIntegrationsPage.tsx", import.meta.url),
  "utf8",
);

describe("pearl chat + integrations preview reconcile", () => {
  it("routes chat and integrations behind RequireAuth only", () => {
    assert.match(cockpitRouter, /path: "\/chat"/);
    assert.match(cockpitRouter, /path: "\/settings\/integrations"/);
    assert.match(cockpitRouter, /PearlChatPage/);
    assert.match(cockpitRouter, /PearlIntegrationsPage/);
    assert.match(cockpitRouter, /RequireAuth/);
    const requireIdx = cockpitRouter.indexOf("<RequireAuth");
    const chatIdx = cockpitRouter.indexOf('path: "/chat"');
    const settingsIdx = cockpitRouter.indexOf('path: "/settings/integrations"');
    const publicJoinIdx = cockpitRouter.indexOf('path: "/join"');
    assert.ok(requireIdx > -1 && chatIdx > requireIdx && settingsIdx > requireIdx);
    assert.ok(publicJoinIdx > -1 && publicJoinIdx < requireIdx);
  });

  it("exposes nav entries for chat and integrations", () => {
    assert.match(operatorShell, /\/chat/);
    assert.match(operatorShell, /\/settings\/integrations/);
  });

  it("maps /chat and /settings to cockpit HTML surface", () => {
    assert.match(surfaceRegistry, /"\/chat"/);
    assert.match(surfaceRegistry, /"\/settings"/);
  });

  it("keeps RequireAuth fail-closed redirect contract", () => {
    assert.match(requireAuth, /\/login\?from=/);
  });

  it("keeps pearl surface CSS free of raw hex (brand R9)", () => {
    assert.equal((pearlCss.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length, 0);
    assert.match(pearlCss, /var\(--pearl-room-pearl\)/);
    assert.match(pearlCss, /var\(--pearl-embedded-bg\)/);
  });

  it("preserves fail-closed governance invariants in fixtures", () => {
    assert.match(chatIntegrationsFixtures, /grantsAuthority:\s*false/);
    assert.doesNotMatch(chatIntegrationsFixtures, /grantsAuthority:\s*true/);
    assert.match(chatIntegrationsFixtures, /CHAMBER_FACTORY_GATE_ENABLED=false/);
    assert.match(chatIntegrationsFixtures, /simulation/i);
  });

  it("fixtures never grant authority and simulation decisions stay local", () => {
    assert.equal(CHAT_WRISTBANDS.full.grantsAuthority, false);
    assert.equal(wristbandCannotGrantAuthority(CHAT_WRISTBANDS.full), true);
    for (const server of INTEGRATIONS_FIXTURES.mcp) {
      assert.equal(server.grantsAuthority, false);
      assert.equal(authorityView(server).grantsAuthority, false);
    }
    const pending = CHAT_MESSAGES["marketplace-ops"].find(
      (row: { kind: string; status?: string }) => row.kind === "tool" && row.status === "pending",
    );
    assert.ok(pending);
    const decision = decisionRowForRequest(pending, canSimulatePending(CHAT_WRISTBANDS.full));
    assert.equal(decision.show, true);
    assert.equal(decision.grantsAuthority, false);
    assert.equal(decision.simulationOnly, true);
    const approved = requestOutcomeAfterDecision(pending, "approve", false);
    assert.equal(approved.simulatedOnly, true);
    assert.equal(approved.exec, true);
  });

  it("narrow wristband locks non-scoped rooms fail-closed", () => {
    const locked = bandState("marketplace-ops", CHAT_WRISTBANDS.narrow, "HOLD");
    assert.equal(locked.state, "LOCKED");
    assert.equal(locked.grantsAuthority, false);
    assert.ok(CHAT_ROOMS.some((room: { id: string }) => room.id === "marketplace-ops"));
  });

  it("chat keyboard/a11y contracts: listbox selection + context disclosure", () => {
    assert.match(pearlChatPage, /role="listbox"/);
    assert.match(pearlChatPage, /role="option"/);
    assert.match(pearlChatPage, /aria-selected=\{entry\.id === roomId\}/);
    assert.match(pearlChatPage, /aria-expanded=\{sideOpen\}/);
    assert.match(pearlChatPage, /aria-controls="pearl-ci-room-context"/);
    assert.match(pearlChatPage, /id="pearl-ci-room-context"/);
    assert.match(pearlChatPage, /htmlFor="pearl-composer"/);
    assert.match(pearlChatPage, /className="visually-hidden"/);
    assert.match(pearlChatPage, /aria-pressed=\{band === "full"\}/);
    assert.match(pearlChatPage, /aria-pressed=\{band === "narrow"\}/);
  });

  it("integrations keyboard/a11y contracts: pressed views + scroll regions", () => {
    assert.match(pearlIntegrationsPage, /aria-pressed=\{view === "overview" \|\| view === "detail"\}/);
    assert.match(pearlIntegrationsPage, /aria-pressed=\{view === "secrets"\}/);
    assert.match(pearlIntegrationsPage, /className="table-wrap"/);
    assert.match(pearlIntegrationsPage, /role="region"/);
    assert.match(pearlIntegrationsPage, /tabIndex=\{0\}/);
  });

  it("pearl CSS locks focus-visible, selected room, overflow, and reduced-motion", () => {
    assert.match(pearlCss, /aria-selected="true"/);
    assert.match(pearlCss, /:focus-visible/);
    assert.match(pearlCss, /\.table-wrap/);
    assert.match(pearlCss, /overflow-x:\s*auto/);
    assert.match(pearlCss, /overflow-wrap:\s*anywhere/);
    assert.match(pearlCss, /prefers-reduced-motion:\s*reduce/);
    assert.match(pearlCss, /@media \(max-width:\s*768px\)/);
    assert.match(pearlCss, /\.pearl-btn\s*\{/);
  });
});
