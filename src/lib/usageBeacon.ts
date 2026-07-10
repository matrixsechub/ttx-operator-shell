import type { AdaptiveEntryUiMode } from "./adaptiveEntry";

export type UsageBeaconEvent = "visit" | "entry_click" | "marketplace_click" | "ui_mode_view";

const SESSION_KEY = "msh_session";
const SESSION_UI_MODE_KEY = "msh_entry_ui_mode";

const CLIENT_DEDUP_KEYS: Record<Exclude<UsageBeaconEvent, "ui_mode_view">, string> = {
  visit: "msh_evt_visit",
  entry_click: "msh_evt_entry",
  marketplace_click: "msh_evt_marketplace",
};

/** Stable browser session — one identity per tab origin until storage is cleared. */
export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return crypto.randomUUID();
  }
}

export function rememberEntryUiMode(uiMode: AdaptiveEntryUiMode): void {
  try {
    sessionStorage.setItem(SESSION_UI_MODE_KEY, uiMode);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readStoredEntryUiMode(): AdaptiveEntryUiMode | undefined {
  try {
    const raw = sessionStorage.getItem(SESSION_UI_MODE_KEY);
    if (raw === "CONFUSION" || raw === "FRICTION" || raw === "ENGAGED" || raw === "DEFAULT") {
      return raw;
    }
  } catch {
    // sessionStorage may be unavailable
  }
  return undefined;
}

function markClientEventOnce(event: Exclude<UsageBeaconEvent, "ui_mode_view">): boolean {
  try {
    const dedupKey = CLIENT_DEDUP_KEYS[event];
    if (sessionStorage.getItem(dedupKey)) return false;
    sessionStorage.setItem(dedupKey, "1");
    return true;
  } catch {
    return true;
  }
}

function markUiModeViewOnce(uiMode: AdaptiveEntryUiMode): boolean {
  try {
    const dedupKey = `msh_evt_ui_mode_${uiMode}`;
    if (sessionStorage.getItem(dedupKey)) return false;
    sessionStorage.setItem(dedupKey, "1");
    return true;
  } catch {
    return true;
  }
}

const TRAFFIC_SOURCE_KEY = "msh_traffic_source";

export function readTrafficSourceFromUrl(): string | undefined {
  try {
    const src = new URLSearchParams(window.location.search).get("src");
    if (!src) return readStoredTrafficSource();
    const cleaned = src.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
    if (!cleaned) return readStoredTrafficSource();
    sessionStorage.setItem(TRAFFIC_SOURCE_KEY, cleaned);
    return cleaned;
  } catch {
    return readStoredTrafficSource();
  }
}

function readStoredTrafficSource(): string | undefined {
  try {
    return sessionStorage.getItem(TRAFFIC_SOURCE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export interface UsageBeaconOptions {
  uiMode?: AdaptiveEntryUiMode;
  trafficSource?: string;
}

/** Fire-and-forget external usage signal — public, no auth required. */
export function recordUsageEvent(event: UsageBeaconEvent, options: UsageBeaconOptions = {}): void {
  const uiMode = options.uiMode ?? readStoredEntryUiMode();
  const trafficSource = options.trafficSource ?? readTrafficSourceFromUrl();

  if (event === "ui_mode_view") {
    if (!uiMode || !markUiModeViewOnce(uiMode)) return;
    rememberEntryUiMode(uiMode);
  } else if (!markClientEventOnce(event)) {
    return;
  }

  void fetch("/api/usage/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      sessionId: getOrCreateSessionId(),
      ...(uiMode ? { uiMode } : {}),
      ...(trafficSource ? { trafficSource } : {}),
    }),
    keepalive: true,
  }).catch(() => {
    // External signals are best-effort; never block navigation.
  });
}
