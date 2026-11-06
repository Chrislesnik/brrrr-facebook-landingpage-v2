"use client";

import { ark } from "@ark-ui/react/factory";
import {
  Steps as ArkSteps,
  type UseStepsProps,
  useSteps as useArkSteps,
  useStepsContext,
  useStepsItemContext,
} from "@ark-ui/react/steps";
import { CheckIcon } from "lucide-react";
import type React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { useDirection } from "@/components/ui/direction";
import { useLocale } from "@/components/ui/locale";

export const useSteps = useStepsContext;

/** Ark's machine takes `dir`; Ark's types leave it to its LocaleProvider. */
type StepsMachineProps = UseStepsProps & { dir?: "ltr" | "rtl" };

/** Right-to-left when any of the directions says so. */
const eitherRtl = (...directions: string[]) =>
  directions.includes("rtl") ? "rtl" : "ltr";

/**
 * Steps is Ark UI on every base, and Ark reads direction from its own
 * LocaleProvider (Steps.Root's `dir` only reaches the root element). So the
 * root runs Ark's machine itself and hands it its `dir`, else right-to-left
 * when Radix's DirectionProvider or Ark's LocaleProvider (the RTL guide's
 * `@/components/ui/locale`) says so: the list, the triggers and the content
 * all mirror in a right-to-left app.
 */
export const Steps = (props: React.ComponentProps<typeof ArkSteps.Root>) => {
  const {
    className,
    count,
    defaultStep,
    dir,
    id,
    ids,
    isStepSkippable,
    isStepValid,
    linear,
    onStepChange,
    onStepComplete,
    onStepInvalid,
    orientation,
    step,
    ...rest
  } = props;
  const baseDirection = useDirection();
  const { dir: arkDirection } = useLocale();
  const fallbackId = useId();
  const machine: StepsMachineProps = {
    count,
    defaultStep,
    dir:
      dir === "ltr" || dir === "rtl"
        ? dir
        : eitherRtl(baseDirection, arkDirection),
    id: id ?? fallbackId,
    ids,
    isStepSkippable,
    isStepValid,
    linear,
    onStepChange,
    onStepComplete,
    onStepInvalid,
    orientation,
    step,
  };
  const steps = useArkSteps(machine);

  return (
    <ArkSteps.RootProvider
      className={cn(
        "flex flex-col gap-4",
        "data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:flex-row data-[orientation=vertical]:gap-8",
        className
      )}
      data-slot="steps"
      value={steps}
      {...rest}
    />
  );
};

/**
 * Where an arrow key moves focus along the list: 1 to the next trigger, -1
 * to the previous one, 0 for any other key. Down and Up when the list is
 * vertical; Right and Left otherwise, swapped in right-to-left.
 */
const arrowOffset = (key: string, vertical: boolean, rtl: boolean) => {
  const along = vertical
    ? key === "ArrowDown" || key === "ArrowUp"
    : key === "ArrowLeft" || key === "ArrowRight";
  if (!along) {
    return 0;
  }
  const offset = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
  return rtl && !vertical ? -offset : offset;
};

/**
 * Arrow keys move focus between the enabled triggers, wrapping round, and
 * Home and End to the first and last: Ark gives the list and triggers the
 * tablist and tab roles without their keys. Focus moves; the step doesn't
 * (Enter or Space opens it), so a wizard never jumps ahead on its own.
 */
const moveTriggerFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
  const list = event.currentTarget;
  const triggers = Array.from(
    list.querySelectorAll<HTMLButtonElement>(
      '[data-scope="steps"][data-part="trigger"]:not(:disabled)'
    )
  );
  const index = triggers.indexOf(event.target as HTMLButtonElement);
  if (index === -1 || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  const offset = arrowOffset(
    event.key,
    list.getAttribute("aria-orientation") === "vertical",
    getComputedStyle(list).direction === "rtl"
  );
  let target: number | undefined;
  if (event.key === "Home") {
    target = 0;
  } else if (event.key === "End") {
    target = triggers.length - 1;
  } else if (offset !== 0) {
    target = (index + offset + triggers.length) % triggers.length;
  }
  if (target === undefined) {
    return;
  }
  event.preventDefault();
  triggers[target]?.focus();
};

export const StepsList = (
  props: React.ComponentProps<typeof ArkSteps.List>
) => {
  const { className, onKeyDown, ...rest } = props;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented) {
      moveTriggerFocus(event);
    }
  };

  return (
    <ArkSteps.List
      className={cn(
        "[--steps-gutter:--spacing(2)] [--steps-icon-size:--spacing(4)] [--steps-size:--spacing(8)]",
        "flex",
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start",
        "data-[orientation=horizontal]:items-center data-[orientation=horizontal]:justify-between",
        className
      )}
      data-slot="steps-list"
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
};

export const StepsItem = (
  props: React.ComponentProps<typeof ArkSteps.Item>
) => {
  const { className, ...rest } = props;

  return (
    <ArkSteps.Item
      className={cn(
        "group/step",
        "relative flex flex-1",
        "data-[orientation=vertical]:items-start",
        "data-[orientation=horizontal]:items-center",
        "last:flex-initial last:**:data-[slot=steps-separator]:hidden",
        className
      )}
      data-slot="steps-item"
      {...rest}
    />
  );
};

