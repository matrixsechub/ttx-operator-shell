// Clean Living TS fixture: bounded motes, matched clearInterval, no pointer telemetry.
const maxMotes = 16;

export function startMotes(host: HTMLElement) {
  let live = 0;
  const spawn = () => {
    if (live >= maxMotes) return;
    const mote = document.createElement("span");
    mote.className = "pearl-mote";
    host.appendChild(mote);
    live += 1;
  };
  const id = setInterval(spawn, 2400);
  return () => clearInterval(id);
}
