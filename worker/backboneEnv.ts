import type { AuthEnv } from "./auth";
import type { SecurityEnv } from "./security";
import type { GovernanceDO } from "./do/governance";
import type { SessionDO } from "./do/session";
import type { MarketplaceDO } from "./do/marketplace";

export interface BackboneEnv extends AuthEnv, SecurityEnv {
  GOVERNANCE: DurableObjectNamespace<GovernanceDO>;
  SESSION: DurableObjectNamespace<SessionDO>;
  MARKETPLACE: DurableObjectNamespace<MarketplaceDO>;
}
