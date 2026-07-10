import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";
import { handleBeaconRoute } from "../worker/beaconRoutes.ts";

describe("GET /api/beacon", () => {
  before(async () => {
    await ensureBeaconLoaded();
  });

  it("returns active beacon snapshot with hash", async () => {
    const response = await handleBeaconRoute(
      new Request("https://example.com/api/beacon"),
      "/api/beacon",
      "GET",
    );
    assert.ok(response);
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as {
      version?: number;
      hash?: string;
      id?: string;
      safe_mode?: boolean;
    };
    assert.equal(body.version, 1);
    assert.equal(body.id, "BEACON::NORTHSTAR");
    assert.match(body.hash ?? "", /^[a-f0-9]{64}$/);
    assert.equal(body.safe_mode, false);
  });
});

describe("GET /api/beacon/v2/draft", () => {
  it("returns draft beacon v2 payload", async () => {
    const response = await handleBeaconRoute(
      new Request("https://example.com/api/beacon/v2/draft"),
      "/api/beacon/v2/draft",
      "GET",
    );
    assert.ok(response);
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as { version?: number; draft?: boolean; payload?: { version?: number } };
    assert.equal(body.version, 2);
    assert.equal(body.draft, true);
    assert.equal(body.payload?.version, 2);
  });
});
