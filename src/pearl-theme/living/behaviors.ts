/**
 * PEARL LIVING LAYER — behavior hooks
 * ---------------------------------------------------------------------------
 * The JS-driven, pointer/transient decorative behaviors. Ambient loops (orb
 * pulses, tide, fog, sparkline breathing) are pure CSS in living.css — these
 * hooks cover only what genuinely needs script:
 *   usePointerHalo       — cursor iridescence (→ CSS custom props, rAF)
 *   usePanelParallax     — glass-panel tilt (≤2°, coarse-pointer disabled)
 *   useGoldRipple        — bounded click ripple on the governance button
 *   useGhostMotes        — bounded rising motes (hard cap MOTION_POLICY.maxMotes)
 *   useValueHeartbeat    — a single beat, fired ONLY when a value changes
 *
 * INVARIANTS enforced here:
 *   - Nothing binds/spawns unless `enabled` (the provider's shouldAnimate gate).
 *   - Every effect fully tears down listeners/frames/timers/nodes on cleanup,
 *     and is Strict-Mode double-invoke safe.
 *   - Pointer coordinates are written to CSS custom properties only — never
 *     emitted to telemetry or the network.
 *   - Amplitudes are clamped to MOTION_POLICY (tilt ≤2°, translate ≤3px).
 */

import { useEffect, useRef, type RefObject } from "react";
import { MOTION_POLICY, clamp, isCoarsePointer } from "./policy";
import { subscribeFrame } from "./rafCoordinator";
import { diagnostics } from "./diagnostics";

/** Cursor-reactive iridescence: a soft halo tracking the pointer over `root`. */
export function usePointerHalo(root: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const el = root.current;
    if (!enabled || !el || isCoarsePointer()) return;

    diagnostics.engineUp("pointer-halo");
    let px = 0;
    let py = 0;
    let dirty = false;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
      dirty = true;
    };
    const onLeave = () => {
      dirty = true;
      px = -9999;
      py = -9999;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    diagnostics.listenerAdd();
    diagnostics.listenerAdd();

    const unsub = subscribeFrame(() => {
      if (!dirty) return;
      dirty = false;
      el.style.setProperty("--px", `${px}px`);
      el.style.setProperty("--py", `${py}px`);
      el.style.setProperty("--halo-op", px < 0 ? "0" : "1");
    });

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      diagnostics.listenerRemove();
      diagnostics.listenerRemove();
      unsub();
      el.style.removeProperty("--px");
      el.style.removeProperty("--py");
      el.style.removeProperty("--halo-op");
      diagnostics.engineDown("pointer-halo");
      diagnostics.cleanup();
    };
  }, [root, enabled]);
}

/** Glass-panel parallax tilt bounded to ±MOTION_POLICY.tiltMaxDeg. */
export function usePanelParallax(target: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const el = target.current;
    if (!enabled || !el || isCoarsePointer()) return;

    diagnostics.engineUp("panel-parallax");
    let tx = 0;
    let ty = 0;
    let dirty = false;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      // rotateY follows horizontal, rotateX follows (inverted) vertical.
      ty = clamp(nx * 2 * MOTION_POLICY.tiltMaxDeg, -MOTION_POLICY.tiltMaxDeg, MOTION_POLICY.tiltMaxDeg);
      tx = clamp(-ny * 2 * MOTION_POLICY.tiltMaxDeg, -MOTION_POLICY.tiltMaxDeg, MOTION_POLICY.tiltMaxDeg);
      dirty = true;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      dirty = true;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    diagnostics.listenerAdd();
    diagnostics.listenerAdd();

    const unsub = subscribeFrame(() => {
      if (!dirty) return;
      dirty = false;
      el.style.setProperty("--tilt-x", `${tx.toFixed(3)}deg`);
      el.style.setProperty("--tilt-y", `${ty.toFixed(3)}deg`);
    });

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      diagnostics.listenerRemove();
      diagnostics.listenerRemove();
      unsub();
      el.style.removeProperty("--tilt-x");
      el.style.removeProperty("--tilt-y");
      diagnostics.engineDown("panel-parallax");
      diagnostics.cleanup();
    };
  }, [target, enabled]);
}

