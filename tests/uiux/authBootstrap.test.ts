import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootstrapOperatorSession } from "../../scripts/uiux/authBootstrap.ts";

describe("PRISM operator auth bootstrap", () => {
  it("fails closed when credentials are missing", async () => {
    const priorCallsign = process.env.PRISM_OPERATOR_CALLSIGN;
    const priorPassword = process.env.PRISM_OPERATOR_PASSWORD;
    delete process.env.PRISM_OPERATOR_CALLSIGN;
    delete process.env.PRISM_OPERATOR_PASSWORD;
    delete process.env.OPERATOR_CALLSIGN;
    delete process.env.OPERATOR_PASSWORD;

    const result = await bootstrapOperatorSession("http://127.0.0.1:4175");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /credentials not configured/i);
    }

    if (priorCallsign) process.env.PRISM_OPERATOR_CALLSIGN = priorCallsign;
    if (priorPassword) process.env.PRISM_OPERATOR_PASSWORD = priorPassword;
  });
});
