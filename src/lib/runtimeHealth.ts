export type RuntimeHealthState = "HEALTHY" | "WATCH" | "DEGRADED" | "CRITICAL" | "HALTED";

export function toneForRuntimeHealth(state: RuntimeHealthState): "ok" | "warn" | "danger" {
  if (state === "HEALTHY") return "ok";
  if (state === "WATCH") return "warn";
  return "danger";
}

export function labelForRuntimeHealth(state: RuntimeHealthState): string {
  switch (state) {
    case "HEALTHY":
      return "Healthy";
    case "WATCH":
      return "Watch";
    case "DEGRADED":
      return "Degraded";
    case "CRITICAL":
      return "Critical";
    case "HALTED":
      return "Halted";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
