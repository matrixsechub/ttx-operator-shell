import { DurableObject } from "cloudflare:workers";
import { CATALOG_ITEMS } from "../catalogData";
import type { Entitlement, MarketplaceModule } from "./types";

const REGISTRY_KEY = "marketplace:registry";
const ENTITLEMENTS_KEY = "marketplace:entitlements";

function seedRegistry(): MarketplaceModule[] {
  return CATALOG_ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    tier: item.access_level === "Public" ? "free" : "pro",
    status: item.status === "active" ? "active" : "deprecated",
  }));
}

function seedEntitlements(): Entitlement[] {
  return [
    {
      moduleId: "digital-001",
      operatorId: "operator",
      plan: "pro",
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
  ];
}

export class MarketplaceDO extends DurableObject {
  private async loadRegistry(): Promise<MarketplaceModule[]> {
    const stored = await this.ctx.storage.get<MarketplaceModule[]>(REGISTRY_KEY);
    if (stored) return stored;
    const initial = seedRegistry();
    await this.ctx.storage.put(REGISTRY_KEY, initial);
    return initial;
  }

  private async loadEntitlements(): Promise<Entitlement[]> {
    const stored = await this.ctx.storage.get<Entitlement[]>(ENTITLEMENTS_KEY);
    if (stored) return stored;
    const initial = seedEntitlements();
    await this.ctx.storage.put(ENTITLEMENTS_KEY, initial);
    return initial;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/registry" && request.method === "GET") {
      const modules = await this.loadRegistry();
      const entitlements = await this.loadEntitlements();
      return Response.json({ ok: true, modules, entitlements });
    }

    if (path === "/validate" && request.method === "POST") {
      let body: { moduleId?: string; operatorId?: string; subscriptionPlan?: string };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      if (!body.moduleId || !body.operatorId) {
        return Response.json({ error: "moduleId and operatorId are required" }, { status: 400 });
      }

      const modules = await this.loadRegistry();
      const entitlements = await this.loadEntitlements();
      const mod = modules.find((m) => m.id === body.moduleId);
      if (!mod || mod.status !== "active") {
        return Response.json({ valid: false, reason: "module_not_found" }, { status: 404 });
      }

      if (mod.tier === "free") {
        return Response.json({
          valid: true,
          module: mod,
          entitlement: { plan: "free", status: "active" },
          subscriptionStatus: "not_required",
        });
      }

      const entitlement = entitlements.find(
        (e) => e.moduleId === body.moduleId && e.operatorId === body.operatorId && e.status === "active",
      );
      const valid =
        Boolean(entitlement) &&
        Boolean(entitlement && Date.parse(entitlement.validUntil) > Date.now()) &&
        (!body.subscriptionPlan || entitlement?.plan === body.subscriptionPlan);

      return Response.json({
        valid,
        module: mod,
        entitlement: entitlement ?? null,
        subscriptionStatus: valid ? "active" : "missing_or_expired",
      });
    }

    if (path === "/entitlements" && request.method === "GET") {
      const operatorId = url.searchParams.get("operatorId");
      if (!operatorId) {
        return Response.json({ error: "operatorId is required" }, { status: 400 });
      }
      const entitlements = (await this.loadEntitlements()).filter((e) => e.operatorId === operatorId);
      return Response.json({ ok: true, entitlements });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
