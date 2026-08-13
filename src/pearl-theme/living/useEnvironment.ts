/**
 * PEARL LIVING LAYER — environment hooks
 * ---------------------------------------------------------------------------
 * Reactive detectors that gate whether decorative motion may run:
 *   useReducedMotion     — honors `prefers-reduced-motion: reduce`
 *   useDocumentVisibility — pauses when the tab is hidden
 *   useInView            — pauses when the surface is scrolled offscreen
 *
 * These NEVER activate motion; they only report. The provider composes them
 * into the single `shouldAnimate` gate. Each detector cleans up its listener/
 * observer on unmount and is safe under React Strict Mode double-invocation.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import { diagnostics } from "./diagnostics";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True when the user requests reduced motion. The media-query listener exists
 * only to detect a *future* preference change; it must not activate decorative
 * behavior while reduction is enabled (the provider's gate handles that).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(REDUCE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(REDUCE_QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    diagnostics.listenerAdd();
    return () => {
      mql.removeEventListener("change", onChange);
      diagnostics.listenerRemove();
    };
  }, []);

  return reduced;
}

/** True while the document is visible; false when the tab is hidden. */
export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    diagnostics.listenerAdd();
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      diagnostics.listenerRemove();
    };
  }, []);

  return visible;
}

/**
 * True while the referenced element intersects the viewport. If the platform
 * has no IntersectionObserver (e.g. jsdom without a polyfill), it degrades to
 * "in view" so the static content is never withheld.
 */
export function useInView(ref: RefObject<Element | null>, rootMargin = "0px"): boolean {
  const [inView, setInView] = useState<boolean>(true);
  const marginRef = useRef(rootMargin);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin: marginRef.current, threshold: 0 },
    );
    observer.observe(el);
    diagnostics.observerAdd();
    return () => {
      observer.disconnect();
      diagnostics.observerRemove();
    };
  }, [ref]);

  return inView;
}
