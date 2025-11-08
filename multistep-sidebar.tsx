"use client";

import React from "react";
import {cn} from "@heroui/react";

import MultistepNavigationButtons from "./multistep-navigation-buttons";
import HighlightsRotator from "./highlights-rotator";
import logoUrl from "./vyral-peo-logo.png";

export type MultiStepSidebarProps = React.HTMLAttributes<HTMLDivElement> & {
  currentPage: number;
  onBack: () => void;
  onNext: () => void;
  onChangePage: (page: number) => void;
};

const highlights = [
  "Payroll and tax administration made simple",
  "Fortune 500–level benefits for your team",
  "Compliance and risk management handled",
  "Onboarding and HR workflows streamlined",
  "Workers’ comp and safety support",
  "Multi‑state compliance expertise",
  "ACA, COBRA, and benefits admin",
  "Time & attendance and PTO tracking",
  "HR policies and employee handbooks",
  "Secure payroll with direct deposit",
  "Background checks and onboarding kits",
  "Seamless integrations with your tools",
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
              "linear-gradient(to bottom, rgb(124 164 164 / 0.12), rgb(58 107 157 / 0.12))",
          }}
        >
          <img
            alt="Vyral PEO"
            className="h-20 md:h-28 lg:h-32 w-auto -mb-2 md:-mb-3"
            src={logoUrl}
          />
          <div>
            <div className="text-default-500 mt-1 text-base leading-6 font-medium">
              Vyral PEO is a full‑service Professional Employer Organization that streamlines payroll,
              benefits, HR, and compliance—delivering enterprise‑grade coverage and support so your
              team can focus on growth.
            </div>
          </div>
          {/* Desktop Rotating Highlights */}
          <div className="mt-2">
            <HighlightsRotator items={highlights} />
          </div>
        </div>
        <div className="flex h-full w-full flex-col items-center gap-4 md:p-4">
          <div
            className="rounded-large shadow-small sticky top-0 z-10 w-full py-4 md:max-w-xl lg:hidden"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(124 164 164 / 0.12), rgb(58 107 157 / 0.12))",
            }}
          >
            <div className="flex justify-center px-6">
              {/* Mobile Rotating Highlights */}
              <HighlightsRotator items={highlights} />
            </div>
          </div>
          <div className="h-full w-full p-4 sm:max-w-md md:max-w-lg">
            {children}
            <MultistepNavigationButtons
              backButtonProps={{isDisabled: currentPage === 0}}
              className="lg:hidden"
              nextButtonProps={{
                children:
                  currentPage === 0
                    ? "Connect with us"
                    : currentPage === 3
                      ? "Submit"
                      : "Continue",
              }}
              onBack={onBack}
              onNext={onNext}
            />
          </div>
        </div>
      </div>
    );
  },
);

MultiStepSidebar.displayName = "MultiStepSidebar";

export default MultiStepSidebar;
