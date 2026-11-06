import {ArrowUpRightIcon, CheckIcon, StarIcon} from "lucide-react";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Announcement, AnnouncementTitle} from "@/components/ui/announcement";
import {Avatar, AvatarFallback, AvatarGroup} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Guides} from "@/components/ui/guides";
import {ShineButton} from "@/components/ui/shine-button";
import {Status} from "@/components/ui/status";
import {cn} from "@/lib/utils";
import {GOOGLE_RATING, GOOGLE_REVIEW_COUNT, GOOGLE_REVIEWS_URL} from "../google-reviews";
import PricingHeader from "./PricingHeader";
import type {PricingColorScheme} from "./theme";

/** Lines quoted verbatim from the Google reviews in google-reviews.ts. */
const QUOTES = [
  {name: "Mark Santoro", quote: "Never a last minute bait and switch of terms."},
  {name: "Marluis Mejia", quote: "They do what they say, and close when they tell you they'll close."},
  {name: "Ed Hendrickson", quote: "Most importantly, they know how to get deals done."},
  {name: "Stephanie", quote: "Moved at a fast pace, which is exactly what we needed to close quickly."},
  {
    name: "Brandon Johnson",
    quote:
      "I’ve completed more than 25 deals with the Brrrr Loans team, and they have consistently provided excellent service.",
  },
  {name: "Dary Cabrera", quote: "They made the entire process feel smooth and easy."},
  {name: "Yvonne Best", quote: "Everything is explained upfront from the beginning, so there are no surprises along the way."},
  {name: "renzo urrutia", quote: "They’re responsive, helpful, and do a great job keeping everything moving."},
  {
    name: "Benito Contreras",
    quote: "They work to get you to the closing table just as hard as you’re working to get there yourself.",
  },
];

const FEATURED = 4;

const STEPS = [
  {
    title: "Describe the deal",
    text: "Loan type, the property and the numbers you already know. Optional fields can stay blank.",
  },
  {title: "See your rate and leverage", text: "The rate and the leverage you qualify for show up on the page."},
  {title: "Close with our team", text: "When the numbers work, a BRRRR Loans lender takes it from there."},
];

const FAQS = [
  {
    question: "What loans does BRRRR Loans make?",
    answer:
      "Business-purpose loans on investment property you do not live in. That is an interest-only bridge loan, including a fix and flip with rehab funds, or a 30-year rental loan. Either can be a purchase or a refinance, on one property or several. You can close in an LLC at no extra cost, and the loan does not report to your personal credit.",
  },
  {
    question: "What is a DSCR loan?",
    answer:
      "A rental loan that qualifies on the property, not your paycheck. DSCR compares the rent with the monthly payment. When the rent covers the debt, the deal can qualify without tax returns or proof of employment.",
  },
  {
    question: "How is this different from a bank loan?",
    answer:
      "A bank underwrites your income, tax returns, and debt-to-income, and most investors stop at ten financed properties. A BRRRR loan skips that file. The question is whether the property supports the loan. It closes in an entity, it stays off your personal credit, and there is no ten-property cap.",
  },
  {
    question: "Does this pull my credit?",
    answer: "No. You enter an estimated FICO score yourself. Nothing is pulled when you check your rate.",
  },
  {
    question: "How much of a flip can the loan cover?",
    answer:
      "Up to 90% of the purchase price and 100% of the renovation, as long as the total fits the after-repair value. Putting more of your own cash in usually improves the rate.",
  },
];

const STARS = [1, 2, 3, 4, 5];

const ENTER =
  "transition-[opacity,translate] duration-500 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

const CELL = "flex items-center gap-3 px-6 py-5 sm:flex-1 sm:justify-center";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Stars(props: {className?: string}) {
  return (
    <span aria-hidden="true" className="flex items-center gap-0.5">
      {STARS.map((star) => (
        <StarIcon className={cn("fill-primary text-primary", props.className ?? "size-4")} key={star} />
      ))}
    </span>
  );
}

