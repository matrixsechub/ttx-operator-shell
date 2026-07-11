import type { Page } from "@playwright/test";
import { evidenceHash } from "../hash.ts";
import type { PrismPerformanceProbeResult } from "./types.ts";

export function isPerformanceProbeEnabled(): boolean {
  return process.env.PRISM_STAGING_PERFORMANCE_PROBE === "true";
}

export async function runPerformanceProbe(
  page: Page,
  route: string,
  viewport: string,
): Promise<PrismPerformanceProbeResult> {
  if (!isPerformanceProbeEnabled()) {
    return {
      enabled: false,
      route,
      viewport,
      evidenceHash: evidenceHash({ enabled: false, route, viewport }),
    };
  }

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint");
    return {
      navigationDurationMs: nav ? nav.duration : undefined,
      firstContentfulPaintMs: fcp?.startTime,
    };
  });

  const payload = {
    enabled: true,
    route,
    viewport,
    firstContentfulPaintMs: metrics.firstContentfulPaintMs,
    navigationDurationMs: metrics.navigationDurationMs,
  };

  return {
    ...payload,
    evidenceHash: evidenceHash(payload),
  };
}
