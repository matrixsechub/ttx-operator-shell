import { getAgentGovernanceContextFor } from "../../msh-ops/agent/initAgentGovernance";
import { checkAutonomy } from "../../msh-ops/governance/checkAutonomy";
import type { UsageContextEnv } from "../usage";
import type { AuthEnv } from "../auth";
import type { BuildInfoEnv } from "../buildInfo";
import type { ModeEnv } from "../mode";
import { ACTIVATION_AGENT_ID, type CampaignStatus } from "./types";
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  transitionCampaign,
  updateCampaign,
  CampaignStorageError,
} from "./campaignStorage";
import { readCampaignMetrics } from "./campaignMetrics";
import { buildOrganicActivationProgress } from "./organicProgress";
import { buildChannelRecommendations } from "./channelAllocator";
import { generateDailyQueue, getQueueForDate, transitionTaskStatus } from "./activationQueue";
import { generateOutreachAssets, listCampaignAssets, transitionAssetStatus } from "./outreachAssets";
import { listCampaignAuditEvents } from "./audit";
import { evaluateActivationSafeMode, safeModeResponse } from "./safeMode";
import { evaluateLegacyOperatorApproval } from "../governance/legacyApproval";
import {
  activationMutationRequiresGovernance,
  executeGovernedActivationMutation,
  stripGovernanceFields,
} from "./governedActivation";
import type { ActivationOverview } from "./types";

export type ActivationRouteEnv = UsageContextEnv &
  AuthEnv &
  ModeEnv &
  BuildInfoEnv & {
    ACTIVATION_SAFE_MODE?: string;
    ALLOW_LEGACY_OPERATOR_APPROVAL?: string;
    BEACON_SIGNING_KEY?: string;
    GOVERNANCE_RECEIPT_SIGNING_KEY?: string;
    TTX_STATE: KVNamespace;
  };

const MAX_BODY_BYTES = 32_768;

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function requireReason(body: Record<string, unknown>): string {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) throw new Error("reason is required");
  return reason.slice(0, 500);
}

function governanceFields(body: Record<string, unknown>): {
  proposalId: string;
  approvalId: string;
  idempotencyKey: string;
} | null {
  const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
  const approvalId = typeof body.approvalId === "string" ? body.approvalId : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!proposalId || !approvalId || !idempotencyKey) return null;
  return { proposalId, approvalId, idempotencyKey };
}

async function checkMutationAutonomy(
  env: ActivationRouteEnv,
  body: Record<string, unknown>,
  description: string,
  actorId: string,
): Promise<Response | null> {
  if (activationMutationRequiresGovernance(env)) {
    return jsonResponse(
      {
        ok: false,
        error: "Signed approval receipt required (proposalId, approvalId, idempotencyKey)",
        code: "RECEIPT_REQUIRED",
      },
      403,
    );
  }

  const governance = getAgentGovernanceContextFor(ACTIVATION_AGENT_ID);
  const correlationId = crypto.randomUUID();

  if (body.operatorApproval === true) {
    const legacy = await evaluateLegacyOperatorApproval(env, body, {
      actionClass: "C3",
      systemTarget: "activation",
      actorId,
      correlationId,
    });
    if (!legacy.allowed) {
      return jsonResponse({ ok: false, error: legacy.reason, code: legacy.code }, 403);
    }
  }

  const fields = governanceFields(body);
  if (fields && !activationMutationRequiresGovernance(env)) {
    return null;
  }

  const decision = checkAutonomy(
    {
      agentId: ACTIVATION_AGENT_ID,
      actionKind: "mutate_state",
      description,
      axis: "TRUST",
      priorityIndex: 1,
      operatorApproval: body.operatorApproval === true,
    },
    governance,
  );

  if (decision.decision === "denied") {
    return jsonResponse({ ok: false, error: decision.reason }, 403);
  }
  if (decision.decision === "escalate") {
    return jsonResponse({ ok: false, error: decision.reason, requiresApproval: true }, 403);
  }
  return null;
}

