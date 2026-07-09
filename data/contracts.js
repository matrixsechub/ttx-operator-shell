const MODULE_STATUSES = ["active", "coming_soon", "restricted", "deprecated"];
const MODULE_CTA_LABELS = [
  "VIEW MODULE",
  "GET BRIEF",
  "DEPLOY SCENARIO",
  "GET PACKS",
  "COMING SOON",
  "REQUEST CLEARANCE"
];
const MODULE_ACCESS_LEVELS = ["public", "operator", "restricted"];
const PACKAGE_IDS = [
  "operator-assessment",
  "multi-agent-red-team",
  "ongoing-monitoring"
];
const PACKAGE_FEE_TYPES = ["fixed", "custom", "subscription"];
const DELIVERABLE_IDS = [
  "threat-model-map",
  "remediation-roadmap",
  "attack-narrative",
  "telemetry-guide"
];
const DELIVERABLE_FORMATS = [
  "PDF",
  "VISUAL DIAGRAM",
  "STRUCTURED DATA",
  "EXECUTIVE READABLE",
  "IMPLEMENTATION GUIDE"
];
const DELIVERABLE_DAYS = ["DAY 1", "DAY 3", "DAY 5"];
const IDENTITY_SOURCE_PAGES = ["landing", "marketplace", "packages", "deliverables", "contact"];
const IDENTITY_PACKAGE_INTEREST = [...PACKAGE_IDS, null];
const IDENTITY_URGENCY = ["immediate", "within_30_days", "exploring", null];
const IDENTITY_STATUSES = ["new", "contacted", "qualified", "booked", "engaged", "closed"];

const componentMapping = {
  "hero.html": "landing hero section in public/index.html",
  "operator-profile.html": "operator profile section in public/index.html",
  "marketplace-strip.html": "landing marketplace strip and public/marketplace.html",
  "packages-strip.html": "packages section in public/index.html",
  "deliverables-strip.html": "deliverables section in public/index.html",
  "contact-component.html": "contact section in public/index.html"
};

const deploymentReference = {
  redirects: {
    "/home": "/",
    "/book": "https://calendly.com/mshops",
    "/report": "/marketplace/modules/ai-agent-threat-report"
  },
  headers: {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Deployment": "mshops-v1"
  },
  env: {
    CALENDLY_URL: "https://calendly.com/mshops",
    CONTACT_EMAIL: "matrixsechub@outlook.com",
    API_BASE_URL: "https://api.mshops.net"
  },
  notes: [
    "Workers routing for /api/* remains a separate concern from Pages configuration.",
    "Calendly embeds require frame-src https://calendly.com in a deployed CSP."
  ]
};

module.exports = {
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
  IDENTITY_STATUSES,
  componentMapping,
  deploymentReference
};
