import {useEffect, useState, useSyncExternalStore, type ReactNode} from "react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {Spinner} from "@/components/ui/spinner";
import {Status} from "@/components/ui/status";
import {cn} from "@/lib/utils";
import Closings from "./Closings";
import {loanOptionRows, QuotePanel, RateFigures} from "./PricingControls";
import PricingHeader from "./PricingHeader";
import PricingTerms from "./PricingTerms";
import {openApplication, openTermSheet} from "./term-sheet";
import {authorizeApplicant, beginScenarioSave, fetchTermSheet, readScenarioSave, resumeScenarioSave, retryOptionSelection, retryScenarioSave, subscribeScenarioSave, type ScenarioSave} from "./scenario-save";
import {
  readPricingLead,
  readQuoteReturn,
  readQuoteSession,
  resumeQuote,
  subscribeQuote,
  type PricingLead,
  type QuoteSession,
} from "./quote-session";
import {visibleLoanOptions, type LoanOption, type QuoteProgram} from "./quote";
import {navigate} from "../routes";
import {usePricingTheme} from "./usePricingForm";

const PREVIEW_LEAD = ["Loan amount", "Monthly payment (PITIA)"];
const PREVIEW_REST = ["Loan-to-value", "DSCR", "Origination fee"];

function useQuoteSession(): QuoteSession {
  return useSyncExternalStore(subscribeQuote, readQuoteSession, readQuoteSession);
}

function useScenarioSave(): ScenarioSave {
  return useSyncExternalStore(subscribeScenarioSave, readScenarioSave, readScenarioSave);
}

function passedProgram(session: QuoteSession): QuoteProgram | null {
  if (session.status !== "ready") return null;
  return session.result.programs.find((program) => program.pass !== false) ?? null;
}

function recommendedOption(options: LoanOption[]): LoanOption | null {
  return options.find((option) => option.recommended) ?? options[0] ?? null;
}

export default function PricingResult() {
  const {scheme, toggleColorScheme} = usePricingTheme();
  const session = useQuoteSession();
  const save = useScenarioSave();
  const [lead, setLead] = useState<PricingLead | null>(() => readPricingLead());
  const [selectedId, setSelectedId] = useState("");
  const locked = lead == null && session.status !== "idle";
  const options = session.status === "ready" ? visibleLoanOptions(session.result) : [];
  const recommended = recommendedOption(options);
  const recommendedId = recommended?.id ?? "";
  const optionKey = options.map((option) => option.label).join("|");
  const shown = options.find((option) => option.id === selectedId) ?? recommended;
  const legacy = shown ? null : passedProgram(session);
  const qualified = Boolean(shown || legacy);
  const failed =
    session.status === "ready" &&
    !qualified &&
    (session.result.programs.length > 0 || (session.result.options?.length ?? 0) > 0);
  const back = () => navigate(readQuoteReturn());
  const programName = shown?.program || legacy?.name || "This program";
  const pending = session.status === "pending";
  const heading = pending ? "Retrieving your terms" : qualified ? "You qualify" : failed ? "This scenario does not qualify" : "Your rate and leverage";
  const detail = pending
    ? "Pricing this scenario takes a few seconds."
    : qualified
      ? `${programName} fits this scenario. These figures are an illustration, not a commitment to lend.${
          session.status === "ready" && session.result.preview ? " Prepay choices are a preview until each option is priced." : ""
        }`
      : failed
        ? "Review what needs to change, then edit the scenario."
        : locked
          ? "Your terms are ready."
          : "Calculate a scenario to see a rate.";

  useEffect(() => {
    resumeQuote();
    resumeScenarioSave();
  }, []);

  useEffect(() => {
    if (!recommendedId) return;
    const labels = new Set(optionKey.split("|").filter(Boolean));
    setSelectedId((current) => {
      const currentLabel = options.find((option) => option.id === current)?.label;
      return currentLabel && labels.has(currentLabel) ? current : recommendedId;
    });
  }, [optionKey, options, recommendedId]);

  useEffect(() => {
    if (session.status !== "ready") return;
    const list = visibleLoanOptions(session.result);
    if (list.length === 0) {
      if (session.result.programs.some((item) => item.pass !== false)) beginScenarioSave(lead);
      return;
    }
    if (!selectedId || !list.some((option) => option.id === selectedId)) return;
    beginScenarioSave(lead, selectedId);
    if (lead && save.status === "ready" && save.authorizedEmail !== lead.email) authorizeApplicant(lead);
  }, [lead, save, session, selectedId]);

  return (
    <div className="pricing-page min-h-screen w-full">
      <PricingHeader label="Your rate" onToggle={toggleColorScheme} scheme={scheme} />
      <main
        className={cn(
          "mx-auto w-full px-4 py-8 sm:px-6 md:py-12",
          qualified && !locked ? "max-w-6xl" : "flex max-w-2xl flex-col gap-6",
        )}
      >
        <div
          className={cn(
            qualified && !locked
              ? "grid w-full min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-x-10"
              : "contents",
          )}
        >
          <div className={cn("flex min-w-0 flex-col gap-6", qualified && !locked && "lg:sticky lg:top-6")}>
            <div className="flex flex-col gap-1">
              <h1 className="text-balance text-xl font-semibold tracking-tight">{heading}</h1>
              <p className="text-pretty text-sm text-muted-foreground">{detail}</p>
            </div>
            <div
              aria-hidden={(locked && session.status !== "pending") || undefined}
              className={cn(locked && session.status !== "pending" && "pointer-events-none select-none blur-xl")}
            >
              <RateBody
                footer={
                  qualified && !locked ? (
                    <ScenarioActions lead={lead} optionId={shown?.id ?? ""} save={save} />
                  ) : null
                }
                onSelect={setSelectedId}
                revealed={!locked}
                selectedId={shown?.id ?? ""}
                session={session}
              />
            </div>
            {locked ? null : (
              <Button className="self-center" onClick={back} size="lg" type="button" variant="ghost">
                Edit scenario
              </Button>
            )}
          </div>
          {qualified && !locked ? <Closings /> : null}
        </div>
        <PricingTerms onEdit={back} onSaved={setLead} open={locked} />
      </main>
    </div>
  );
}

