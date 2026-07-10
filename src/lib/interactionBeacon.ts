type InteractionSignal =
  | "pointer_move"
  | "pointer_click"
  | "keyboard_activity"
  | "scroll_depth"
  | "focus_duration";

const SESSION_SIGNALS_KEY = "msh_interaction_signals";

const SIGNAL_HANDLERS: Array<{ signal: InteractionSignal; once: boolean }> = [
  { signal: "pointer_move", once: true },
  { signal: "pointer_click", once: true },
  { signal: "keyboard_activity", once: true },
  { signal: "scroll_depth", once: true },
  { signal: "focus_duration", once: true },
];

function getSessionId(): string | null {
  try {
    return localStorage.getItem("msh_session");
  } catch {
    return null;
  }
}

function hasSentSignal(signal: InteractionSignal): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_SIGNALS_KEY);
    const sent = raw ? (JSON.parse(raw) as string[]) : [];
    return sent.includes(signal);
  } catch {
    return false;
  }
}

function markSignalSent(signal: InteractionSignal): void {
  try {
    const raw = sessionStorage.getItem(SESSION_SIGNALS_KEY);
    const sent = raw ? (JSON.parse(raw) as string[]) : [];
    if (!sent.includes(signal)) {
      sent.push(signal);
      sessionStorage.setItem(SESSION_SIGNALS_KEY, JSON.stringify(sent));
    }
  } catch {
    // ignore
  }
}

function sendInteractionSignal(signal: InteractionSignal): void {
  const sessionId = getSessionId();
  if (!sessionId) return;
  if (hasSentSignal(signal)) return;

  void fetch("/api/traffic/interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, signal, timestamp: new Date().toISOString() }),
    keepalive: true,
  })
    .then(() => markSignalSent(signal))
    .catch(() => {});
}

let listenersAttached = false;

/** Passive interaction listeners — no coordinates, no key content. */
export function attachInteractionBeacon(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  let scrollFired = false;
  let focusStart: number | null = null;

  window.addEventListener(
    "pointermove",
    () => sendInteractionSignal("pointer_move"),
    { passive: true, once: true },
  );

  window.addEventListener(
    "click",
    () => sendInteractionSignal("pointer_click"),
    { passive: true, once: true },
  );

  window.addEventListener(
    "keydown",
    () => sendInteractionSignal("keyboard_activity"),
    { passive: true, once: true },
  );

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFired) return;
      if (window.scrollY > 120) {
        scrollFired = true;
        sendInteractionSignal("scroll_depth");
      }
    },
    { passive: true },
  );

  window.addEventListener("focus", () => {
    focusStart = Date.now();
  });

  window.addEventListener("blur", () => {
    if (focusStart && Date.now() - focusStart >= 3000) {
      sendInteractionSignal("focus_duration");
    }
    focusStart = null;
  });

  for (const { signal } of SIGNAL_HANDLERS) {
    void signal;
  }
}
