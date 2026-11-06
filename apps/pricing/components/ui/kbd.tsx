import type React from "react";
import { cn } from "@/lib/utils";

export const Kbd = (props: React.ComponentProps<"kbd">) => {
  const { className, ...rest } = props;

  return (
    <kbd
      className={cn(
        "bg-muted text-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex select-none items-center justify-center",
        className
      )}
      data-slot="kbd"
      {...rest}
    />
  );
};

export const KbdGroup = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <kbd
      className={cn("gap-1 inline-flex items-center", className)}
      data-slot="kbd-group"
      {...rest}
    />
  );
};
