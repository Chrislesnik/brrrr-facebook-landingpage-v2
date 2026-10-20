"use client";

import React from "react";
import {Accordion, AccordionItem, cn} from "@heroui/react";

// Common pushback from leads, answered on the thank-you screen.
// Keep every answer true to current loan terms — check with the team before changing numbers.
export type Objection = {
  question: string;
  answer: string;
  // "As low as" rates, shown loan type first, then rate. Update these when rates move.
  rates?: {loan: string; rate: string}[];
  quote?: {text: string; source: string};
};

export const objections: Objection[] = [
  {
    question: "“Your rates are too high for my deal.”",
    answer:
      "Our rates are competitive, and your quote is priced on your actual deal, not a generic rate sheet. You’ll see the numbers upfront before you commit to anything.",
    rates: [
      {loan: "Fix and flip", rate: "9.99%"},
      {loan: "DSCR", rate: "6.875%"},
    ],
    // From Mark Santoro's review in google-reviews.ts
    quote: {text: "Never a last minute bait and switch of terms.", source: "Mark S., Google review"},
  },
  {
    question: "“I’ve never done a deal before.”",
    answer:
      "No experience is required for fix and flip loans. We’ll walk you through every step.",
  },
  {
    question: "“Will my credit score qualify?”",
    answer:
      "Our minimum credit score is 680. If you’re there, your rate and leverage depend on the whole deal, not just your score.",
  },
  {
    question: "“I can’t show W-2s or tax returns.”",
    answer:
      "You don’t need them. DSCR rental loans qualify on the property’s rent: no tax returns, no income or employment verification.",
  },
  {
    question: "“I don’t have much cash to put down.”",
    answer:
      "Fix and flip loans can cover up to 90% of the purchase and 100% of the rehab, up to 75% of the after-repair value.",
  },
  {
    question: "“I’m just shopping around.”",
    answer:
      "That’s fine. A quote doesn’t lock you in, and we’re happy to answer questions even if your deal is early.",
  },
];

export type ThankYouObjectionsProps = {
  className?: string;
};

export default function ThankYouObjections({className}: ThankYouObjectionsProps) {
  return (
    <section aria-labelledby="objections-heading" className={cn("w-full", className)}>
      <h2
        className="text-default-foreground text-xl leading-7 font-bold"
        id="objections-heading"
      >
        Before we talk
      </h2>
      <p className="text-small text-default-500 mt-1">What investors usually ask us first.</p>

      <Accordion
        className="mt-2 px-0"
        defaultExpandedKeys={["0"]}
        itemClasses={{
          trigger: "py-3",
          // The open question takes the brand orange so it's clear which answer is showing
          title:
            "text-default-foreground text-medium font-semibold data-[open=true]:text-[var(--color-primary)]",
          indicator: "text-default-500 data-[open=true]:text-[var(--color-primary)]",
          content: "text-default-500 text-small pt-0 pb-4 leading-6",
        }}
        variant="light"
      >
        {objections.map((o, i) => (
          <AccordionItem key={String(i)} aria-label={o.question} title={o.question}>
            {o.rates && (
              <div className="mb-3">
                <p className="text-default-foreground font-medium">We go as low as:</p>
                <dl className="mt-2 grid grid-cols-2 gap-2">
                  {o.rates.map((r) => (
                    <div key={r.loan} className="rounded-medium bg-content1 px-3 py-2.5">
                      <dt className="text-default-foreground text-small font-semibold">{r.loan}</dt>
                      <dd className="text-2xl leading-8 font-bold text-[var(--color-primary)] tabular-nums">
                        {r.rate}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {o.answer}
            {o.quote && (
              <figure className="border-l-3 mt-3 border-[var(--color-primary)] pl-3">
                <blockquote className="text-default-600 italic">“{o.quote.text}”</blockquote>
                <figcaption className="text-default-400 text-tiny mt-1">{o.quote.source}</figcaption>
              </figure>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
