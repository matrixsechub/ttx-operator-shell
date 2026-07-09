import contracts from "./contracts.js";

const {
  MODULE_STATUSES,
  MODULE_CTA_LABELS,
  MODULE_ACCESS_LEVELS,
  PACKAGE_IDS,
  PACKAGE_FEE_TYPES,
  DELIVERABLE_IDS,
  DELIVERABLE_FORMATS,
  DELIVERABLE_DAYS,
  IDENTITY_SOURCE_PAGES,
  IDENTITY_PACKAGE_INTEREST,
  IDENTITY_URGENCY,
  IDENTITY_STATUSES
} = contracts;

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MODULE_ID = /^[a-z0-9-]+$/;
const MODULE_NUM = /^0[1-9]$/;
const TAG_VALUE = /^[A-Z0-9_]+$/;
const DELIVERABLE_NUM = /^0[1-4]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value, field, minLength = 1, maxLength = Infinity) {
  assert(typeof value === "string", `${field} must be a string`);
  assert(value.length >= minLength, `${field} must be at least ${minLength} characters`);
  assert(value.length <= maxLength, `${field} must be at most ${maxLength} characters`);
}

function assertOptionalString(value, field, maxLength = Infinity) {
  if (value == null) {
    return;
  }

  assertString(value, field, 0, maxLength);
}

function assertArray(value, field, minItems = 0, maxItems = Infinity) {
  assert(Array.isArray(value), `${field} must be an array`);
  assert(value.length >= minItems, `${field} must include at least ${minItems} item(s)`);
  assert(value.length <= maxItems, `${field} must include at most ${maxItems} item(s)`);
}

function assertEnum(value, field, validValues) {
  assert(validValues.includes(value), `${field} must be one of: ${validValues.join(", ")}`);
}

function assertOptionalEnum(value, field, validValues) {
  if (value === undefined) {
    return;
  }

  assertEnum(value, field, validValues);
}

function assertDateTime(value, field) {
  assertString(value, field);
  assert(ISO_DATE_TIME.test(value), `${field} must be an ISO 8601 UTC date-time`);
}

function assertOptionalDateTime(value, field) {
  if (value === undefined) {
    return;
  }

  assertDateTime(value, field);
}

function assertUriReference(value, field) {
  assertString(value, field);
  assert(/^(?:\/|https?:\/\/|mailto:)/i.test(value), `${field} must be a uri-reference`);
}

function assertOptionalUriReference(value, field) {
  if (value == null) {
    return;
  }

  assertUriReference(value, field);
}

function validateModuleRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "module record must be an object");
  assertString(record.id, "module.id");
  assert(MODULE_ID.test(record.id), "module.id must be a lowercase slug");
  assertString(record.num, "module.num");
  assert(MODULE_NUM.test(record.num), "module.num must be a two-digit module number");
  assertString(record.title, "module.title", 3, 80);
  assertString(record.description, "module.description", 10, 500);
  assertOptionalString(record.long_description, "module.long_description");
  assertEnum(record.status, "module.status", MODULE_STATUSES);
  assertArray(record.tags, "module.tags", 1, 8);
  record.tags.forEach((tag, index) => {
    assertString(tag, `module.tags[${index}]`);
    assert(TAG_VALUE.test(tag), `module.tags[${index}] must be uppercase and underscore-safe`);
  });
  assertEnum(record.cta_label, "module.cta_label", MODULE_CTA_LABELS);
  assertOptionalUriReference(record.cta_href, "module.cta_href");
  assertOptionalUriReference(record.thumbnail_url, "module.thumbnail_url");
  assertOptionalUriReference(record.icon_url, "module.icon_url");
  assertEnum(record.access_level, "module.access_level", MODULE_ACCESS_LEVELS);

  if (record.access_instructions !== undefined) {
    assertArray(record.access_instructions, "module.access_instructions", 0, 6);
    record.access_instructions.forEach((line, index) => assertString(line, `module.access_instructions[${index}]`));
  }

  if (record.features !== undefined) {
    assertArray(record.features, "module.features", 0, 12);
    record.features.forEach((line, index) => assertString(line, `module.features[${index}]`));
  }

  assertOptionalDateTime(record.created_at, "module.created_at");
  assertOptionalDateTime(record.updated_at, "module.updated_at");
  return record;
}

function validatePackageRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "package record must be an object");
  assertEnum(record.id, "package.id", PACKAGE_IDS);
  assertString(record.title, "package.title", 1, 80);
  assertString(record.subtitle, "package.subtitle", 1, 120);
  assertEnum(record.fee_type, "package.fee_type", PACKAGE_FEE_TYPES);
  assertString(record.description, "package.description", 20, 600);
  assertArray(record.outcomes, "package.outcomes", 1, 8);
  assertArray(record.scope, "package.scope", 1, 8);
  record.outcomes.forEach((line, index) => assertString(line, `package.outcomes[${index}]`));
  record.scope.forEach((line, index) => assertString(line, `package.scope[${index}]`));
  assertString(record.cta_label, "package.cta_label");

  if (record.is_flagship !== undefined) {
    assert(typeof record.is_flagship === "boolean", "package.is_flagship must be a boolean");
  }

  if (record.accent_color !== undefined) {
    assertString(record.accent_color, "package.accent_color");
    assert(HEX_COLOR.test(record.accent_color), "package.accent_color must be a hex color");
  }

  if (record.available !== undefined) {
    assert(typeof record.available === "boolean", "package.available must be a boolean");
  }

  if (record.display_order !== undefined) {
    assert(Number.isInteger(record.display_order), "package.display_order must be an integer");
    assert(record.display_order >= 1 && record.display_order <= 10, "package.display_order must be between 1 and 10");
  }

  assertOptionalDateTime(record.created_at, "package.created_at");
  return record;
}

function validateDeliverableRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "deliverable record must be an object");
  assertEnum(record.id, "deliverable.id", DELIVERABLE_IDS);
  assertString(record.artifact_num, "deliverable.artifact_num");
  assert(DELIVERABLE_NUM.test(record.artifact_num), "deliverable.artifact_num must be a two-digit artifact number");
  assertString(record.title, "deliverable.title");
  assertString(record.description, "deliverable.description");
  assertArray(record.formats, "deliverable.formats", 1);
  record.formats.forEach((format, index) => assertEnum(format, `deliverable.formats[${index}]`, DELIVERABLE_FORMATS));
  assertEnum(record.delivery_day, "deliverable.delivery_day", DELIVERABLE_DAYS);
  assertOptionalUriReference(record.thumbnail_url, "deliverable.thumbnail_url");
  assertOptionalUriReference(record.sample_url, "deliverable.sample_url");
  assertOptionalString(record.icon_symbol, "deliverable.icon_symbol", 4);

  if (record.accent_color !== undefined) {
    assertString(record.accent_color, "deliverable.accent_color");
    assert(HEX_COLOR.test(record.accent_color), "deliverable.accent_color must be a hex color");
  }

  if (record.display_order !== undefined) {
    assert(Number.isInteger(record.display_order), "deliverable.display_order must be an integer");
    assert(record.display_order >= 1 && record.display_order <= 4, "deliverable.display_order must be between 1 and 4");
  }

  return record;
}

function validateIdentityRecord(record) {
  assert(record && typeof record === "object" && !Array.isArray(record), "identity record must be an object");

  if (record.id !== undefined) {
    assertString(record.id, "identity.id");
    assert(UUID.test(record.id), "identity.id must be a UUID");
  }

  assertString(record.operator_handle, "identity.operator_handle", 1, 120);

  if (record.organization !== undefined && record.organization !== null) {
    assertString(record.organization, "identity.organization", 0, 200);
  }

  assertString(record.contact_email, "identity.contact_email");
  assert(EMAIL.test(record.contact_email), "identity.contact_email must be an email");
  assertString(record.transmission, "identity.transmission", 1, 2000);
  assertOptionalEnum(record.source_page, "identity.source_page", IDENTITY_SOURCE_PAGES);
  assertOptionalEnum(record.package_interest, "identity.package_interest", IDENTITY_PACKAGE_INTEREST);

  if (record.module_interest !== undefined && record.module_interest !== null) {
    assertString(record.module_interest, "identity.module_interest");
  }

  assertOptionalEnum(record.urgency, "identity.urgency", IDENTITY_URGENCY);

  if (record.utm_source !== undefined && record.utm_source !== null) {
    assertString(record.utm_source, "identity.utm_source");
  }

  if (record.utm_medium !== undefined && record.utm_medium !== null) {
    assertString(record.utm_medium, "identity.utm_medium");
  }

  if (record.auto_reply_sent !== undefined) {
    assert(typeof record.auto_reply_sent === "boolean", "identity.auto_reply_sent must be a boolean");
  }

  assertOptionalDateTime(record.contacted_at, "identity.contacted_at");

  if (record.ip_address !== undefined && record.ip_address !== null) {
    assertString(record.ip_address, "identity.ip_address");
  }

  assertOptionalEnum(record.status, "identity.status", IDENTITY_STATUSES);
  return record;
}

function validateCollection(records, validator, label) {
  return records.map((record, index) => {
    try {
      return validator(record);
    } catch (error) {
      error.message = `${label}[${index}] ${error.message}`;
      throw error;
    }
  });
}

export default {
  validateModuleRecord,
  validatePackageRecord,
  validateDeliverableRecord,
  validateIdentityRecord,
  validateCollection
};
