import type { CustomerBeaconDocument } from "./types";

export class CustomerBeaconValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerBeaconValidationError";
  }
}

function assertString(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CustomerBeaconValidationError(`${field} must be a non-empty string`);
  }
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ");
  if (normalized.length > max) {
    throw new CustomerBeaconValidationError(`${field} exceeds maximum length`);
  }
  return normalized;
}

function assertStringArray(value: unknown, field: string, min = 1, maxItems = 24, itemMax = 512): string[] {
  if (!Array.isArray(value)) {
    throw new CustomerBeaconValidationError(`${field} must be an array`);
  }
  if (value.length < min || value.length > maxItems) {
    throw new CustomerBeaconValidationError(`${field} must contain between ${min} and ${maxItems} items`);
  }
  return value.map((entry, index) => assertString(entry, `${field}[${index}]`, itemMax));
}

export function validateCustomerBeaconDocument(raw: unknown): CustomerBeaconDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CustomerBeaconValidationError("Beacon document must be an object");
  }
  const doc = raw as Record<string, unknown>;

  const version = assertString(doc.version, "version", 32);
  const state = assertString(doc.state, "state", 32);
  if (state !== "active") {
    throw new CustomerBeaconValidationError('state must be "active"');
  }

  const organization = assertString(doc.organization, "organization", 256);
  const northstar = assertString(doc.northstar, "northstar", 2000);
  const strategicAxis = assertStringArray(doc.strategicAxis, "strategicAxis", 1, 12);
  const priorities = assertStringArray(doc.priorities, "priorities", 1, 12);

  if (!doc.authority || typeof doc.authority !== "object" || Array.isArray(doc.authority)) {
    throw new CustomerBeaconValidationError("authority must be an object");
  }
  const authorityRaw = doc.authority as Record<string, unknown>;
  if (authorityRaw.operatorRetainsExecutionAuthority !== true) {
    throw new CustomerBeaconValidationError("authority.operatorRetainsExecutionAuthority must be true");
  }
  if (authorityRaw.councilAuthority !== "advisory-only") {
    throw new CustomerBeaconValidationError('authority.councilAuthority must be "advisory-only"');
  }
  if (authorityRaw.agentExecutionRequiresApproval !== true) {
    throw new CustomerBeaconValidationError("authority.agentExecutionRequiresApproval must be true");
  }

  if (!doc.agentRules || typeof doc.agentRules !== "object" || Array.isArray(doc.agentRules)) {
    throw new CustomerBeaconValidationError("agentRules must be an object");
  }
  const rules = doc.agentRules as Record<string, unknown>;
  for (const key of [
    "mustLoadAtInitialization",
    "mustReferenceBeacon",
    "mustEscalateDeviation",
    "mustAlignSuggestions",
  ] as const) {
    if (rules[key] !== true) {
      throw new CustomerBeaconValidationError(`agentRules.${key} must be true`);
    }
  }

  if (!doc.autonomy || typeof doc.autonomy !== "object" || Array.isArray(doc.autonomy)) {
    throw new CustomerBeaconValidationError("autonomy must be an object");
  }
  const autonomy = doc.autonomy as Record<string, unknown>;
  if (autonomy.mutationAllowed !== false) {
    throw new CustomerBeaconValidationError("autonomy.mutationAllowed must be false");
  }
  if (autonomy.operatorApprovalRequired !== true) {
    throw new CustomerBeaconValidationError("autonomy.operatorApprovalRequired must be true");
  }
  if (
    typeof autonomy.maxRecursionDepth !== "number" ||
    !Number.isInteger(autonomy.maxRecursionDepth) ||
    autonomy.maxRecursionDepth < 0 ||
    autonomy.maxRecursionDepth > 16
  ) {
    throw new CustomerBeaconValidationError("autonomy.maxRecursionDepth must be an integer between 0 and 16");
  }
  const terminationConditions = assertStringArray(
    autonomy.terminationConditions,
    "autonomy.terminationConditions",
    1,
    16,
  );
  const escalationConditions = assertStringArray(
    autonomy.escalationConditions,
    "autonomy.escalationConditions",
    1,
    16,
  );

  let governanceSources: CustomerBeaconDocument["governanceSources"] = [];
  if (doc.governanceSources !== undefined) {
    if (!Array.isArray(doc.governanceSources)) {
      throw new CustomerBeaconValidationError("governanceSources must be an array");
    }
    governanceSources = doc.governanceSources.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new CustomerBeaconValidationError(`governanceSources[${index}] must be an object`);
      }
      const source = entry as Record<string, unknown>;
      return {
        id: assertString(source.id, `governanceSources[${index}].id`, 128),
        type: assertString(source.type, `governanceSources[${index}].type`, 64),
        mutationRights: "none" as const,
        approvalRequired: true as const,
      };
    });
    for (const source of governanceSources) {
      if (source.mutationRights !== "none" || source.approvalRequired !== true) {
        throw new CustomerBeaconValidationError("governance source mutationRights must be none");
      }
    }
  }

  if (!doc.audit || typeof doc.audit !== "object" || Array.isArray(doc.audit)) {
    throw new CustomerBeaconValidationError("audit must be an object");
  }
  const audit = doc.audit as Record<string, unknown>;
  if (audit.hashAlgorithm !== "sha256") {
    throw new CustomerBeaconValidationError('audit.hashAlgorithm must be "sha256"');
  }
  if (audit.proposalLoggingRequired !== true || audit.approvalLoggingRequired !== true) {
    throw new CustomerBeaconValidationError("audit logging flags must be true");
  }

  return {
    version,
    state: "active",
    organization,
    northstar,
    strategicAxis,
    priorities,
    authority: {
      operatorRetainsExecutionAuthority: true,
      councilAuthority: "advisory-only",
      agentExecutionRequiresApproval: true,
    },
    agentRules: {
      mustLoadAtInitialization: true,
      mustReferenceBeacon: true,
      mustEscalateDeviation: true,
      mustAlignSuggestions: true,
    },
    autonomy: {
      mutationAllowed: false,
      operatorApprovalRequired: true,
      maxRecursionDepth: autonomy.maxRecursionDepth as number,
      terminationConditions,
      escalationConditions,
    },
    governanceSources,
    audit: {
      hashAlgorithm: "sha256",
      proposalLoggingRequired: true,
      approvalLoggingRequired: true,
    },
  };
}

