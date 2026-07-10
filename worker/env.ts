export interface EdgeSecretsEnv {
  OPERATOR_SECRET?: string;
  MARKETPLACE_SECRET?: string;
  AUTH_SIGNING_KEY?: string;
  OPERATOR_PASSWORD?: string;
  OPERATOR_USERNAME?: string;
  HARNESS_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  CF_AI_API_TOKEN?: string;
  N8N_WEBHOOK_SECRET?: string;
}

export type WorkerEnv = Env & EdgeSecretsEnv;
