import type { UsageEnv } from "./usage";

export const ADAPTIVE_UI_MODES = ["CONFUSION", "FRICTION", "ENGAGED", "DEFAULT"] as const;
export type AdaptiveUiMode = (typeof ADAPTIVE_UI_MODES)[number];

export interface ModeCounterSnapshot {
  views: number;
  entryClicks: number;
  marketplaceClicks: number;
}

export type ModeCounterMap = Record<AdaptiveUiMode, ModeCounterSnapshot>;

function modeMetricKey(mode: AdaptiveUiMode, metric: keyof ModeCounterSnapshot): string {
  return `usage:v3:mode:${mode}:${metric}`;
}

const SESSION_ATTRIBUTED_MODE_KEY = (sessionId: string) => `usage:v3:session:mode:${sessionId}`;

async function readCounter(env: UsageEnv, key: string): Promise<number> {
  const raw = await env.TTX_STATE.get(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

async function incrementCounter(env: UsageEnv, key: string): Promise<void> {
  const next = (await readCounter(env, key)) + 1;
  await env.TTX_STATE.put(key, String(next), { expirationTtl: 365 * 24 * 60 * 60 });
}

export function isAdaptiveUiMode(value: unknown): value is AdaptiveUiMode {
  return typeof value === "string" && (ADAPTIVE_UI_MODES as readonly string[]).includes(value);
}

export async function readModeCounters(env: UsageEnv): Promise<ModeCounterMap> {
  const entries = await Promise.all(
    ADAPTIVE_UI_MODES.map(async (mode) => {
      const [views, entryClicks, marketplaceClicks] = await Promise.all([
        readCounter(env, modeMetricKey(mode, "views")),
        readCounter(env, modeMetricKey(mode, "entryClicks")),
        readCounter(env, modeMetricKey(mode, "marketplaceClicks")),
      ]);
      return [mode, { views, entryClicks, marketplaceClicks }] as const;
    }),
  );

  return Object.fromEntries(entries) as ModeCounterMap;
}

export async function readAttributedUiMode(env: UsageEnv, sessionId: string): Promise<AdaptiveUiMode | null> {
  const raw = await env.TTX_STATE.get(SESSION_ATTRIBUTED_MODE_KEY(sessionId));
  return isAdaptiveUiMode(raw) ? raw : null;
}

export async function recordUiModeView(
  env: UsageEnv,
  sessionId: string,
  uiMode: AdaptiveUiMode,
): Promise<boolean> {
  await env.TTX_STATE.put(SESSION_ATTRIBUTED_MODE_KEY(sessionId), uiMode, {
    expirationTtl: 30 * 24 * 60 * 60,
  });
  await incrementCounter(env, modeMetricKey(uiMode, "views"));
  return true;
}

export async function recordModeAttributedClick(
  env: UsageEnv,
  uiMode: AdaptiveUiMode | null,
  clickType: "entry_click" | "marketplace_click",
): Promise<void> {
  if (!uiMode) return;

  const metric = clickType === "entry_click" ? "entryClicks" : "marketplaceClicks";
  await incrementCounter(env, modeMetricKey(uiMode, metric));
}
