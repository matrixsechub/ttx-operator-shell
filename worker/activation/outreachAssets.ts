import type { OutreachAsset, OutreachAssetStatus } from "./types";
import { assetKey } from "./kvKeys";
import { getCampaign } from "./campaignStorage";
import { appendActivationAudit } from "./audit";

export interface OutreachAssetEnv {
  TTX_STATE: KVNamespace;
}

const TEMPLATES: Record<string, { title: string; body: string; complianceNotes: string }> = {
  reddit_v1: {
    title: "Operator outreach — Reddit",
    body: "We built a guided entry for operators exploring marketplace services. Feedback welcome — tracked link below.",
    complianceNotes: "No auto-post. Operator must review subreddit rules before posting.",
  },
  x_v1: {
    title: "Operator outreach — X",
    body: "Shipping operator-gated traffic activation. Human-quality filtering only — no synthetic promotion.",
    complianceNotes: "No auto-post. Operator must comply with X automation policies.",
  },
  linkedin_v1: {
    title: "Operator outreach — LinkedIn",
    body: "Organic activation loop with campaign attribution and conversion validation. Operator-approved tasks only.",
    complianceNotes: "No auto-post. Operator must use personal/company account per policy.",
  },
  email_v1: {
    title: "Operator outreach — Email",
    body: "Subject: Marketplace entry validation\n\nWe are validating organic traffic with first-touch attribution. Reply if interested.",
    complianceNotes: "No auto-send. Operator must comply with CAN-SPAM and consent requirements.",
  },
  discord_v1: {
    title: "Operator outreach — Discord",
    body: "Sharing our operator shell entry experiment — tracked link for attribution validation.",
    complianceNotes: "No auto-post. Operator must respect channel rules.",
  },
};

export function buildTrackedUrl(baseUrl: string, params: {
  src: string;
  campaignId: string;
  contentId: string;
  ctaId: string;
  destinationPath?: string;
}): string {
  const path = params.destinationPath ?? "/";
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("src", params.src);
  url.searchParams.set("campaign", params.campaignId);
  url.searchParams.set("content", params.contentId);
  url.searchParams.set("cta", params.ctaId);
  return url.toString();
}

export async function getOutreachAsset(env: OutreachAssetEnv, assetId: string): Promise<OutreachAsset | null> {
  const raw = await env.TTX_STATE.get(assetKey(assetId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OutreachAsset;
  } catch {
    return null;
  }
}

async function saveOutreachAsset(env: OutreachAssetEnv, asset: OutreachAsset): Promise<void> {
  await env.TTX_STATE.put(assetKey(asset.assetId), JSON.stringify(asset));
}

export async function generateOutreachAssets(
  env: OutreachAssetEnv,
  campaignId: string,
  baseUrl: string,
  channels: string[],
  actor: string,
  reason: string,
): Promise<OutreachAsset[]> {
  const campaign = await getCampaign(env, campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const assets: OutreachAsset[] = [];
  const now = new Date().toISOString();

  for (const channel of channels) {
    const templateId = `${channel}_v1`;
    const template = TEMPLATES[templateId] ?? TEMPLATES.reddit_v1;
    const contentId = crypto.randomUUID().slice(0, 8);
    const ctaId = crypto.randomUUID().slice(0, 8);

    const asset: OutreachAsset = {
      assetId: crypto.randomUUID(),
      campaignId,
      channel,
      templateId,
      title: template.title,
      body: template.body,
      trackedUrl: buildTrackedUrl(baseUrl, {
        src: channel,
        campaignId,
        contentId,
        ctaId,
        destinationPath: campaign.destinationPath,
      }),
      complianceNotes: template.complianceNotes,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    };

    await saveOutreachAsset(env, asset);
    assets.push(asset);
  }

  await appendActivationAudit(env, {
    campaignId,
    action: "assets_generated",
    actor,
    reason,
    metadata: { count: assets.length, channels },
  });

  return assets;
}

export async function listCampaignAssets(env: OutreachAssetEnv, campaignId: string): Promise<OutreachAsset[]> {
  const campaign = await getCampaign(env, campaignId);
  if (!campaign) return [];

  const prefix = `activation:v1:asset:`;
  const list = await env.TTX_STATE.list({ prefix });
  const assets: OutreachAsset[] = [];
  for (const key of list.keys) {
    const raw = await env.TTX_STATE.get(key.name);
    if (!raw) continue;
    try {
      const asset = JSON.parse(raw) as OutreachAsset;
      if (asset.campaignId === campaignId) assets.push(asset);
    } catch {
      // skip corrupt
    }
  }
  return assets;
}

export async function transitionAssetStatus(
  env: OutreachAssetEnv,
  assetId: string,
  status: OutreachAssetStatus,
  actor: string,
  reason: string,
): Promise<OutreachAsset> {
  const asset = await getOutreachAsset(env, assetId);
  if (!asset) throw new Error("Asset not found");

  const now = new Date().toISOString();
  const updated: OutreachAsset = {
    ...asset,
    status,
    updatedAt: now,
    approvedAt: status === "APPROVED" ? now : asset.approvedAt,
    usedAt: status === "USED" ? now : asset.usedAt,
  };

  await saveOutreachAsset(env, updated);
  await appendActivationAudit(env, {
    campaignId: asset.campaignId,
    action: `asset_${status.toLowerCase()}`,
    actor,
    reason,
    metadata: { assetId },
  });

  return updated;
}
