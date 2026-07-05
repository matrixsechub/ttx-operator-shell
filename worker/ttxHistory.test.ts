import { describe, expect, it } from "vitest";
import { bandForScore } from "./ttxHistory";

describe("bandForScore", () => {
  it.each([
    [100, "strong"],
    [70, "strong"],
    [69, "mixed"],
    [40, "mixed"],
    [39, "degraded"],
    [0, "degraded"],
  ] as const)("bands a score of %d as %s", (score, expected) => {
    expect(bandForScore(score)).toBe(expected);
  });
});
