import { OperatorSystemShell } from "../OperatorSystemShell";

export function OperatorHealthMonitor() {
  return (
    <OperatorSystemShell
      codename="SYS-09 // HEALTH MONITOR"
      description="Tracks the health of the harness, engine, and connected systems — system health, not personal health."
    />
  );
}
