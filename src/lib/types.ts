export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  status?: string;
  price?: string | number;
  /** Distinguishes a physical/digital product listing from a governance/content listing. */
  kind?: "product" | "content";
  service_tier?: string;
  /** Free-form descriptive metadata only — never implies a real certification or audit occurred. */
  compliance_tags?: string[];
  ttx_eligible?: boolean;
  deployment_target?: string;
  /** UI display/filter label only. No auth exists in this app to enforce it as real access control. */
  access_level?: string;
  source?: string;
  lastUpdated?: string;
  /** Descriptive labels only (e.g. "recon", "telemetry") — not executable capabilities, no runtime negotiation. */
  capabilities?: string[];
}

export interface CatalogResponse {
  items: CatalogItem[];
}

export interface SystemStatus {
  harness?: {
    state: string;
    detail?: string;
  };
  api?: {
    available: boolean;
    detail?: string;
  };
  lastSuccessfulCall?: string;
  errors?: string[];
  [key: string]: unknown;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface Operator {
  id: string;
  handle: string;
  /** Descriptive only — no RBAC enforcement in this app. Same display-only philosophy as CatalogItem.access_level. */
  role?: string;
  access_level?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  operator?: Operator;
  [key: string]: unknown;
}
