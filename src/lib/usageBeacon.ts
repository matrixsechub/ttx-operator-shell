import type { AdaptiveEntryUiMode } from "./adaptiveEntry";

export type UsageBeaconEvent =
  | "visit"
  | "entry_click"
  | "marketplace_click"
  | "ui_mode_view"
  | "service_view"
  | "intake_started"
  | "intake_completed"
  | "checkout_started"
  | "purchase_completed";

const SESSION_KEY = "msh_session";
const SESSION_UI_MODE_KEY = "msh_entry_ui_mode";

const CLIENT_DEDUP_KEYS: Record<Exclude<UsageBeaconEvent, "ui_mode_view">, string> = {
  visit: "msh_evt_visit",
  entry_click: "msh_evt_entry",
  marketplace_click: "msh_evt_marketplace",
  service_view: "msh_evt_service",
  intake_started: "msh_evt_intake_start",
  intake_completed: "msh_evt_intake_done",
  checkout_started: "msh_evt_checkout",
  purchase_completed: "msh_evt_purchase",
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
const CAMPAIGN_ID_KEY = "msh_campaign_id";
const CONTENT_ID_KEY = "msh_content_id";
const CTA_ID_KEY = "msh_cta_id";

export interface UrlAttributionParams {
  trafficSource?: string;
  campaignId?: string;
  contentId?: string;
  ctaId?: string;
}

export function readAttributionFromUrl(): UrlAttributionParams {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    const campaign = params.get("campaign");
    const content = params.get("content");
    const cta = params.get("cta");

    if (src) {
      const cleaned = src.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
      if (cleaned) sessionStorage.setItem(TRAFFIC_SOURCE_KEY, cleaned);
    }
    if (campaign) sessionStorage.setItem(CAMPAIGN_ID_KEY, campaign.slice(0, 64));
    if (content) sessionStorage.setItem(CONTENT_ID_KEY, content.slice(0, 64));
    if (cta) sessionStorage.setItem(CTA_ID_KEY, cta.slice(0, 64));

    return {
      trafficSource: src ? readStoredTrafficSource() : readStoredTrafficSource(),
      campaignId: campaign ?? readStoredCampaignId(),
      contentId: content ?? readStoredContentId(),
      ctaId: cta ?? readStoredCtaId(),
    };
  } catch {
    return {
      trafficSource: readStoredTrafficSource(),
      campaignId: readStoredCampaignId(),
      contentId: readStoredContentId(),
      ctaId: readStoredCtaId(),
    };
  }
}

export function readTrafficSourceFromUrl(): string | undefined {
  readAttributionFromUrl();
  return readStoredTrafficSource();
}

function readStoredTrafficSource(): string | undefined {
  try {
    return sessionStorage.getItem(TRAFFIC_SOURCE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function readStoredCampaignId(): string | undefined {
  try {
    return sessionStorage.getItem(CAMPAIGN_ID_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function readStoredContentId(): string | undefined {
  try {
    return sessionStorage.getItem(CONTENT_ID_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function readStoredCtaId(): string | undefined {
  try {
    return sessionStorage.getItem(CTA_ID_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export interface UsageBeaconOptions {
  uiMode?: AdaptiveEntryUiMode;
  trafficSource?: string;
  campaignId?: string;
  contentId?: string;
  ctaId?: string;
}

/** Fire-and-forget external usage signal — public, no auth required. */
export function recordUsageEvent(event: UsageBeaconEvent, options: UsageBeaconOptions = {}): void {
  const attribution = readAttributionFromUrl();
  const uiMode = options.uiMode ?? readStoredEntryUiMode();
  const trafficSource = options.trafficSource ?? attribution.trafficSource;
  const campaignId = options.campaignId ?? attribution.campaignId;
  const contentId = options.contentId ?? attribution.contentId;
  const ctaId = options.ctaId ?? attribution.ctaId;

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
      ...(campaignId ? { campaignId } : {}),
      ...(contentId ? { contentId } : {}),
      ...(ctaId ? { ctaId } : {}),
    }),
    keepalive: true,
  }).catch(() => {
    // External signals are best-effort; never block navigation.
  });
}
