export interface EdgeSecretsEnv {
  OPERATOR_SECRET?: string;
  MARKETPLACE_SECRET?: string;
  AUTH_SIGNING_KEY?: string;
  OPERATOR_PASSWORD?: string;
  OPERATOR_USERNAME?: string;
  HARNESS_SECRET?: string;
}

export type WorkerEnv = Env & EdgeSecretsEnv;
