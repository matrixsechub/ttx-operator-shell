import type { FlowAnalysis, FlowDropOffPage, FlowPathSummary, FlowRollup } from "./flowTypes";

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sortByCount(record: Record<string, number>): Array<{ page: string; count: number }> {
  return Object.entries(record)
    .map(([page, count]) => ({ page, count }))
    .sort((left, right) => right.count - left.count);
}

export function analyzeFlowRollup(rollup: FlowRollup): FlowAnalysis {
  const topEntryPages = sortByCount(rollup.entries);
  const topExitPages = sortByCount(rollup.exits);

  const transitionRates: FlowAnalysis["transitionRates"] = [];
  for (const [from, targets] of Object.entries(rollup.transitions)) {
    const fromExits = rollup.exits[from] ?? 0;
    const denominator = fromExits > 0 ? fromExits : Object.values(targets).reduce((sum, count) => sum + count, 0);
    for (const [to, count] of Object.entries(targets)) {
      transitionRates.push({
        from,
        to,
        rate: denominator > 0 ? roundRate(count / denominator) : 0,
      });
    }
  }
  transitionRates.sort((left, right) => right.rate - left.rate);

  const bounceRate =
    rollup.sessionCount > 0 ? roundRate(rollup.singlePageSessions / rollup.sessionCount) : 0;
  const loopRate =
    rollup.sessionCount > 0 ? roundRate(rollup.loopSessionCount / rollup.sessionCount) : 0;

  const deadEndPages = topEntryPages
    .map(({ page, count: entryCount }) => {
      const exitCount = rollup.exits[page] ?? 0;
      const outward = Object.values(rollup.transitions[page] ?? {}).reduce((sum, value) => sum + value, 0);
      const visits = rollup.pageVisits[page] ?? entryCount;
      const exitRate = visits > 0 ? exitCount / visits : 0;
      const forwardRate = visits > 0 ? outward / visits : 0;
      const score = exitRate * 0.6 + (1 - forwardRate) * 0.4;
      return { page, score: roundRate(score), visits, exitRate: roundRate(exitRate) };
    })
    .filter((entry) => entry.visits >= 3 && entry.exitRate >= 0.3)
    .sort((left, right) => right.score - left.score)
    .map(({ page, score }) => ({ page, score }));

  const avgDwellByPage: Record<string, number> = {};
  for (const [page, sum] of Object.entries(rollup.dwellSumMs)) {
    const count = rollup.dwellCount[page] ?? 0;
    if (count > 0) avgDwellByPage[page] = Math.round(sum / count);
  }

  const ctaCtrByKey: Record<string, number> = {};
  for (const [key, impressions] of Object.entries(rollup.ctaImpressions)) {
    const clicks = rollup.ctaClicks[key] ?? 0;
    ctaCtrByKey[key] = impressions > 0 ? roundRate(clicks / impressions) : 0;
  }

  return {
    topEntryPages,
    topExitPages,
    transitionRates,
    bounceRate,
    loopRate,
    deadEndPages,
    avgDwellByPage,
    ctaCtrByKey,
  };
}

export function buildTopPaths(rollup: FlowRollup, limit = 5): FlowPathSummary[] {
  const total = Object.values(rollup.pathCounts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return Object.entries(rollup.pathCounts)
    .map(([signature, count]) => ({
      path: signature.split("→"),
      count,
      share: roundRate(count / total),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

export function buildDropOffPages(rollup: FlowRollup, limit = 5): FlowDropOffPage[] {
  return Object.entries(rollup.pageVisits)
    .map(([page, visits]) => {
      const exits = rollup.exits[page] ?? 0;
      return {
        page,
        visits,
        exitRate: visits > 0 ? roundRate(exits / visits) : 0,
      };
    })
    .filter((entry) => entry.visits >= 1)
    .sort((left, right) => right.exitRate - left.exitRate)
    .slice(0, limit);
}
