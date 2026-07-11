import type { UiUxRouteMetadata, UiUxViewport } from "./prismUiuxTypes";

export const PRISM_FIXTURE_VERSION = "v1";

export type PrismRouteFixture = {
  route: string;
  defaultViewport: UiUxViewport;
  metadata: UiUxRouteMetadata;
  seededFinding: {
    category: import("./prismUiuxTypes").UiUxFindingCategory;
    severity: import("./prismUiuxTypes").UiUxFindingSeverity;
    userImpact: string;
    recommendation: string;
    implementationHint: string;
    acceptanceCriteria: string[];
  };
};

export const PRISM_ROUTE_FIXTURES: PrismRouteFixture[] = [
  {
    route: "/",
    defaultViewport: "mobile",
    metadata: {
      route: "/",
      title: "Homepage",
      touchTargetMinPx: 36,
      ctaCount: 4,
      usesOpPanel: true,
      usesOpAccent: true,
      usesMonospace: true,
      focusVisible: false,
    },
    seededFinding: {
      category: "responsive",
      severity: "high",
      userImpact: "Mobile users struggle to tap navigation items without mis-taps.",
      recommendation: "Increase nav touch targets to at least 44px and add spacing between items.",
      implementationHint: "Apply min-h-11 min-w-11 and gap-3 on mobile nav links in the homepage shell.",
      acceptanceCriteria: [
        "All primary nav items meet 44x44px minimum on mobile viewports.",
        "No overlapping nav labels at 320px width.",
        "Focus ring visible on keyboard navigation.",
      ],
    },
  },
  {
    route: "/services",
    defaultViewport: "desktop",
    metadata: {
      route: "/services",
      title: "Services",
      ctaCount: 3,
      usesOpPanel: true,
      usesOpAccent: true,
      hasLoadingState: true,
      hasEmptyState: false,
    },
    seededFinding: {
      category: "visual_hierarchy",
      severity: "medium",
      userImpact: "Primary service CTA competes with secondary links.",
      recommendation: "Elevate the primary service CTA with accent styling and top placement.",
      implementationHint: "Use op-panel-raised for the hero CTA card and demote secondary links to text-dim.",
      acceptanceCriteria: [
        "One visually dominant primary CTA above the fold.",
        "Secondary actions use lower-contrast styling.",
      ],
    },
  },
  {
    route: "/enter",
    defaultViewport: "mobile",
    metadata: {
      route: "/enter",
      title: "Enter",
      formFieldCount: 5,
      labelAssociated: false,
      hasErrorState: true,
      hasSuccessState: true,
    },
    seededFinding: {
      category: "accessibility",
      severity: "high",
      userImpact: "Screen reader users cannot reliably associate labels with form fields.",
      recommendation: "Associate every input with a visible label via htmlFor/id pairs.",
      implementationHint: "Wrap inputs in labeled field groups; avoid placeholder-only labels.",
      acceptanceCriteria: [
        "Each input has a programmatically associated label.",
        "Error messages are linked with aria-describedby.",
      ],
    },
  },
  {
    route: "/register",
    defaultViewport: "mobile",
    metadata: {
      route: "/register",
      title: "Register",
      stepCount: 3,
      formFieldCount: 8,
      hasLoadingState: true,
    },
    seededFinding: {
      category: "usability",
      severity: "medium",
      userImpact: "Users cannot tell how many registration steps remain.",
      recommendation: "Add a visible step indicator with current step and total.",
      implementationHint: "Render a 3-step progress bar with aria-current on the active step.",
      acceptanceCriteria: [
        "Step indicator shows current and total steps.",
        "Progress is announced to assistive technology.",
      ],
    },
  },
  {
    route: "/intake",
    defaultViewport: "desktop",
    metadata: {
      route: "/intake",
      title: "Intake",
      stepCount: 4,
      formFieldCount: 12,
      hasErrorState: true,
      hasEmptyState: false,
    },
    seededFinding: {
      category: "usability",
      severity: "medium",
      userImpact: "Multi-step intake flow lacks clear section headings.",
      recommendation: "Add section headings and brief instructions per intake step.",
      implementationHint: "Use h2 per step with op-panel sections and summary text.",
      acceptanceCriteria: [
        "Each step has a descriptive heading.",
        "Users can understand required fields before submitting.",
      ],
    },
  },
  {
    route: "/status",
    defaultViewport: "mobile",
    metadata: {
      route: "/status",
      title: "Status",
      hasEmptyState: false,
      hasErrorState: true,
      hasLoadingState: true,
    },
    seededFinding: {
      category: "feedback_states",
      severity: "low",
      userImpact: "Empty status results show a generic message without next steps.",
      recommendation: "Provide an actionable empty state with guidance and a primary CTA.",
      implementationHint: "Add empty-state copy with link to /enter or /intake.",
      acceptanceCriteria: [
        "Empty state explains why no data is shown.",
        "Empty state includes a clear next action.",
      ],
    },
  },
  {
    route: "/apps/automation-builder",
    defaultViewport: "mobile",
    metadata: {
      route: "/apps/automation-builder",
      title: "Automation Builder",
      ctaCount: 6,
      tableColumnCount: 4,
      horizontalScrollRequired: true,
      usesOpPanel: true,
    },
    seededFinding: {
      category: "responsive",
      severity: "high",
      userImpact: "Control panel is dense on mobile; key actions are hard to reach.",
      recommendation: "Collapse secondary controls into a drawer and prioritize primary actions.",
      implementationHint: "Stack toolbars vertically on sm breakpoint; move advanced options behind a panel toggle.",
      acceptanceCriteria: [
        "Primary builder actions reachable without horizontal scroll at 375px.",
        "Secondary controls accessible via explicit toggle.",
      ],
    },
  },
  {
    route: "/apps/security-fleet",
    defaultViewport: "tablet",
    metadata: {
      route: "/apps/security-fleet",
      title: "Security Fleet",
      tableColumnCount: 6,
      horizontalScrollRequired: true,
      hasLoadingState: true,
    },
    seededFinding: {
      category: "responsive",
      severity: "medium",
      userImpact: "Wide data table forces horizontal scrolling on tablet viewports.",
      recommendation: "Responsive column prioritization or card layout for narrow viewports.",
      implementationHint: "Hide non-critical columns below lg; provide expandable row details.",
      acceptanceCriteria: [
        "Critical fleet columns visible without horizontal scroll on tablet.",
        "Full detail available via row expansion.",
      ],
    },
  },
];

export function getFixtureForRoute(route: string): PrismRouteFixture | undefined {
  const normalized = route.replace(/\/$/, "") || "/";
  return PRISM_ROUTE_FIXTURES.find((f) => f.route === normalized);
}

export function resolveFixtureMetadata(routes: string[]): UiUxRouteMetadata[] {
  return routes
    .map((route) => getFixtureForRoute(route))
    .filter((f): f is PrismRouteFixture => f !== undefined)
    .map((f) => f.metadata);
}