async function executeGovernedActivationCreate(
  env: ActivationRouteEnv,
  body: Record<string, unknown>,
  request: Request,
): Promise<Response> {
  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) return jsonResponse({ error: "name is required" }, 400);

  return executeGovernedActivationMutation(env, {
    actionType: "activation.campaign.create",
    body,
    mutationPayload: stripGovernanceFields(body),
    execute: async () =>
      createCampaign(env, {
        name,
        description: typeof body.description === "string" ? body.description : undefined,
        targetChannels: Array.isArray(body.targetChannels) ? (body.targetChannels as string[]) : undefined,
        destinationPath: typeof body.destinationPath === "string" ? body.destinationPath : undefined,
        operatorNotes: typeof body.operatorNotes === "string" ? body.operatorNotes : undefined,
        actor: actorFromRequest(request),
        reason: requireReason(body),
      }),
    successPayload: (campaign) => ({ campaign }),
    successStatus: 201,
  });
}

function parseCampaignId(pathname: string): string | null {
  const match = /^\/api\/operator\/activation\/campaigns\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

function actorFromRequest(request: Request): string {
  return request.headers.get("x-operator-id") ?? "operator";
}

async function buildOverview(env: ActivationRouteEnv): Promise<ActivationOverview> {
  const [progress, campaigns, recommendations, safeMode] = await Promise.all([
    buildOrganicActivationProgress(env),
    listCampaigns(env),
    buildChannelRecommendations(env),
    evaluateActivationSafeMode(env),
  ]);
  const todayQueue = await getQueueForDate(env, new Date().toISOString().slice(0, 10));
  return {
    progress,
    campaigns,
    todayQueue,
    recommendations,
    safeMode,
    updatedAt: new Date().toISOString(),
  };
}

export async function handleActivationRoute(
  request: Request,
  pathname: string,
  env: ActivationRouteEnv,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/operator/activation")) return null;

  const safeMode = await evaluateActivationSafeMode(env);
  const isMutation =
    request.method === "POST" || request.method === "PATCH" || request.method === "DELETE";
  const isReadOnlyOverview = pathname === "/api/operator/activation/overview" ||
    pathname === "/api/operator/activation/progress" ||
    pathname === "/api/operator/activation/recommendations";

  if (safeMode.active && isMutation && !isReadOnlyOverview) {
    return safeModeResponse(safeMode.blockers);
  }

  try {
    if (pathname === "/api/operator/activation/overview" && request.method === "GET") {
      return jsonResponse({ ok: true, overview: await buildOverview(env) });
    }

    if (pathname === "/api/operator/activation/progress" && request.method === "GET") {
      return jsonResponse({ ok: true, progress: await buildOrganicActivationProgress(env) });
    }

    if (pathname === "/api/operator/activation/recommendations" && request.method === "GET") {
      return jsonResponse({ ok: true, recommendations: await buildChannelRecommendations(env) });
    }

    if (pathname === "/api/operator/activation/campaigns" && request.method === "GET") {
      const url = new URL(request.url);
      const status = url.searchParams.get("status") as CampaignStatus | null;
      return jsonResponse({ ok: true, campaigns: await listCampaigns(env, status ?? undefined) });
    }

    if (pathname === "/api/operator/activation/campaigns" && request.method === "POST") {
      const body = await readJsonBody(request);
      if (activationMutationRequiresGovernance(env)) {
        return executeGovernedActivationCreate(env, body, request);
      }
      const denied = await checkMutationAutonomy(env, body, "Create activation campaign", actorFromRequest(request));
      if (denied) return denied;
      const name = typeof body.name === "string" ? body.name : "";
      if (!name.trim()) return jsonResponse({ error: "name is required" }, 400);
      const campaign = await createCampaign(env, {
        name,
        description: typeof body.description === "string" ? body.description : undefined,
        targetChannels: Array.isArray(body.targetChannels) ? (body.targetChannels as string[]) : undefined,
        destinationPath: typeof body.destinationPath === "string" ? body.destinationPath : undefined,
        operatorNotes: typeof body.operatorNotes === "string" ? body.operatorNotes : undefined,
        actor: actorFromRequest(request),
        reason: requireReason(body),
      });
      return jsonResponse({ ok: true, campaign }, 201);
    }

    const campaignId = parseCampaignId(pathname);
    if (campaignId) {
      if (pathname === `/api/operator/activation/campaigns/${campaignId}` && request.method === "GET") {
        const campaign = await getCampaign(env, campaignId);
        if (!campaign) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse({ ok: true, campaign });
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}` && request.method === "PATCH") {
        const body = await readJsonBody(request);
        if (activationMutationRequiresGovernance(env)) {
          return executeGovernedActivationMutation(env, {
            actionType: "activation.campaign.update",
            body,
            mutationPayload: { ...body, campaignId },
            execute: async () =>
              updateCampaign(
                env,
                campaignId,
                {
                  name: typeof body.name === "string" ? body.name : undefined,
                  description: typeof body.description === "string" ? body.description : undefined,
                  targetChannels: Array.isArray(body.targetChannels) ? (body.targetChannels as string[]) : undefined,
                  destinationPath: typeof body.destinationPath === "string" ? body.destinationPath : undefined,
                  operatorNotes: typeof body.operatorNotes === "string" ? body.operatorNotes : undefined,
                },
                actorFromRequest(request),
                requireReason(body),
              ),
            successPayload: (campaign) => ({ campaign }),
          });
        }
        const denied = await checkMutationAutonomy(env, body, "Update activation campaign", actorFromRequest(request));
        if (denied) return denied;
        const campaign = await updateCampaign(
          env,
          campaignId,
          {
            name: typeof body.name === "string" ? body.name : undefined,
            description: typeof body.description === "string" ? body.description : undefined,
            targetChannels: Array.isArray(body.targetChannels) ? (body.targetChannels as string[]) : undefined,
            destinationPath: typeof body.destinationPath === "string" ? body.destinationPath : undefined,
            operatorNotes: typeof body.operatorNotes === "string" ? body.operatorNotes : undefined,
          },
          actorFromRequest(request),
          requireReason(body),
        );
        return jsonResponse({ ok: true, campaign });
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}/metrics` && request.method === "GET") {
        return jsonResponse({ ok: true, metrics: await readCampaignMetrics(env, campaignId) });
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}/assets` && request.method === "GET") {
        return jsonResponse({ ok: true, assets: await listCampaignAssets(env, campaignId) });
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}/assets/generate` && request.method === "POST") {
        const body = await readJsonBody(request);
        if (activationMutationRequiresGovernance(env)) {
          const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : new URL(request.url).origin;
          const channels = Array.isArray(body.channels)
            ? (body.channels as string[])
            : (await getCampaign(env, campaignId))?.targetChannels ?? ["reddit"];
          return executeGovernedActivationMutation(env, {
            actionType: "activation.campaign.assets.generate",
            body,
            mutationPayload: { ...body, campaignId, baseUrl, channels },
            execute: async () =>
              generateOutreachAssets(
                env,
                campaignId,
                baseUrl,
                channels,
                actorFromRequest(request),
                requireReason(body),
              ),
            successPayload: (assets) => ({ assets }),
            successStatus: 201,
          });
        }
        const denied = await checkMutationAutonomy(env, body, "Generate outreach assets", actorFromRequest(request));
        if (denied) return denied;
        const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : new URL(request.url).origin;
        const channels = Array.isArray(body.channels)
          ? (body.channels as string[])
          : (await getCampaign(env, campaignId))?.targetChannels ?? ["reddit"];
        const assets = await generateOutreachAssets(
          env,
          campaignId,
          baseUrl,
          channels,
          actorFromRequest(request),
          requireReason(body),
        );
        return jsonResponse({ ok: true, assets }, 201);
      }

      for (const action of ["approve", "pause", "complete"] as const) {
        if (pathname === `/api/operator/activation/campaigns/${campaignId}/${action}` && request.method === "POST") {
          const body = await readJsonBody(request);
          if (activationMutationRequiresGovernance(env)) {
            const statusMap = { approve: "APPROVED", pause: "PAUSED", complete: "COMPLETED" } as const;
            return executeGovernedActivationMutation(env, {
              actionType: `activation.campaign.transition.${action}`,
              body,
              mutationPayload: { ...body, campaignId, action },
              execute: async () => {
                let nextStatus: CampaignStatus = statusMap[action];
                const current = await getCampaign(env, campaignId);
                if (action === "approve" && current?.status === "READY_FOR_APPROVAL") {
                  nextStatus = "APPROVED";
                } else if (action === "approve" && current?.status === "APPROVED") {
                  nextStatus = "ACTIVE";
                }
                return transitionCampaign(
                  env,
                  campaignId,
                  nextStatus,
                  actorFromRequest(request),
                  requireReason(body),
                );
              },
              successPayload: (campaign) => ({ campaign }),
            });
          }
          const denied = await checkMutationAutonomy(env, body, `Campaign ${action}`, actorFromRequest(request));
          if (denied) return denied;
          const statusMap = { approve: "APPROVED", pause: "PAUSED", complete: "COMPLETED" } as const;
          let nextStatus: CampaignStatus = statusMap[action];
          const current = await getCampaign(env, campaignId);
          if (action === "approve" && current?.status === "READY_FOR_APPROVAL") {
            nextStatus = "APPROVED";
          } else if (action === "approve" && current?.status === "APPROVED") {
            nextStatus = "ACTIVE";
          }
          const campaign = await transitionCampaign(
            env,
            campaignId,
            nextStatus,
            actorFromRequest(request),
            requireReason(body),
          );
          return jsonResponse({ ok: true, campaign });
        }
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}/submit` && request.method === "POST") {
        const body = await readJsonBody(request);
        if (activationMutationRequiresGovernance(env)) {
          return executeGovernedActivationMutation(env, {
            actionType: "activation.campaign.submit",
            body,
            mutationPayload: { ...body, campaignId },
            execute: async () =>
              transitionCampaign(
                env,
                campaignId,
                "READY_FOR_APPROVAL",
                actorFromRequest(request),
                requireReason(body),
              ),
            successPayload: (campaign) => ({ campaign }),
          });
        }
        const denied = await checkMutationAutonomy(env, body, "Submit campaign for approval", actorFromRequest(request));
        if (denied) return denied;
        const campaign = await transitionCampaign(
          env,
          campaignId,
          "READY_FOR_APPROVAL",
          actorFromRequest(request),
          requireReason(body),
        );
        return jsonResponse({ ok: true, campaign });
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}/activate` && request.method === "POST") {
        const body = await readJsonBody(request);
        if (activationMutationRequiresGovernance(env)) {
          return executeGovernedActivationMutation(env, {
            actionType: "activation.campaign.activate",
            body,
            mutationPayload: { ...body, campaignId },
            execute: async () =>
              transitionCampaign(
                env,
                campaignId,
                "ACTIVE",
                actorFromRequest(request),
                requireReason(body),
              ),
            successPayload: (campaign) => ({ campaign }),
          });
        }
        const denied = await checkMutationAutonomy(env, body, "Activate campaign", actorFromRequest(request));
        if (denied) return denied;
        const campaign = await transitionCampaign(
          env,
          campaignId,
          "ACTIVE",
          actorFromRequest(request),
          requireReason(body),
        );
        return jsonResponse({ ok: true, campaign });
      }

      if (pathname === `/api/operator/activation/campaigns/${campaignId}/audit` && request.method === "GET") {
        return jsonResponse({ ok: true, events: await listCampaignAuditEvents(env, campaignId) });
      }
    }

    if (pathname.match(/^\/api\/operator\/activation\/assets\/[^/]+\/approve$/) && request.method === "POST") {
      const assetId = pathname.split("/")[5];
      const body = await readJsonBody(request);
      if (activationMutationRequiresGovernance(env)) {
        return executeGovernedActivationMutation(env, {
          actionType: "activation.asset.approve",
          body,
          mutationPayload: { ...body, assetId },
          execute: async () =>
            transitionAssetStatus(env, assetId, "APPROVED", actorFromRequest(request), requireReason(body)),
          successPayload: (asset) => ({ asset }),
        });
      }
      const denied = await checkMutationAutonomy(env, body, "Approve outreach asset", actorFromRequest(request));
      if (denied) return denied;
      const asset = await transitionAssetStatus(env, assetId, "APPROVED", actorFromRequest(request), requireReason(body));
      return jsonResponse({ ok: true, asset });
    }

    if (pathname.match(/^\/api\/operator\/activation\/assets\/[^/]+\/mark-used$/) && request.method === "POST") {
      const assetId = pathname.split("/")[5];
      const body = await readJsonBody(request);
      if (activationMutationRequiresGovernance(env)) {
        return executeGovernedActivationMutation(env, {
          actionType: "activation.asset.mark-used",
          body,
          mutationPayload: { ...body, assetId },
          execute: async () =>
            transitionAssetStatus(env, assetId, "USED", actorFromRequest(request), requireReason(body)),
          successPayload: (asset) => ({ asset }),
        });
      }
      const denied = await checkMutationAutonomy(env, body, "Mark outreach asset used", actorFromRequest(request));
      if (denied) return denied;
      const asset = await transitionAssetStatus(env, assetId, "USED", actorFromRequest(request), requireReason(body));
      return jsonResponse({ ok: true, asset });
    }

    if (pathname === "/api/operator/activation/queue" && request.method === "GET") {
      const url = new URL(request.url);
      const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
      return jsonResponse({ ok: true, tasks: await getQueueForDate(env, date) });
    }

    if (pathname === "/api/operator/activation/queue/generate" && request.method === "POST") {
      const body = await readJsonBody(request);
      if (activationMutationRequiresGovernance(env)) {
        return executeGovernedActivationMutation(env, {
          actionType: "activation.queue.generate",
          body,
          mutationPayload: body,
          execute: async () => generateDailyQueue(env, actorFromRequest(request), requireReason(body)),
          successPayload: (tasks) => ({ tasks }),
          successStatus: 201,
        });
      }
      const denied = await checkMutationAutonomy(env, body, "Generate activation queue", actorFromRequest(request));
      if (denied) return denied;
      const tasks = await generateDailyQueue(env, actorFromRequest(request), requireReason(body));
      return jsonResponse({ ok: true, tasks }, 201);
    }

    for (const action of ["approve", "complete", "skip"] as const) {
      const match = pathname.match(new RegExp(`^/api/operator/activation/tasks/([^/]+)/${action}$`));
      if (match && request.method === "POST") {
        const taskId = match[1];
        const body = await readJsonBody(request);
        if (activationMutationRequiresGovernance(env)) {
          const statusMap = { approve: "APPROVED", complete: "COMPLETED", skip: "SKIPPED" } as const;
          return executeGovernedActivationMutation(env, {
            actionType: `activation.task.transition.${action}`,
            body,
            mutationPayload: { ...body, taskId, action },
            execute: async () =>
              transitionTaskStatus(
                env,
                taskId,
                statusMap[action],
                actorFromRequest(request),
                requireReason(body),
                typeof body.skipReason === "string" ? body.skipReason : undefined,
              ),
            successPayload: (task) => ({ task }),
          });
        }
        const denied = await checkMutationAutonomy(env, body, `Task ${action}`, actorFromRequest(request));
        if (denied) return denied;
        const statusMap = { approve: "APPROVED", complete: "COMPLETED", skip: "SKIPPED" } as const;
        const task = await transitionTaskStatus(
          env,
          taskId,
          statusMap[action],
          actorFromRequest(request),
          requireReason(body),
          typeof body.skipReason === "string" ? body.skipReason : undefined,
        );
        return jsonResponse({ ok: true, task });
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof CampaignStorageError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
}
