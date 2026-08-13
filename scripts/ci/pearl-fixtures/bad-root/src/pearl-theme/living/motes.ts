// BAD Living TS: setInterval with no clearInterval + motes without a cap (L3);
// pointer coordinates shipped to a network sink (L5).
export function startMotes(host: HTMLElement) {
  setInterval(() => {
    const mote = document.createElement("span");
    mote.className = "pearl-mote";
    host.appendChild(mote);
  }, 1000);
}

export function reportPointer(e: PointerEvent) {
  fetch("/collect", { method: "POST", body: JSON.stringify({ x: e.clientX, y: e.clientY }) });
}
