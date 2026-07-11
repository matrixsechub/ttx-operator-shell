import type { ActivationCampaign, CampaignStatus } from "./types";
import { campaignKey, campaignIndexKey, ACTIVATION_INDEX_MAX_IDS } from "./kvKeys";
import { sanitizeDestination } from "./destinationAllowlist";
import { appendActivationAudit } from "./audit";

export interface CampaignStorageEnv {
  TTX_STATE: KVNamespace;
}

export class CampaignStorageError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "CampaignStorageError";
  }
}

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["READY_FOR_APPROVAL", "ARCHIVED"],
  READY_FOR_APPROVAL: ["APPROVED", "DRAFT", "ARCHIVED"],
  APPROVED: ["ACTIVE", "PAUSED", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

async function readIndex(env: CampaignStorageEnv, status: CampaignStatus): Promise<string[]> {
  const raw = await env.TTX_STATE.get(campaignIndexKey(status));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeIndex(env: CampaignStorageEnv, status: CampaignStatus, ids: string[]): Promise<void> {
  await env.TTX_STATE.put(campaignIndexKey(status), JSON.stringify(ids.slice(0, ACTIVATION_INDEX_MAX_IDS)));
}

async function addToIndex(env: CampaignStorageEnv, status: CampaignStatus, campaignId: string): Promise<void> {
  const ids = await readIndex(env, status);
  if (!ids.includes(campaignId)) {
    ids.unshift(campaignId);
    await writeIndex(env, status, ids);
  }
}

async function removeFromIndex(env: CampaignStorageEnv, status: CampaignStatus, campaignId: string): Promise<void> {
  const ids = await readIndex(env, status);
  await writeIndex(
    env,
    status,
    ids.filter((id) => id !== campaignId),
  );
}

export async function getCampaign(env: CampaignStorageEnv, campaignId: string): Promise<ActivationCampaign | null> {
  const raw = await env.TTX_STATE.get(campaignKey(campaignId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActivationCampaign;
  } catch {
    return null;
  }
}

export async function saveCampaign(env: CampaignStorageEnv, campaign: ActivationCampaign): Promise<void> {
  await env.TTX_STATE.put(campaignKey(campaign.campaignId), JSON.stringify(campaign));
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  targetChannels?: string[];
  destinationPath?: string;
  operatorNotes?: string;
  actor: string;
  reason: string;
}

export async function createCampaign(
  env: CampaignStorageEnv,
  input: CreateCampaignInput,
): Promise<ActivationCampaign> {
  const now = new Date().toISOString();
  const campaign: ActivationCampaign = {
    campaignId: crypto.randomUUID(),
    name: input.name.trim().slice(0, 120),
    description: (input.description ?? "").trim().slice(0, 2000),
    status: "DRAFT",
    targetChannels: (input.targetChannels ?? []).map((c) => c.trim().slice(0, 32)).filter(Boolean),
    destinationPath: sanitizeDestination(input.destinationPath ?? "/"),
    createdAt: now,
    updatedAt: now,
    operatorNotes: input.operatorNotes?.trim().slice(0, 2000),
  };

  await saveCampaign(env, campaign);
  await addToIndex(env, "DRAFT", campaign.campaignId);
  await appendActivationAudit(env, {
    campaignId: campaign.campaignId,
    action: "campaign_created",
    actor: input.actor,
    reason: input.reason,
    nextStatus: "DRAFT",
  });

  return campaign;
}

export async function updateCampaign(
  env: CampaignStorageEnv,
  campaignId: string,
  patch: Partial<Pick<ActivationCampaign, "name" | "description" | "targetChannels" | "destinationPath" | "operatorNotes">>,
  actor: string,
  reason: string,
): Promise<ActivationCampaign> {
  const campaign = await getCampaign(env, campaignId);
  if (!campaign) throw new CampaignStorageError(404, "Campaign not found");
  if (campaign.status === "ARCHIVED" || campaign.status === "COMPLETED") {
    throw new CampaignStorageError(409, "Campaign is not editable");
  }

  const updated: ActivationCampaign = {
    ...campaign,
    name: patch.name?.trim().slice(0, 120) ?? campaign.name,
    description: patch.description?.trim().slice(0, 2000) ?? campaign.description,
    targetChannels: patch.targetChannels?.map((c) => c.trim().slice(0, 32)).filter(Boolean) ?? campaign.targetChannels,
    destinationPath: patch.destinationPath ? sanitizeDestination(patch.destinationPath) : campaign.destinationPath,
    operatorNotes: patch.operatorNotes?.trim().slice(0, 2000) ?? campaign.operatorNotes,
    updatedAt: new Date().toISOString(),
  };

  await saveCampaign(env, updated);
  await appendActivationAudit(env, {
    campaignId,
    action: "campaign_updated",
    actor,
    reason,
    metadata: { patch: Object.keys(patch) },
  });

  return updated;
}

export async function transitionCampaign(
  env: CampaignStorageEnv,
  campaignId: string,
  nextStatus: CampaignStatus,
  actor: string,
  reason: string,
): Promise<ActivationCampaign> {
  const campaign = await getCampaign(env, campaignId);
  if (!campaign) throw new CampaignStorageError(404, "Campaign not found");

  const allowed = VALID_TRANSITIONS[campaign.status];
  if (!allowed.includes(nextStatus)) {
    throw new CampaignStorageError(409, `Cannot transition from ${campaign.status} to ${nextStatus}`);
  }

  const now = new Date().toISOString();
  const updated: ActivationCampaign = {
    ...campaign,
    status: nextStatus,
    updatedAt: now,
    approvedAt: nextStatus === "APPROVED" || nextStatus === "ACTIVE" ? (campaign.approvedAt ?? now) : campaign.approvedAt,
    activatedAt: nextStatus === "ACTIVE" ? (campaign.activatedAt ?? now) : campaign.activatedAt,
    completedAt: nextStatus === "COMPLETED" ? now : campaign.completedAt,
  };

  await removeFromIndex(env, campaign.status, campaignId);
  await saveCampaign(env, updated);
  await addToIndex(env, nextStatus, campaignId);

  await appendActivationAudit(env, {
    campaignId,
    action: "campaign_transition",
    actor,
    reason,
    previousStatus: campaign.status,
    nextStatus,
  });

  return updated;
}

export async function listCampaigns(
  env: CampaignStorageEnv,
  status?: CampaignStatus,
): Promise<ActivationCampaign[]> {
  const statuses: CampaignStatus[] = status ? [status] : ["DRAFT", "READY_FOR_APPROVAL", "APPROVED", "ACTIVE", "PAUSED", "COMPLETED"];
  const campaigns: ActivationCampaign[] = [];
  for (const s of statuses) {
    const ids = await readIndex(env, s);
    for (const id of ids) {
      const campaign = await getCampaign(env, id);
      if (campaign) campaigns.push(campaign);
    }
  }
  return campaigns;
}

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
