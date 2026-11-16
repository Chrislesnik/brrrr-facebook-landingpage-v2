"use client";

import { Progress as ProgressPrimitive } from "radix-ui";
import type React from "react";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface ProgressContextValue {
  max?: number;
  value?: number | null;
}

const ProgressContext = createContext<ProgressContextValue>({});

export const useProgress = () => useContext(ProgressContext);

/** How full the bar is, 0 to 100: `value` out of `max` (100 by default). */
const percent = (value: number | null | undefined, max = 100) =>
  value === null || value === undefined || max <= 0
    ? 0
    : Math.min(100, Math.max(0, (value / max) * 100));

// The track flips itself in RTL, so a shadcn/ui snippet's own
// `rtl:rotate-180` (written for a bar that doesn't) would flip it back.
const RTL_FLIP = /(^|\s)rtl:rotate-180(?=\s|$)/g;

export const Progress = (
  props: React.ComponentProps<typeof ProgressPrimitive.Root>
) => {
  const { className, children, value, max, ...rest } = props;

  return (
    <ProgressContext.Provider value={{ max, value }}>
      <ProgressPrimitive.Root
        className={cn(
          "flex flex-wrap gap-3",
          className?.replace(RTL_FLIP, " ")
        )}
        data-slot="progress"
        max={max}
        value={value}
        {...rest}
      >
        {children}
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </ProgressPrimitive.Root>
    </ProgressContext.Provider>
  );
};

export const ProgressTrack = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn(
        "bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden rtl:rotate-180",
        className
      )}
      data-slot="progress-track"
      {...rest}
    />
  );
};

export const ProgressIndicator = (
  props: React.ComponentProps<typeof ProgressPrimitive.Indicator>
) => {
  const { className, style, ...rest } = props;
  const { max, value } = useProgress();

  return (
    <ProgressPrimitive.Indicator
      className={cn(
        "bg-primary size-full flex-1 transition-all",
        className
      )}
      data-slot="progress-indicator"
      style={{
        transform: `translateX(-${100 - percent(value, max)}%)`,
        ...style,
      }}
      {...rest}
    />
  );
};

export const ProgressRange = ProgressIndicator;

export const ProgressLabel = (props: React.ComponentProps<"span">) => {
  const { className, ...rest } = props;

  return (
    <span
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...rest}
    />
  );
};

export const ProgressValue = (
  props: Omit<React.ComponentProps<"span">, "children"> & {
    children?: (value: string) => React.ReactNode;
  }
) => {
  const { className, children, ...rest } = props;
  const { max, value } = useProgress();
  const valueText = `${Math.round(percent(value, max))}%`;

  return (
    <span
      className={cn("text-muted-foreground ms-auto text-sm tabular-nums", className)}
      data-slot="progress-value"
      {...rest}
    >
      {children?.(valueText) ?? valueText}
    </span>
  );
};