export function customerBeaconSchemaJson(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "CustomerNorthstarBeacon",
    type: "object",
    additionalProperties: false,
    required: [
      "version",
      "state",
      "organization",
      "northstar",
      "strategicAxis",
      "priorities",
      "authority",
      "agentRules",
      "autonomy",
      "governanceSources",
      "audit",
    ],
    properties: {
      version: { type: "string", minLength: 1 },
      state: { type: "string", const: "active" },
      organization: { type: "string", minLength: 1 },
      northstar: { type: "string", minLength: 1 },
      strategicAxis: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      priorities: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      authority: {
        type: "object",
        additionalProperties: false,
        required: [
          "operatorRetainsExecutionAuthority",
          "councilAuthority",
          "agentExecutionRequiresApproval",
        ],
        properties: {
          operatorRetainsExecutionAuthority: { type: "boolean", const: true },
          councilAuthority: { type: "string", const: "advisory-only" },
          agentExecutionRequiresApproval: { type: "boolean", const: true },
        },
      },
      agentRules: {
        type: "object",
        additionalProperties: false,
        required: [
          "mustLoadAtInitialization",
          "mustReferenceBeacon",
          "mustEscalateDeviation",
          "mustAlignSuggestions",
        ],
        properties: {
          mustLoadAtInitialization: { type: "boolean", const: true },
          mustReferenceBeacon: { type: "boolean", const: true },
          mustEscalateDeviation: { type: "boolean", const: true },
          mustAlignSuggestions: { type: "boolean", const: true },
        },
      },
      autonomy: {
        type: "object",
        additionalProperties: false,
        required: [
          "mutationAllowed",
          "operatorApprovalRequired",
          "maxRecursionDepth",
          "terminationConditions",
          "escalationConditions",
        ],
        properties: {
          mutationAllowed: { type: "boolean", const: false },
          operatorApprovalRequired: { type: "boolean", const: true },
          maxRecursionDepth: { type: "integer", minimum: 0, maximum: 16 },
          terminationConditions: { type: "array", minItems: 1, items: { type: "string" } },
          escalationConditions: { type: "array", minItems: 1, items: { type: "string" } },
        },
      },
      governanceSources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "type", "mutationRights", "approvalRequired"],
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            mutationRights: { type: "string", const: "none" },
            approvalRequired: { type: "boolean", const: true },
          },
        },
      },
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["hashAlgorithm", "proposalLoggingRequired", "approvalLoggingRequired"],
        properties: {
          hashAlgorithm: { type: "string", const: "sha256" },
          proposalLoggingRequired: { type: "boolean", const: true },
          approvalLoggingRequired: { type: "boolean", const: true },
        },
      },
    },
  };
}