/** Bounded warm-light ripple on click; each ripple node is removed after its run. */
export function useGoldRipple(target: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const host = target.current;
    if (!enabled || !host) return;

    diagnostics.engineUp("gold-ripple");
    const button = host.matches?.("button") ? host : host.querySelector("button") ?? host;
    const pending = new Set<{ node: HTMLElement; timer: ReturnType<typeof setTimeout> }>();

    const onClick = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const node = document.createElement("span");
      node.className = "pearl-ripple";
      node.setAttribute("aria-hidden", "true");
      node.style.left = `${e.clientX - rect.left}px`;
      node.style.top = `${e.clientY - rect.top}px`;
      button.appendChild(node);
      diagnostics.nodeAdd();
      const rec = {
        node,
        timer: setTimeout(() => {
          node.remove();
          diagnostics.nodeRemove();
          diagnostics.timerDown();
          pending.delete(rec);
        }, 700),
      };
      diagnostics.timerUp();
      pending.add(rec);
    };

    button.addEventListener("click", onClick);
    diagnostics.listenerAdd();

    return () => {
      button.removeEventListener("click", onClick);
      diagnostics.listenerRemove();
      for (const rec of pending) {
        clearTimeout(rec.timer);
        rec.node.remove();
        diagnostics.nodeRemove();
        diagnostics.timerDown();
      }
      pending.clear();
      diagnostics.engineDown("gold-ripple");
      diagnostics.cleanup();
    };
  }, [target, enabled]);
}

/** Bounded ghost motes rising within `host`; hard cap MOTION_POLICY.maxMotes. */
export function useGhostMotes(host: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const el = host.current;
    if (!enabled || !el) return;

    diagnostics.engineUp("ghost-motes");
    const live = new Set<HTMLElement>();

    const spawn = () => {
      if (live.size >= MOTION_POLICY.maxMotes) return; // hard cap
      const mote = document.createElement("span");
      mote.className = "pearl-mote";
      mote.setAttribute("aria-hidden", "true");
      const dur = 18 + Math.random() * 16; // 18–34s
      mote.style.left = `${Math.random() * 100}%`;
      mote.style.setProperty("--mote-dur", `${dur.toFixed(2)}s`);
      mote.style.setProperty("--mote-alpha", (0.15 + Math.random() * 0.25).toFixed(3));
      const remove = () => {
        mote.remove();
        if (live.delete(mote)) diagnostics.moteRemove();
      };
      mote.addEventListener("animationend", remove, { once: true });
      el.appendChild(mote);
      live.add(mote);
      diagnostics.moteAdd();
    };

    // Seed a few, then top up on a single bounded interval (never recursive).
    for (let i = 0; i < 6; i++) spawn();
    const interval = setInterval(spawn, 2400);
    diagnostics.timerUp();

    return () => {
      clearInterval(interval);
      diagnostics.timerDown();
      for (const mote of live) {
        mote.remove();
        diagnostics.moteRemove();
      }
      live.clear();
      diagnostics.engineDown("ghost-motes");
      diagnostics.cleanup();
    };
  }, [host, enabled]);
}

/**
 * Value heartbeat: adds the `pearl-beat` class for one animation cycle, but
 * ONLY when `value` actually changes between renders — never on a timer. Under
 * reduced motion (`enabled` false) the change is acknowledged silently with no
 * beat, so the value is still updated but nothing animates.
 */
export function useValueHeartbeat(
  target: RefObject<HTMLElement | null>,
  value: number,
  enabled: boolean,
): void {
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    const el = target.current;
    if (!enabled || !el) return;
    el.classList.add("pearl-beat");
    diagnostics.timerUp();
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      diagnostics.timerDown();
    };
    const timer = setTimeout(() => {
      el.classList.remove("pearl-beat");
      settle();
    }, 950);
    return () => {
      clearTimeout(timer);
      el.classList.remove("pearl-beat");
      settle();
    };
  }, [target, value, enabled]);
}
