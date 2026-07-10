export const PUBLIC_CAPTURE_ROUTES = [
  "/",
  "/services",
  "/enter",
  "/register",
  "/intake",
  "/status",
  "/apps/automation-builder",
  "/apps/security-fleet",
] as const;

export const OPERATOR_CAPTURE_ROUTES = ["/operator/uiux-expert"] as const;

export type CaptureViewportName = "mobile" | "tablet" | "desktop";

export const VIEWPORT_PRESETS: Record<
  CaptureViewportName,
  { width: number; height: number; deviceScaleFactor: number }
> = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 2 },
  desktop: { width: 1280, height: 720, deviceScaleFactor: 1 },
};

export const MAX_FOCUS_STEPS = 15;
