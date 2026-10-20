"use client";

import React from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import {Button, cn} from "@heroui/react";

import {
  GOOGLE_RATING,
  GOOGLE_REVIEW_COUNT,
  GOOGLE_REVIEWS_URL,
  googleReviews,
  type GoogleReview,
} from "./google-reviews";

export type ReviewsCarouselProps = {
  reviews?: GoogleReview[];
  intervalMs?: number;
  className?: string;
};

const slideVariants = {
  enter: (direction: number) => ({x: direction > 0 ? 40 : -40, opacity: 0}),
  center: {x: 0, opacity: 1},
  exit: (direction: number) => ({x: direction > 0 ? -40 : 40, opacity: 0}),
};

const SWIPE_THRESHOLD_PX = 40;

const Star = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="var(--color-primary)" viewBox="0 0 20 20">
    <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
  </svg>
);

const StarRating = ({rating}: {rating: number}) => (
  <span aria-label={`${rating} out of 5 stars`} className="inline-flex gap-0.5" role="img">
    {Array.from({length: Math.round(rating)}, (_, i) => (
      <Star key={i} />
    ))}
  </span>
);

const Chevron = ({direction}: {direction: "left" | "right"}) => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function ReviewsCarousel({
  reviews = googleReviews,
  intervalMs = 7000,
  className,
}: ReviewsCarouselProps) {
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [paused, setPaused] = React.useState(false);
  const touchStartRef = React.useRef<{x: number; y: number} | null>(null);
  const reduceMotion = useReducedMotion();
  const count = reviews.length;

  const go = React.useCallback(
    (delta: number) => {
      setDirection(delta);
      setIndex((prev) => (prev + delta + count) % count);
    },
    [count],
  );

  const goTo = (target: number) => {
    if (target === index) return;
    setDirection(target > index ? 1 : -1);
    setIndex(target);
  };

  // Auto-advance; restarting on every index change also resets the timer after manual navigation
  React.useEffect(() => {
    if (paused || reduceMotion || count <= 1) return;
    const id = window.setTimeout(() => go(1), intervalMs);
    return () => window.clearTimeout(id);
  }, [index, paused, reduceMotion, count, intervalMs, go]);

  if (!count) return null;

  const review = reviews[index % count];

  return (
    <section aria-labelledby="google-reviews-heading" className={cn("w-full", className)}>
      <div className="mb-3 flex flex-col gap-1">
        <h2
          className="text-default-foreground text-xl leading-7 font-bold"
          id="google-reviews-heading"
        >
          Trusted by real estate investors
        </h2>
        <a
          className="text-small text-default-500 hover:text-default-700 inline-flex flex-wrap items-center gap-x-2 gap-y-1"
          href={GOOGLE_REVIEWS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="text-default-foreground font-semibold">{GOOGLE_RATING.toFixed(1)}</span>
          <StarRating rating={GOOGLE_RATING} />
          <span className="underline-offset-2 hover:underline">
            {GOOGLE_REVIEW_COUNT} Google reviews
          </span>
        </a>
      </div>

      <div
        aria-label="Google reviews"
        aria-roledescription="carousel"
        role="region"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
        }}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          aria-live={paused || reduceMotion ? "polite" : "off"}
          className="rounded-large shadow-small relative min-h-[17rem] overflow-hidden px-5 py-5"
          style={{
            backgroundImage:
              "linear-gradient(to bottom right, rgba(255,77,64,0.12), rgba(255,183,3,0.12))",
          }}
          onTouchEnd={(e) => {
            const start = touchStartRef.current;
            touchStartRef.current = null;
            if (!start || count <= 1) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
              go(dx < 0 ? 1 : -1);
            }
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStartRef.current = {x: touch.clientX, y: touch.clientY};
            setPaused(true);
          }}
        >
          <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
              <AnimatePresence custom={direction} initial={false} mode="wait">
                <m.figure
                  key={index}
                  animate="center"
                  aria-label={`Review ${index + 1} of ${count}`}
                  aria-roledescription="slide"
                  custom={direction}
                  exit="exit"
                  initial="enter"
                  role="group"
                  transition={{duration: 0.25, ease: "easeOut"}}
                  variants={slideVariants}
                >
                  <StarRating rating={review.rating} />
                  <blockquote className="text-default-700 mt-3 line-clamp-6 text-medium leading-6 whitespace-pre-line">
                    {review.text}
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-small font-semibold text-black"
                      style={{
                        backgroundImage:
                          "linear-gradient(to bottom right, var(--color-primary), var(--color-accent))",
                      }}
                    >
                      {getInitials(review.author)}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-default-foreground text-small font-semibold">
                        {review.author}
                      </span>
                      <span className="text-default-500 text-tiny">Google review</span>
                    </span>
                  </figcaption>
                </m.figure>
              </AnimatePresence>
            </LazyMotion>
          </MotionConfig>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          {count > 1 ? (
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                aria-label="Previous review"
                className="bg-default-100 dark:bg-[#27272A]/60"
                size="sm"
                variant="flat"
                onPress={() => go(-1)}
              >
                <Chevron direction="left" />
              </Button>
              <div className="flex items-center">
                {reviews.map((r, i) => (
                  <button
                    key={r.author}
                    aria-current={i === index ? "true" : undefined}
                    aria-label={`Show review ${i + 1} of ${count}`}
                    className="p-1.5"
                    type="button"
                    onClick={() => goTo(i)}
                  >
                    <span
                      className={cn(
                        "block h-2 rounded-full transition-all",
                        i === index ? "w-5 bg-[var(--color-primary)]" : "bg-default-400 w-2",
                      )}
                    />
                  </button>
                ))}
              </div>
              <Button
                isIconOnly
                aria-label="Next review"
                className="bg-default-100 dark:bg-[#27272A]/60"
                size="sm"
                variant="flat"
                onPress={() => go(1)}
              >
                <Chevron direction="right" />
              </Button>
            </div>
          ) : (
            <span />
          )}
          <a
            className="text-small text-default-500 hover:text-default-700 underline-offset-2 hover:underline"
            href={GOOGLE_REVIEWS_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Read on Google ↗
          </a>
        </div>
      </div>
    </section>
  );
}