function ScenarioActions(props: {lead: PricingLead | null; optionId: string; save: ScenarioSave}) {
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const unsaved = props.save.status === "ready" && Boolean(props.optionId) && props.save.unsavedOptionIds?.includes(props.optionId);
  const sheetWaiting = props.save.status === "pending" || fetchingSheet;
  const applying =
    props.save.status === "ready" &&
    Boolean(props.optionId) &&
    (props.save.selecting || (Boolean(props.save.selectedOptionId) && props.save.selectedOptionId !== props.optionId));
  const canApply = props.save.status === "ready" && Boolean(props.save.applicationUrl) && !applying;

  if (props.save.status === "error") {
    return (
      <>
        <p className="pricing-error text-sm sm:col-span-2">{props.save.message}</p>
        <Button className="sm:col-span-2" onClick={() => retryScenarioSave(props.lead)} size="xl" type="button">
          Try again
        </Button>
      </>
    );
  }
  if (props.save.status === "idle") return null;
  return (
    <>
      {props.save.status === "ready" && props.save.contactError ? (
        <p className="pricing-error text-sm sm:col-span-2">
          {props.save.contactError}{" "}
          {props.lead ? (
            <button className="underline" onClick={() => props.lead && authorizeApplicant(props.lead)} type="button">
              Try again
            </button>
          ) : null}
        </p>
      ) : null}
      {props.save.status === "ready" && props.save.selectError ? (
        <p className="pricing-error text-sm sm:col-span-2">
          {props.save.selectError}{" "}
          <button className="underline" onClick={() => retryOptionSelection(props.lead, props.optionId)} type="button">
            Try again
          </button>
        </p>
      ) : null}
      {unsaved ? null : (
        <Button
          disabled={sheetWaiting}
          onClick={() => {
            if (sheetWaiting) return;
            setFetchingSheet(true);
            void fetchTermSheet(props.optionId)
              .then((url) => {
                if (url) openTermSheet(url);
              })
              .finally(() => setFetchingSheet(false));
          }}
          size="xl"
          type="button"
          variant="outline"
        >
          {sheetWaiting ? <Spinner aria-hidden /> : null}
          Download term sheet
        </Button>
      )}
      <Button
        aria-busy={applying || undefined}
        disabled={!canApply}
        onClick={() => {
          if (props.save.status === "ready" && props.save.applicationUrl) openApplication(props.save.applicationUrl);
        }}
        className={unsaved ? "sm:col-span-2" : undefined}
        size="xl"
        type="button"
      >
        {applying ? <Spinner aria-hidden /> : null}
        Start application
      </Button>
    </>
  );
}

