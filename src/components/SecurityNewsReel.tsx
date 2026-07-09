import { useCallback, useEffect, useRef, useState } from "react";
import { newsReelService } from "../lib/newsReelService";
import { useApiResource } from "../lib/useApiResource";
import type { NewsReelItem } from "../lib/newsReelTypes";

const AUTO_SCROLL_MS = 7000;
const GAP_PX = 16;

function getVisibleCount(width: number): number {
  if (width < 768) return 1;
  if (width < 1024) return 2;
  return 3;
}

function categoryLabel(category: NewsReelItem["category"]): string {
  switch (category) {
    case "cloud":
      return "Cloud";
    case "ai":
      return "AI";
    case "security":
      return "Security";
    case "ecosystem":
      return "Ecosystem";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

interface SecurityNewsReelProps {
  className?: string;
  compact?: boolean;
}

export function SecurityNewsReel({ className, compact }: SecurityNewsReelProps) {
  const { result, loading } = useApiResource(newsReelService.fetchNewsReel);
  const items = result?.ok ? result.data.items : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [stepPx, setStepPx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const maxIndex = Math.max(0, items.length - visibleCount);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setCurrentIndex((idx) => Math.min(idx, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = () => {
      const width = wrapper.offsetWidth;
      const count = getVisibleCount(window.innerWidth);
      setVisibleCount(count);
      const cardWidth = (width - GAP_PX * (count - 1)) / count;
      setStepPx(cardWidth + GAP_PX);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((idx) => (idx >= maxIndex ? 0 : idx + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((idx) => (idx <= 0 ? maxIndex : idx - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (items.length === 0 || paused || reducedMotion) return;
    const id = window.setInterval(goNext, AUTO_SCROLL_MS);
    return () => window.clearInterval(id);
  }, [items.length, paused, reducedMotion, goNext]);

  function handleCardClick(item: NewsReelItem) {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  }

  function handleNav(direction: "prev" | "next") {
    if (direction === "prev") goPrev();
    else goNext();
    setPaused(false);
  }

  const reelClass = ["news-reel", compact ? "news-reel--compact" : "", className].filter(Boolean).join(" ");

  if (loading) {
    return (
      <section className={reelClass} aria-label="Security news reel" aria-busy="true">
        <header className="news-reel__header">
          <h2 className="news-reel__title">Security News Reel</h2>
        </header>
        <div className="news-reel__skeleton" aria-hidden="true">
          <div className="news-reel__skeleton-card" />
          <div className="news-reel__skeleton-card" />
          <div className="news-reel__skeleton-card" />
        </div>
      </section>
    );
  }

  if (!result?.ok) {
    return (
      <section className={reelClass} aria-label="Security news reel">
        <header className="news-reel__header">
          <h2 className="news-reel__title">Security News Reel</h2>
        </header>
        <p className="news-reel__error">Signal feed unavailable — {result?.error ?? "unknown error"}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={reelClass} aria-label="Security news reel">
        <header className="news-reel__header">
          <h2 className="news-reel__title">Security News Reel</h2>
        </header>
        <p className="news-reel__empty">No security briefings available at this time.</p>
      </section>
    );
  }

  return (
    <section className={reelClass} aria-label="Security news reel">
      <header className="news-reel__header">
        <h2 className="news-reel__title">Security News Reel</h2>
        <span className="news-reel__hint">Tap for details</span>
      </header>

      <div
        className="news-reel__viewport"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setPaused(false);
          }
        }}
      >
        <button
          type="button"
          className="news-reel__nav news-reel__nav--prev"
          aria-label="Previous briefing"
          disabled={items.length <= visibleCount}
          onClick={() => handleNav("prev")}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="news-reel__track-wrapper" ref={wrapperRef}>
          <div
            className="news-reel__track"
            style={{
              transform: stepPx > 0 ? `translateX(-${currentIndex * stepPx}px)` : undefined,
            }}
          >
            {items.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const isActive = index >= currentIndex && index < currentIndex + visibleCount;
              return (
                <article
                  key={item.id}
                  className={[
                    "news-reel-card",
                    isActive ? "news-reel-card--active" : "",
                    isExpanded ? "news-reel-card--expanded" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleCardClick(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCardClick(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                >
                  <img className="news-reel-card__image" src={item.image} alt="" loading="lazy" />
                  <div className="news-reel-card__body">
                    <span className="public-chip news-reel-card__category">{categoryLabel(item.category)}</span>
                    <h3 className="news-reel-card__title">{item.title}</h3>
                    <p className="news-reel-card__summary">{item.summary}</p>
                    <span className="news-reel-card__tap-hint">
                      {isExpanded ? "Tap to collapse" : "Tap for details"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="news-reel__nav news-reel__nav--next"
          aria-label="Next briefing"
          disabled={items.length <= visibleCount}
          onClick={() => handleNav("next")}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