interface StepsTriggerProps
  extends React.ComponentProps<typeof ArkSteps.Trigger> {}

/**
 * The list is one tab stop, as tabs are: the current step's trigger, or the
 * last one once every step is done. Arrow keys reach the others.
 */
export const StepsTrigger = (props: StepsTriggerProps) => {
  const { className, ...rest } = props;
  const steps = useStepsContext();
  const item = useStepsItemContext();

  return (
    <ArkSteps.Trigger
      className={cn(
        "inline-flex items-center gap-3",
        "cursor-pointer rounded-full outline-none",
        "disabled:pointer-events-none disabled:opacity-64",
        className
      )}
      data-slot="steps-trigger"
      tabIndex={item.current || (item.last && steps.isCompleted) ? 0 : -1}
      {...rest}
    />
  );
};

export const StepsIndicator = (
  props: React.ComponentProps<typeof ArkSteps.Indicator>
) => {
  const { className, children, ...rest } = props;

  return (
    <ArkSteps.Indicator
      className={cn(
        "flex shrink-0 items-center justify-center tabular-nums",
        "size-(--steps-size)",
        "bg-muted text-muted-foreground",
        "font-medium text-sm",
        "rounded-full border",
        "transition-colors",
        "in-focus-visible:ring-[3px] in-focus-visible:ring-ring/32",
        "data-current:border-primary data-current:bg-primary data-current:text-primary-foreground",
        "data-complete:border-primary data-complete:bg-primary data-complete:text-primary-foreground",
        "[&_svg]:size-(--steps-icon-size) [&_svg]:shrink-0",
        "motion-reduce:transition-none!",
        className
      )}
      data-slot="steps-indicator"
      {...rest}
    >
      <span className="group-data-[complete]/step:hidden">{children}</span>
      <CheckIcon className="hidden group-data-[complete]/step:block" />
    </ArkSteps.Indicator>
  );
};

export const StepsSeparator = (
  props: React.ComponentProps<typeof ArkSteps.Separator>
) => {
  const { className, ...rest } = props;

  return (
    <ArkSteps.Separator
      className={cn(
        "flex-1",
        "bg-border",
        "rounded-full",
        "transition-colors",
        "data-complete:bg-primary",
        "data-[orientation=horizontal]:mx-(--steps-gutter) data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:absolute data-[orientation=vertical]:top-[calc(var(--steps-size)+var(--steps-gutter))] data-[orientation=vertical]:left-[calc(var(--steps-size)/2-1px)] data-[orientation=vertical]:h-full data-[orientation=vertical]:max-h-[calc(100%-(var(--steps-size)+var(--steps-gutter)*2))] data-[orientation=vertical]:w-0.5",
        "motion-reduce:transition-none!",
        className
      )}
      data-slot="steps-separator"
      {...rest}
    />
  );
};

export const StepsTitle = (props: React.ComponentProps<typeof ark.span>) => {
  const { className, ...rest } = props;

  return (
    <ark.span
      className={cn("font-medium text-sm leading-none", className)}
      data-slot="steps-title"
      {...rest}
    />
  );
};

export const StepsDescription = (
  props: React.ComponentProps<typeof ark.span>
) => {
  const { className, ...rest } = props;

  return (
    <ark.span
      className={cn("text-muted-foreground text-xs", className)}
      data-slot="steps-description"
      {...rest}
    />
  );
};

/**
 * Out of the tab order (Ark makes it a tab stop): a wizard moves focus into
 * it by script, and Tab goes on to its own fields.
 */
export const StepsContent = (
  props: React.ComponentProps<typeof ArkSteps.Content>
) => {
  const { className, ...rest } = props;

  return (
    <ArkSteps.Content
      className={cn("data-[orientation=vertical]:flex-1", className)}
      data-slot="steps-content"
      tabIndex={-1}
      {...rest}
    />
  );
};

/**
 * Ark's content props less the tab panel's role and label: no trigger opens
 * the completed content, and Ark labels it by a trigger that isn't there.
 */
const withoutTabPanel = <
  T extends { "aria-labelledby"?: unknown; role?: unknown },
>(
  props: T
) => {
  const { "aria-labelledby": _labelledBy, role: _role, ...rest } = props;
  return rest;
};

/**
 * Ark's completed content as a plain container, out of the tab order as
 * StepsContent is.
 */
export const StepsCompletedContent = (
  props: React.ComponentProps<typeof ArkSteps.CompletedContent>
) => {
  const { className, ...rest } = props;
  const steps = useStepsContext();

  return (
    <ark.div
      {...withoutTabPanel(steps.getContentProps({ index: steps.count }))}
      className={cn("data-[orientation=vertical]:flex-1", className)}
      data-slot="steps-completed-content"
      tabIndex={-1}
      {...rest}
    />
  );
};

export const StepsPrevious = (
  props: React.ComponentProps<typeof ArkSteps.PrevTrigger>
) => <ArkSteps.PrevTrigger data-slot="steps-previous" {...props} />;

export const StepsNext = (
  props: React.ComponentProps<typeof ArkSteps.NextTrigger>
) => <ArkSteps.NextTrigger data-slot="steps-next" {...props} />;