function optionHint(option: LoanOption, options: LoanOption[]): string {
  const rates = options.flatMap((item) => (item.rate == null ? [] : [item.rate]));
  const lowest = rates.length > 0 ? Math.min(...rates) : undefined;
  const lowestOption = lowest == null ? undefined : options.find((item) => item.rate === lowest);
  if (lowestOption?.id === option.id) return "Lowest rate";
  if (option.label.trim().toLowerCase() === "no prepay") return "Most flexible";
  return "";
}

function OptionToggle(props: {onSelect: (id: string) => void; options: LoanOption[]; selectedId: string}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        aria-label="Prepay options"
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-4"
        role="radiogroup"
      >
        {props.options.map((option) => {
          const selected = option.id === props.selectedId;
          return (
            <Button
              aria-checked={selected}
              className="h-auto w-full whitespace-normal px-2 py-2 text-center"
              key={option.label}
              onClick={() => props.onSelect(option.id)}
              role="radio"
              size="sm"
              type="button"
              variant={selected ? "outline" : "ghost"}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1 px-1 sm:grid-cols-4">
        {props.options.map((option) => (
          <span className="min-h-4 text-center text-xs text-muted-foreground" key={option.label}>
            {optionHint(option, props.options)}
          </span>
        ))}
      </div>
    </div>
  );
}

function RateBody(props: {
  footer?: ReactNode;
  onSelect: (id: string) => void;
  revealed: boolean;
  selectedId: string;
  session: QuoteSession;
}) {
  const {footer, onSelect, revealed, selectedId, session} = props;
  if (session.status === "ready") {
    const options = visibleLoanOptions(session.result);
    const shown = options.find((option) => option.id === selectedId) ?? recommendedOption(options);
    if (shown) {
      return (
        <div className="flex flex-col gap-4">
          {options.length > 1 ? <OptionToggle onSelect={onSelect} options={options} selectedId={shown.id} /> : null}
          <Card className="pricing-card border">
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Status variant="success" />
                  <h3 className="text-sm font-semibold">Pass</h3>
                </div>
                <Badge variant="success">{shown.label}</Badge>
              </div>
              <RateFigures rows={loanOptionRows(shown)} />
            </CardContent>
            {footer ? <CardFooter className="grid gap-2 sm:grid-cols-2">{footer}</CardFooter> : null}
          </Card>
        </div>
      );
    }
    return <QuotePanel footer={footer} result={session.result} />;
  }
  if (session.status === "pending") return <QuoteSkeleton />;
  if (revealed && session.status === "error") return <p className="pricing-error text-sm">{session.message}</p>;
  if (!revealed) return <TermsPreview />;
  return <QuotePanel result={{programs: [], options: [], missing: [], note: "Calculate a scenario to see a rate."}} />;
}

function QuoteSkeleton() {
  return (
    <Card aria-busy="true" className="pricing-card border" role="status">
      <span className="sr-only">Retrieving your terms.</span>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </CardContent>
      <CardFooter className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </CardFooter>
    </Card>
  );
}

function TermsPreview() {
  return (
    <Card className="pricing-card border">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-5 w-24 rounded-full bg-muted" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3 w-10 rounded bg-muted" />
          <div className="h-8 w-28 rounded bg-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PREVIEW_LEAD.map((label) => (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-3 py-3" key={label}>
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="h-5 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {PREVIEW_REST.map((label) => (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-3 py-3" key={label}>
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="h-5 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
