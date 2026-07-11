import type { ActivationTask, ActivationTaskStatus } from "./types";
import { taskKey, queueKey, ACTIVATION_INDEX_MAX_IDS } from "./kvKeys";
import { listCampaignAssets } from "./outreachAssets";
import { appendActivationAudit } from "./audit";
import { buildChannelRecommendations } from "./channelAllocator";

export interface ActivationQueueEnv {
  TTX_STATE: KVNamespace;
}

export const MAX_TASKS_PER_DAY = 5;

export interface ActivationQueueSummary {
  date: string;
  pending: number;
  total: number;
  maxPerDay: number;
}

export async function getActivationQueueSummary(env: ActivationQueueEnv): Promise<ActivationQueueSummary> {
  const date = todayDate();
  const tasks = await getQueueForDate(env, date);
  const pending = tasks.filter((task) => task.status === "PENDING_APPROVAL").length;
  return {
    date,
    pending,
    total: tasks.length,
    maxPerDay: MAX_TASKS_PER_DAY,
  };
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getActivationTask(env: ActivationQueueEnv, taskId: string): Promise<ActivationTask | null> {
  const raw = await env.TTX_STATE.get(taskKey(taskId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActivationTask;
  } catch {
    return null;
  }
}

async function saveTask(env: ActivationQueueEnv, task: ActivationTask): Promise<void> {
  await env.TTX_STATE.put(taskKey(task.taskId), JSON.stringify(task));
}

async function readQueueIds(env: ActivationQueueEnv, date: string): Promise<string[]> {
  const raw = await env.TTX_STATE.get(queueKey(date));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeQueueIds(env: ActivationQueueEnv, date: string, ids: string[]): Promise<void> {
  await env.TTX_STATE.put(queueKey(date), JSON.stringify(ids.slice(0, ACTIVATION_INDEX_MAX_IDS)));
}

export async function getQueueForDate(env: ActivationQueueEnv, date: string): Promise<ActivationTask[]> {
  const ids = await readQueueIds(env, date);
  const tasks: ActivationTask[] = [];
  for (const id of ids) {
    const task = await getActivationTask(env, id);
    if (task) tasks.push(task);
  }
  return tasks;
}

export async function generateDailyQueue(
  env: ActivationQueueEnv,
  actor: string,
  reason: string,
): Promise<ActivationTask[]> {
  const date = todayDate();
  const existing = await getQueueForDate(env, date);
  if (existing.length >= MAX_TASKS_PER_DAY) return existing;

  const recommendations = await buildChannelRecommendations(env);
  const campaigns = (await import("./campaignStorage")).listCampaigns(env, "ACTIVE");
  const activeCampaigns = await campaigns;

  const tasks: ActivationTask[] = [...existing];
  const now = new Date().toISOString();

  for (const rec of recommendations) {
    if (tasks.length >= MAX_TASKS_PER_DAY) break;
    const campaign = activeCampaigns.find((c) => c.targetChannels.includes(rec.channel)) ?? activeCampaigns[0];
    if (!campaign) continue;

    const assets = await listCampaignAssets(env, campaign.campaignId);
    const approvedAsset = assets.find((a) => a.channel === rec.channel && a.status === "APPROVED");

    const task: ActivationTask = {
      taskId: crypto.randomUUID(),
      campaignId: campaign.campaignId,
      channel: rec.channel,
      title: `Outreach on ${rec.channel}`,
      description: rec.suggestedAction,
      assetId: approvedAsset?.assetId,
      status: "PENDING_APPROVAL",
      queueDate: date,
      createdAt: now,
      updatedAt: now,
    };

    await saveTask(env, task);
    tasks.push(task);
  }

  await writeQueueIds(
    env,
    date,
    tasks.map((t) => t.taskId),
  );

  await appendActivationAudit(env, {
    action: "queue_generated",
    actor,
    reason,
    metadata: { date, taskCount: tasks.length },
  });

  return tasks;
}

export async function transitionTaskStatus(
  env: ActivationQueueEnv,
  taskId: string,
  status: ActivationTaskStatus,
  actor: string,
  reason: string,
  skipReason?: string,
): Promise<ActivationTask> {
  const task = await getActivationTask(env, taskId);
  if (!task) throw new Error("Task not found");

  const now = new Date().toISOString();
  const updated: ActivationTask = {
    ...task,
    status,
    updatedAt: now,
    completedAt: status === "COMPLETED" ? now : task.completedAt,
    skipReason: status === "SKIPPED" ? skipReason : task.skipReason,
  };

  await saveTask(env, updated);
  await appendActivationAudit(env, {
    campaignId: task.campaignId,
    action: `task_${status.toLowerCase()}`,
    actor,
    reason,
    metadata: { taskId },
  });

  return updated;
}
