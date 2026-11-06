import type {ReactNode} from "react";

import {cn} from "@/lib/utils";
import logoDarkUrl from "../brrrr-logo-2025-11-11.png";
import logoUrl from "../brrrr-logo-white-2025-11-11.png";
import {navigate} from "../routes";
import PricingThemeToggle from "./PricingThemeToggle";
import type {PricingColorScheme} from "./theme";

export default function PricingHeader(props: {
  scheme: PricingColorScheme;
  onToggle: () => void;
  label?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className={cn("mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6", props.className)}>
        <button
          aria-label="BRRRR Loans home"
          className="inline-flex shrink-0 cursor-pointer"
          onClick={() => navigate("/pricing")}
          type="button"
        >
          <img alt="" className="pricing-logo-on-light h-6 w-auto" src={logoDarkUrl} />
          <img alt="" className="pricing-logo-on-dark h-6 w-auto" src={logoUrl} />
        </button>
        {props.label ? (
          <>
            <span aria-hidden="true" className="h-5 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground">{props.label}</span>
          </>
        ) : null}
        <div className="ms-auto flex items-center gap-2">
          {props.action}
          <PricingThemeToggle onToggle={props.onToggle} scheme={props.scheme} />
        </div>
      </div>
    </header>
  );
}