export default function PricingLanding(props: {
  title: string;
  description: string;
  scheme: PricingColorScheme;
  onToggle: () => void;
  onStart: () => void;
}) {
  return (
    <div className="pricing-page min-h-screen w-full">
      <PricingHeader
        action={
          <Button onClick={props.onStart} size="sm" type="button">
            Check my rate
          </Button>
        }
        onToggle={props.onToggle}
        scheme={props.scheme}
      />

      <main>
        <section className="relative overflow-x-clip px-4 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl pt-12 md:pt-20">
            <Guides bleed marks="top" rules="top" />
            <div className="flex flex-col items-start px-6 sm:px-12">
              <div className={cn(ENTER, "max-w-full")}>
                <Announcement asChild>
                  <a href={GOOGLE_REVIEWS_URL} rel="noopener noreferrer" target="_blank">
                    <Status size="sm" variant="success" />
                    <AnnouncementTitle className="text-xs">
                      {GOOGLE_RATING.toFixed(1)} on Google
                      <span aria-hidden="true" className="font-normal text-muted-foreground">
                        ·
                      </span>
                      <span className="truncate font-normal text-muted-foreground">
                        Read {GOOGLE_REVIEW_COUNT} investor reviews
                      </span>
                    </AnnouncementTitle>
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                </Announcement>
              </div>
              <h1
                className={cn(
                  ENTER,
                  "mt-6 max-w-3xl text-balance text-4xl font-medium tracking-tight delay-75 sm:text-5xl lg:text-6xl",
                )}
              >
                {props.title}
              </h1>
              <p
                className={cn(
                  ENTER,
                  "mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground delay-150 sm:text-lg",
                )}
              >
                {props.description}
              </p>
              <div className={cn(ENTER, "mt-8 flex flex-wrap items-center gap-3 delay-200")}>
                <ShineButton onClick={props.onStart} size="xl" type="button">
                  Check my rate
                </ShineButton>
                <Button asChild size="xl" variant="outline">
                  <a
                    href="#how-it-works"
                    onClick={(event) => {
                      const section = document.getElementById("how-it-works");
                      if (!section) return;
                      event.preventDefault();
                      section.scrollIntoView({behavior: "smooth", block: "start"});
                    }}
                  >
                    How it works
                  </a>
                </Button>
              </div>
            </div>

            <div className={cn(ENTER, "relative mt-12 delay-300 md:mt-16")}>
              <Guides marks="top" rules="top" sides={false} />
              <ul
                aria-label="Why investors work with BRRRR Loans"
                className="flex flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0"
              >
                <li className={CELL}>
                  <AvatarGroup aria-hidden="true" className="*:data-[slot=avatar]:ring-background">
                    {QUOTES.slice(0, 4).map((item) => (
                      <Avatar key={item.name}>
                        <AvatarFallback className="text-[0.625rem] font-medium text-foreground">{initials(item.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <p className="flex flex-col text-start">
                    <span className="text-sm font-semibold tabular-nums">{GOOGLE_REVIEW_COUNT} reviews</span>
                    <span className="text-xs text-muted-foreground">From real estate investors</span>
                  </p>
                </li>
                <li className={CELL}>
                  <Stars />
                  <p className="flex flex-col text-start">
                    <span className="text-sm font-semibold tabular-nums">
                      <span className="sr-only">Rated </span>
                      {GOOGLE_RATING.toFixed(1)}
                      <span aria-hidden="true">/5</span>
                      <span className="sr-only"> out of 5</span>
                    </span>
                    <span className="text-xs text-muted-foreground">Average on Google</span>
                  </p>
                </li>
                <li className={CELL}>
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background"
                  >
                    <CheckIcon className="size-4 stroke-3 text-foreground" />
                  </span>
                  <p className="flex flex-col text-start">
                    <span className="text-sm font-semibold">Direct lender</span>
                    <span className="text-xs text-muted-foreground">DSCR and Fix &amp; Flip, nationwide</span>
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="reviews-heading" className="relative overflow-x-clip px-4 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl">
            <Guides bleed marks="top" rules="top" />
            <div className="flex flex-col gap-2 px-6 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-12">
              <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl" id="reviews-heading">
                What investors say about us
              </h2>
              <a
                className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href={GOOGLE_REVIEWS_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                All reviews on Google
                <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
              </a>
            </div>
            <div className="relative bg-muted/40">
              <Guides marks="none" rules="top" sides={false} />
              <ul
                aria-label="Google reviews"
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-8 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:grid md:snap-none md:grid-cols-3 md:gap-px md:overflow-visible md:bg-border md:p-0"
                tabIndex={0}
              >
                {QUOTES.map((item, index) => (
                  <li
                    className={cn(
                      "relative flex shrink-0 basis-[78%] snap-center rounded-xl border bg-card md:min-h-44 md:basis-auto md:rounded-none md:border-0 md:bg-background",
                      index === FEATURED && "z-10 md:bg-card md:shadow-lg md:ring-1 md:ring-foreground/15",
                    )}
                    key={item.name}
                  >
                    <figure className="flex w-full flex-col justify-between gap-4 p-4 md:p-6">
                      <div className="flex flex-col gap-2.5">
                        <Stars className="size-3" />
                        <span className="sr-only">Rated 5 out of 5</span>
                        <blockquote className={cn("text-pretty text-base leading-snug", index === FEATURED && "font-medium")}>
                          “{item.quote}”
                        </blockquote>
                      </div>
                      <figcaption className="flex min-w-0 items-center gap-2">
                        <Avatar aria-hidden="true" size="sm">
                          <AvatarFallback className="text-[0.625rem] font-medium">{initials(item.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-medium leading-tight">{item.name}</span>
                          <span className="truncate text-xs leading-tight text-muted-foreground">Google review</span>
                        </div>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-it-works-heading" className="relative scroll-mt-20 overflow-x-clip px-4 sm:px-6" id="how-it-works">
          <div className="relative mx-auto w-full max-w-6xl">
            <Guides bleed marks="top" rules="top" />
            <div className="px-6 py-10 sm:px-12">
              <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl" id="how-it-works-heading">
                How it works
              </h2>
            </div>
            <div className="relative">
              <Guides rules="top" sides={false} />
              <ol className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
                {STEPS.map((step, index) => (
                  <li className="flex flex-col gap-3 px-6 py-8 sm:px-12 md:px-8" key={step.title}>
                    <span className="flex size-8 items-center justify-center rounded-full border text-sm font-medium tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="relative overflow-x-clip px-4 sm:px-6">
          <div className="relative mx-auto grid w-full max-w-6xl gap-6 px-6 py-12 sm:px-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-12">
            <Guides bleed marks="top" rules="top" />
            <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl" id="faq-heading">
              Questions investors ask
            </h2>
            <Accordion collapsible defaultValue="faq-0" type="single">
              {FAQS.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`}>
                  <AccordionTrigger className="py-4 text-base">{item.question}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-muted-foreground">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="relative overflow-x-clip px-4 pb-16 sm:px-6">
          <div className="pricing-rail relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12">
            <Guides bleed marks="corners" />
            <div className="flex flex-col gap-2">
              <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">Ready to see your rate and leverage?</h2>
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                Check a DSCR or Fix &amp; Flip loan now. No credit check.
              </p>
            </div>
            <ShineButton className="shrink-0" onClick={props.onStart} size="xl" type="button">
              Check my rate
            </ShineButton>
          </div>
        </section>
      </main>
    </div>
  );
}
