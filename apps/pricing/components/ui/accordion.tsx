"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type React from "react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const accordionRootClassName = cn(
  "cn-accordion group/accordion flex w-full flex-col"
);

const isCollapsedTrigger = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  const trigger = target.closest("[data-slot=accordion-trigger]");
  return (
    trigger instanceof HTMLElement &&
    trigger.getAttribute("aria-expanded") !== "true"
  );
};

export const Accordion = (
  props: React.ComponentProps<typeof AccordionPrimitive.Root>
) => {
  const { className, onKeyDown, onPointerDown, onValueChange, ...rest } = props;
  const [motion, setMotion] = useState(false);
  const enableMotion = useCallback(() => setMotion(true), []);
  const handleValueChange = useCallback(
    (value: string | string[]) => {
      enableMotion();
      onValueChange?.(value as never);
    },
    [enableMotion, onValueChange]
  );
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isCollapsedTrigger(event.target)) {
        enableMotion();
      }
      onPointerDown?.(event);
    },
    [enableMotion, onPointerDown]
  );
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        (event.key === "Enter" || event.key === " ") &&
        isCollapsedTrigger(event.target)
      ) {
        enableMotion();
      }
      onKeyDown?.(event);
    },
    [enableMotion, onKeyDown]
  );

  return (
    <AccordionPrimitive.Root
      className={cn(accordionRootClassName, className)}
      data-motion={motion ? "" : undefined}
      data-slot="accordion"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onValueChange={handleValueChange}
      {...rest}
    />
  );
};

export const AccordionItem = (
  props: React.ComponentProps<typeof AccordionPrimitive.Item>
) => {
  const { className, ...rest } = props;

  return (
    <AccordionPrimitive.Item
      className={cn("not-last:border-b [overflow-anchor:none]", className)}
      data-slot="accordion-item"
      {...rest}
    />
  );
};

export const AccordionTrigger = (
  props: React.ComponentProps<typeof AccordionPrimitive.Trigger>
) => {
  const { className, children, ...rest } = props;

  return (
    <AccordionPrimitive.Header className="contents">
      <AccordionPrimitive.Trigger
        className={cn(
          "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground rounded-lg py-2.5 text-start text-sm font-medium hover:underline focus-visible:ring-3 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 group/accordion-trigger relative flex w-full flex-1 items-start justify-between border border-transparent outline-none transition-all disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        data-slot="accordion-trigger"
        {...rest}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          className="cn-accordion-trigger-icon pointer-events-none ms-auto shrink-0 group-aria-expanded/accordion-trigger:hidden"
          data-slot="accordion-trigger-icon"
        />
        <ChevronUpIcon
          aria-hidden="true"
          className="cn-accordion-trigger-icon pointer-events-none ms-auto hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
          data-slot="accordion-trigger-icon"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

export const AccordionContent = (
  props: React.ComponentProps<typeof AccordionPrimitive.Content>
) => {
  const { className, children, ...rest } = props;

  return (
    <AccordionPrimitive.Content
      className="data-open:animate-accordion-down data-closed:animate-accordion-up text-sm overflow-hidden"
      data-slot="accordion-content"
      {...rest}
    >
      <div
        className={cn(
          "pt-0 pb-2.5",
          "[&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
          "[&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
};
