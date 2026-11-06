import {useRef, useState} from "react";

import {Button} from "@/components/ui/button";
import {Guides} from "@/components/ui/guides";
import {ShineButton} from "@/components/ui/shine-button";
import {
  Steps,
  StepsDescription,
  StepsIndicator,
  StepsItem,
  StepsList,
  StepsSeparator,
  StepsTitle,
  StepsTrigger,
} from "@/components/ui/steps";
import {SectionFields, useFocusField} from "./PricingControls";
import PricingHeader from "./PricingHeader";
import {fieldByCode, missingRequired, sectionProgress, visibleSections} from "./model";
import {usePricingForm} from "./usePricingForm";

export default function PricingSteps() {
  const root = useRef<HTMLFormElement>(null);
  const form = usePricingForm();
  useFocusField(form.focus.turn, form.focus.field, root);
  const sections = visibleSections(form.values);
  const steps = sections.map((section) => section.id);
  const [stepId, setStepId] = useState(steps[0]);
  const [reached, setReached] = useState(0);
  const safeId = steps.includes(stepId) ? stepId : steps[0];
  const safeIndex = steps.indexOf(safeId);
  const section = sections.find((item) => item.id === safeId);
  const isLast = safeIndex === steps.length - 1;
  const titleOf = (id: string) => sections.find((item) => item.id === id)?.title ?? id;

  const hintOf = (id: string, index: number) => {
    const progress = sectionProgress(id, form.values, form.tables);
    if (index < safeIndex && progress.done === progress.total) return "Done";
    return progress.total === 0 ? "Optional" : `${progress.done} of ${progress.total} required`;
  };

  const go = (next: number) => {
    setStepId(steps[Math.max(0, Math.min(steps.length - 1, next))]);
  };

  const advance = () => {
    form.ask(safeId);
    const missingHere = missingRequired(form.values, form.tables, safeId);
    if (missingHere.length > 0) {
      form.focusField(missingHere[0]);
      return;
    }
    if (!isLast) {
      const next = safeIndex + 1;
      setReached((current) => Math.max(current, next));
      go(next);
      return;
    }
    const missing = missingRequired(form.values, form.tables);
    const blocked = missing[0] ?? (form.messages.number_of_units ? "number_of_units" : "");
    if (blocked) {
      const sectionId = fieldByCode(blocked)?.section ?? steps[0];
      form.ask(sectionId);
      const next = steps.indexOf(sectionId);
      if (next >= 0) {
        setReached((current) => Math.max(current, next));
        setStepId(steps[next]);
      }
      form.focusField(blocked);
      return;
    }
    form.beginCalculate("/pricing/steps");
  };

  const status = `Step ${safeIndex + 1} of ${steps.length}: ${titleOf(safeId)}`;

  return (
    <div className="pricing-page min-h-screen w-full">
      <PricingHeader className="max-w-5xl" label="Your rate" onToggle={form.toggleColorScheme} scheme={form.scheme} />
      <main className="w-full px-4 py-8 sm:px-6 md:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="flex max-w-xl flex-col gap-1">
            <h1 className="text-balance text-xl font-semibold tracking-tight">Check your rate</h1>
            <p className="text-pretty text-sm text-muted-foreground">
              One section at a time. Your answers stay as you move back and forth.
            </p>
          </div>

          <div className="relative bg-background">
            <Guides extend="sm" marks="corners" />
            <Steps
              className="contents"
              count={steps.length}
              onStepChange={(details) => {
                if (details.step <= reached) setStepId(steps[details.step]);
              }}
              orientation="vertical"
              step={safeIndex}
            >
              <div className="grid md:grid-cols-[16rem_minmax(0,1fr)]">
                <nav aria-label="Pricing steps" className="flex flex-col gap-3 px-5 py-5 sm:px-6">
                  <StepsList className="[--steps-gutter:--spacing(1)] [--steps-size:--spacing(8)] max-md:data-[orientation=vertical]:flex-row! max-md:data-[orientation=vertical]:items-center!">
                    {steps.map((id, stepIndex) => (
                      <StepsItem className="max-md:items-center md:min-h-[4.25rem]" index={stepIndex} key={id}>
                        <StepsTrigger
                          className="gap-3 rounded-md text-start focus-visible:ring-3 focus-visible:ring-ring/50"
                          disabled={stepIndex > reached}
                        >
                          <StepsIndicator className="text-xs">{stepIndex + 1}</StepsIndicator>
                          <span className="flex min-w-0 flex-col gap-1 max-md:sr-only">
                            <StepsTitle>{titleOf(id)}</StepsTitle>
                            <StepsDescription className="tabular-nums">{hintOf(id, stepIndex)}</StepsDescription>
                          </span>
                        </StepsTrigger>
                        <StepsSeparator className="max-md:hidden data-[orientation=vertical]:top-[calc(var(--steps-size)+var(--steps-gutter))] data-[orientation=vertical]:bottom-(--steps-gutter) data-[orientation=vertical]:h-auto data-[orientation=vertical]:max-h-none" />
                      </StepsItem>
                    ))}
                  </StepsList>
                  <p aria-hidden="true" className="text-sm font-medium md:hidden">
                    {status}
                  </p>
                </nav>

                <form
                  className="relative flex min-w-0 flex-col md:border-s"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    advance();
                  }}
                  ref={root}
                >
                  <Guides className="md:hidden" marks="top" rules="top" sides={false} />
                  <div className="flex flex-col gap-5 px-5 py-6 sm:px-6 md:min-h-[26rem]">
                    {section ? (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <h2 className="text-lg font-semibold tracking-tight outline-none" tabIndex={-1}>
                            {section.title}
                          </h2>
                          <p className="text-pretty text-sm text-muted-foreground">{section.description}</p>
                        </div>
                        <SectionFields
                          messages={form.messages}
                          onCell={form.setCell}
                          onChange={form.setValue}
                          propertyLookup={form.propertyLookup}
                          sectionId={section.id}
                          tables={form.tables}
                          values={form.values}
                        />
                      </>
                    ) : null}
                  </div>

                  <div className="sticky bottom-0 z-10 mt-auto flex flex-col gap-2.5 bg-background/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4 md:relative">
                    <Guides marks="top" rules="top" sides={false} />
                    <p aria-live="polite" className="text-sm text-muted-foreground max-md:sr-only" role="status">
                      {status}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                      <Button
                        onClick={() => {
                          form.resetForm();
                          setStepId(steps[0]);
                          setReached(0);
                        }}
                        size="xl"
                        type="button"
                        variant="outline"
                      >
                        Reset
                      </Button>
                      <Button disabled={safeIndex === 0} onClick={() => go(safeIndex - 1)} size="xl" type="button" variant="outline">
                        Back
                      </Button>
                      <ShineButton size="xl" type="submit">
                        {isLast ? "Calculate" : "Next"}
                      </ShineButton>
                    </div>
                  </div>
                </form>
              </div>
            </Steps>
          </div>
        </div>
      </main>
    </div>
  );
}
