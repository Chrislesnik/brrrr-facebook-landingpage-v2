import {Moon, Sun} from "lucide-react";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import type {PricingColorScheme} from "./theme";

export default function PricingThemeToggle(props: {
  scheme: PricingColorScheme;
  onToggle: () => void;
  className?: string;
}) {
  const isDark = props.scheme === "dark";

  return (
    <Button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("shadow-sm", props.className)}
      onClick={props.onToggle}
      size="icon-sm"
      title={isDark ? "Light mode" : "Dark mode"}
      type="button"
      variant="outline"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
