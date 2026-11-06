import {CheckIcon} from "lucide-react";
import {useRef} from "react";

import {Button} from "@/components/ui/button";
import {Guides} from "@/components/ui/guides";
import {ShineButton} from "@/components/ui/shine-button";
import {cn} from "@/lib/utils";
import {SectionFields, useFocusField} from "./PricingControls";
import PricingHeader from "./PricingHeader";
import {sectionProgress, visibleSections, missingRequired} from "./model";
import {usePricingForm} from "./usePricingForm";

export default function PricingStacked() {
  const root = useRef<HTMLElement>(null);
  const form = usePricingForm();
  useFocusField(form.focus.turn, form.focus.field, root);
  const sections = visibleSections(form.values);
  const missing = missingRequired(form.values, form.tables);
  const status =
    missing.length === 0
      ? "All required fields are filled."
      : missing.length === 1
        ? "1 required field to go."
        : `${missing.length} required fields to go.`;

  return (
    <div className="pricing-page min-h-screen w-full">
      <PricingHeader label="Your rate" onToggle={form.toggleColorScheme} scheme={form.scheme} />
      <main className="w-full px-4 py-8 sm:px-6 md:py-12" ref={root}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex max-w-xl flex-col gap-1">
            <h1 className="text-balance text-xl font-semibold tracking-tight">Your loan scenario</h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Fill in what you know. Fields marked with an asterisk are required for your rate.
            </p>
          </div>

          <form
            className="relative bg-background"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              form.beginCalculate("/pricing/scenario");
            }}
          >
            <Guides extend="sm" marks="corners" />
            {sections.map((section, index) => {
              const progress = sectionProgress(section.id, form.values, form.tables);
              const complete = progress.total > 0 && progress.done === progress.total;
              return (
                <section
                  aria-labelledby={`section-${section.id}`}
                  className="relative grid gap-5 px-5 py-6 sm:px-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10 md:py-8"
                  key={section.id}
                >
                  {index > 0 ? <Guides rules="top" sides={false} /> : null}
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-base font-semibold" id={`section-${section.id}`}>
                      {section.title}
                    </h2>
                    <p className="text-pretty text-sm text-muted-foreground">{section.description}</p>
                    <p
                      className={cn(
                        "mt-1 inline-flex items-center gap-1.5 text-xs tabular-nums",
                        complete ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {complete ? <CheckIcon aria-hidden="true" className="size-3.5 text-primary" /> : null}
                      {progress.total === 0 ? "Optional" : `${progress.done} of ${progress.total} required`}
                    </p>
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
                </section>
              );
            })}

            <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 bg-background/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <Guides marks="top" rules="top" sides={false} />
              <p
                aria-live="polite"
                className={cn("text-sm", missing.length > 0 && form.messages[missing[0]] ? "font-medium" : "text-muted-foreground")}
                role="status"
              >
                {status}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={form.resetForm} size="xl" type="button" variant="outline">
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    const field = missing[0];
                    if (!field) return;
                    form.ask("all");
                    form.focusField(field);
                  }}
                  size="xl"
                  type="button"
                  variant="outline"
                >
                  Next required
                </Button>
                <ShineButton size="xl" type="submit">
                  Calculate
                </ShineButton>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
