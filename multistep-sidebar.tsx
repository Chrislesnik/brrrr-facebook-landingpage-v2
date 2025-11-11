"use client";

import React from "react";
import {cn} from "@heroui/react";

import HighlightsRotator from "./highlights-rotator";
import logoUrl from "./brrrr-logo-2025-11-11.png";

export type MultiStepSidebarProps = React.HTMLAttributes<HTMLDivElement> & {
  currentPage: number;
  onBack: () => void;
  onNext: () => void;
  onChangePage: (page: number) => void;
};

const highlights = [
  "Buy 🏠",
  "Rehab 🛠️",
  "Rent 🏡",
  "Refinance 💸",
  "Repeat 🔁",
];

const MultiStepSidebar = React.forwardRef<HTMLDivElement, MultiStepSidebarProps>(
  ({children, className, currentPage, onBack, onNext, onChangePage, ...props}, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex h-[calc(100vh-40px)] w-full gap-x-2", className)}
        {...props}
      >
        <div
          className="rounded-large shadow-small flex hidden h-full w-[344px] shrink-0 flex-col items-start gap-y-4 px-8 py-6 lg:flex"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,77,64,0.12), rgba(255,183,3,0.12))",
          }}
        >
          <img
            alt="BRRRR Loans"
            className="w-full max-w-full max-h-16 md:max-h-20 lg:max-h-24 object-contain mb-3 md:mb-4"
            src={logoUrl}
          />
          <div>
            <div className="text-default-500 mt-1 text-base leading-6 font-medium">
              BRRRR Loans is a private direct lender for real estate investing mortgages nationwide,
              lending exclusively to real estate investors. We specialize in DSCR and Fix &amp; Flip loans.
            </div>
          </div>
          {/* Desktop Rotating Highlights */}
          <div className="mt-2">
            <HighlightsRotator items={highlights} />
          </div>
        </div>
        <div className="flex h-full w-full flex-col items-center gap-4 md:p-4">
          <div
            className="rounded-large shadow-small w-full py-4 md:max-w-xl lg:hidden"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,77,64,0.12), rgba(255,183,3,0.12))",
            }}
          >
            <div className="flex flex-col items-center gap-2 px-6">
              <img
                alt="BRRRR Loans"
                className="w-full max-w-[220px] max-h-12 sm:max-h-14 md:max-h-16 object-contain mb-2"
                src={logoUrl}
              />
              {/* Mobile Rotating Highlights */}
              <HighlightsRotator items={highlights} />
            </div>
          </div>
          <div className="h-full w-full p-4 sm:max-w-md md:max-w-lg">
            {children}
          </div>
        </div>
      </div>
    );
  },
);

MultiStepSidebar.displayName = "MultiStepSidebar";

export default MultiStepSidebar;
