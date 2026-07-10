import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactSensitiveText, assertNoSecretsInArtifact } from "../../scripts/uiux/redact.ts";

describe("PRISM artifact redaction", () => {
  it("redacts bearer tokens and jwt material", () => {
    const input = "Authorization: Bearer abc.def.ghi and eyJhbGciOiJIUzI1NiJ9.abc.def";
    const redacted = redactSensitiveText(input);
    assert.match(redacted, /\[REDACTED\]/);
    assert.doesNotMatch(redacted, /Bearer abc/);
  });

  it("flags secrets in artifact scan", () => {
    const violations = assertNoSecretsInArtifact('{"token":"eyJhbGciOiJIUzI1NiJ9.abc.def"}');
    assert.ok(violations.length > 0);
  });

  it("passes clean artifact text", () => {
    const violations = assertNoSecretsInArtifact('{"captureId":"abc","status":"complete"}');
    assert.equal(violations.length, 0);
  });
});
