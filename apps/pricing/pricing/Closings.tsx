import {useRef} from "react";
import Autoplay from "embla-carousel-autoplay";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent} from "@/components/ui/card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "@/components/ui/carousel";
import {Guides} from "@/components/ui/guides";

type Closing = {
  city: string;
  photo: string;
  alt: string;
  loanType: string;
  property?: string;
  purchase?: string;
  loan?: string;
  leverage?: string;
};

const CLOSINGS: Closing[] = [
  {
    city: "Wharton, NJ",
    photo: "/closings/wharton.jpg",
    alt: "Duplex in Wharton, New Jersey",
    loanType: "DSCR purchase",
    property: "Duplex",
    purchase: "$660,000",
    loan: "$495,000",
    leverage: "75% LTV",
  },
  {
    city: "Dover, NJ",
    photo: "/closings/dover.jpg",
    alt: "Single-family house in Dover, New Jersey",
    loanType: "DSCR purchase",
    property: "Single-family",
    purchase: "$419,000",
    loan: "$314,250",
    leverage: "75% LTV",
  },
  {
    city: "Miami, FL",
    photo: "/closings/miami.jpg",
    alt: "Single-family house in Miami, Florida",
    loanType: "Fix and flip",
    property: "Single-family",
    purchase: "$1,700,000",
    loan: "$1,807,795",
    leverage: "90% LTV",
  },
  {
    city: "Pittsburgh, PA",
    photo: "/closings/pittsburgh.jpg",
    alt: "Single-family house in Pittsburgh, Pennsylvania",
    loanType: "DSCR refinance",
    property: "Single-family",
    loan: "$418,400",
    leverage: "80% LTV",
  },
  {
    city: "Richmond, VA",
    photo: "/closings/richmond.jpg",
    alt: "Single-family house in Richmond, Virginia",
    loanType: "Fix and flip",
    property: "Single-family",
    loan: "$409,500",
    leverage: "90% LTC",
  },
];

type Objection = {
  question: string;
  answer: string;
  rates?: {loan: string; rate: string}[];
  quote?: {text: string; source: string};
};

const OBJECTIONS: Objection[] = [
  {
    question: "“Your rates are too high for my deal.”",
    answer:
      "Our rates are competitive, and your quote is priced on your actual deal, not a generic rate sheet. You’ll see the numbers upfront before you commit to anything.",
    rates: [
      {loan: "Fix and flip", rate: "9.99%"},
      {loan: "DSCR", rate: "6.875%"},
    ],
    quote: {text: "Never a last minute bait and switch of terms.", source: "Mark S., Google review"},
  },
  {
    question: "“I’ve never done a deal before.”",
    answer: "No experience is required for fix and flip loans. We’ll walk you through every step.",
  },
  {
    question: "“Will my credit score qualify?”",
    answer:
      "Our minimum credit score is 660. If you’re there, your rate and leverage depend on the whole deal, not just your score.",
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
    answer: "That’s fine. A quote doesn’t lock you in, and we’re happy to answer questions even if your deal is early.",
  },
];

function factsOf(closing: Closing) {
  return [
    closing.property ? ["Property", closing.property] : null,
    closing.purchase ? ["Purchase", closing.purchase] : null,
    closing.loan ? ["Loan", closing.loan] : null,
    closing.leverage ? ["Leverage", closing.leverage] : null,
  ].filter((row): row is [string, string] => row != null);
}

export default function Closings() {
  const autoplay = useRef(Autoplay({delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true}));

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section aria-labelledby="closings-heading" className="relative overflow-x-clip">
        <Guides bleed marks="top" rules="top" />
        <div className="px-5 py-4">
          <h2 className="text-lg font-medium tracking-tight" id="closings-heading">
            Recent closings
          </h2>
        </div>
        <div className="relative">
          <Guides rules="top" sides={false} />
          <Carousel opts={{loop: true}} plugins={[autoplay.current]}>
            <CarouselContent>
              {CLOSINGS.map((closing) => (
                <CarouselItem key={closing.city}>
                  <Card className="overflow-hidden border-0 shadow-none" size="sm">
                    <img alt={closing.alt} className="aspect-[5/2] w-full max-w-full object-cover" src={closing.photo} />
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold tracking-tight">{closing.city}</p>
                        <Badge variant="secondary">{closing.loanType}</Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {factsOf(closing).map(([label, value]) => (
                          <div className="flex flex-col" key={label}>
                            <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
                            <dd className="text-xs font-medium tabular-nums">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="top-10 bottom-auto my-0 start-2" />
            <CarouselNext className="top-10 bottom-auto my-0 end-2" />
          </Carousel>
        </div>
      </section>

      <section aria-labelledby="objections-heading" className="relative overflow-x-clip">
        <Guides bleed marks="top" rules="top" />
        <div className="flex flex-col gap-1 px-5 py-4">
          <h2 className="text-lg font-medium tracking-tight" id="objections-heading">
            Before we talk
          </h2>
          <p className="text-sm text-muted-foreground">What investors usually ask us first.</p>
        </div>
        <div className="relative px-5 pb-2">
          <Guides rules="top" sides={false} />
          <Accordion collapsible defaultValue="objection-0" type="single">
            {OBJECTIONS.map((item, index) => (
              <AccordionItem key={item.question} value={`objection-${index}`}>
                <AccordionTrigger className="py-3 text-left text-sm aria-expanded:text-primary">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
                  {item.rates ? (
                    <div className="mb-3">
                      <p className="font-medium text-foreground">We go as low as:</p>
                      <dl className="mt-2 grid grid-cols-2 gap-2">
                        {item.rates.map((rate) => (
                          <div className="rounded-lg bg-muted/60 px-3 py-2" key={rate.loan}>
                            <dt className="text-xs font-medium text-foreground">{rate.loan}</dt>
                            <dd className="text-xl font-semibold tabular-nums text-primary">{rate.rate}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                  <p>{item.answer}</p>
                  {item.quote ? (
                    <figure className="mt-3 border-s-2 border-primary ps-3">
                      <blockquote className="italic">“{item.quote.text}”</blockquote>
                      <figcaption className="mt-1 text-xs">{item.quote.source}</figcaption>
                    </figure>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
