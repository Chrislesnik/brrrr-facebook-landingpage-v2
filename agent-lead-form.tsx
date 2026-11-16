"use client";

import React from "react";
import {objections} from "./thank-you-objections";
import {LEAD_WEBHOOK_URL} from "./simple-lead-form";
import {trackMetaEvent} from "./meta-pixel";
import {useAddressAutocomplete} from "./use-address-autocomplete";
import type {SelectedAddress} from "./use-address-autocomplete";
import logoUrl from "./brrrr-logo-2025-11-11.png";

// Chat onboarding modeled on the agentic form in the reference reel:
// one question at a time, answers pinned across the top, then a confirm step.
// It collects the same lead the simple form does.

type StepId =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "bestFit"
  | "street"
  | "apt"
  | "city"
  | "state"
  | "zip"
  | "transaction"
  | "notes";

type Answers = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bestFit: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  transaction: string;
  notes: string;
};

type Chip = {label: string; value: string};

type ChatMessage = {
  kind: "agent" | "user";
  id: string;
  text: string;
  chips?: Chip[];
  selected?: string;
};

const EMPTY: Answers = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  bestFit: "",
  street: "",
  apt: "",
  city: "",
  state: "",
  zip: "",
  transaction: "",
  notes: "",
};

const DEAL_ORDER: StepId[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "bestFit",
  "street",
  "apt",
  "city",
  "state",
  "zip",
  "transaction",
  "notes",
];

const INFO_ORDER: StepId[] = ["firstName", "lastName", "email", "phone", "bestFit", "notes"];

const BASE_ORDER: StepId[] = ["firstName", "lastName", "email", "phone", "bestFit"];

const REQUIRED_DEAL: StepId[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "bestFit",
  "street",
  "city",
  "state",
  "zip",
  "transaction",
];

const STATE_ABBR: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
  dc: "DC",
};

const ABBR_SET = new Set(Object.keys(STATE_ABBR).map((k) => STATE_ABBR[k]));

function orderFor(a: Answers): StepId[] {
  if (a.bestFit === "I have a deal") return DEAL_ORDER;
  if (a.bestFit === "Looking for general info") return INFO_ORDER;
  return BASE_ORDER;
}

function requiredFor(a: Answers): StepId[] {
  if (a.bestFit === "I have a deal") return REQUIRED_DEAL;
  return BASE_ORDER;
}

function formatUsPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${a}`;
  if (digits.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

function parseState(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/\./g, "");
  if (/^[a-z]{2}$/.test(t)) {
    const abbr = t.toUpperCase();
    return ABBR_SET.has(abbr) ? abbr : null;
  }
  return STATE_ABBR[t] || null;
}

function parseBestFit(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (t.includes("deal")) return "I have a deal";
  if (t.includes("info") || t.includes("general") || t.includes("looking")) {
    return "Looking for general info";
  }
  return null;
}

function parseTransaction(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (t.includes("cash")) return "Refinance Cash Out";
  if (t.includes("rate") || t.includes("term")) return "Refinance Rate/Term";
  if (t === "purchase" || t === "buy" || t.includes("purchase")) return "Purchase";
  return null;
}

function satisfied(step: StepId, a: Answers): boolean {
  if (step === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email);
  if (step === "phone") return a.phone.replace(/\D/g, "").length === 10;
  if (step === "zip") return /^\d{5}$/.test(a.zip);
  if (step === "state") return ABBR_SET.has(a.state);
  if (step === "apt" || step === "notes") return false;
  return Boolean(a[step] && a[step].trim());
}

function isDone(step: StepId, a: Answers, passed: ReadonlySet<string>): boolean {
  if (step === "apt" || step === "notes") return passed.has(step);
  return satisfied(step, a);
}

function following(from: StepId, a: Answers, passed: ReadonlySet<string>): StepId | "review" {
  const order = orderFor(a);
  const idx = order.indexOf(from);
  for (let i = Math.max(0, idx) + 1; i < order.length; i++) {
    if (!isDone(order[i], a, passed)) return order[i];
  }
  return "review";
}

function formatAddress(a: Answers): string {
  const line1 = [a.street, a.apt].filter(Boolean).join(", ");
  const region = [a.state, a.zip].filter(Boolean).join(" ");
  const line2 = [a.city, region].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ");
}

function promptFor(step: StepId, a: Answers): string {
  switch (step) {
    case "firstName":
      return "What first name should I use?";
    case "lastName":
      return a.firstName
        ? `Welcome aboard, ${a.firstName} — you're in. What's your last name?`
        : "What's your last name?";
    case "email":
      return "What's the best email to reach you?";
    case "phone":
      return "And a phone number, so the team can reach you.";
    case "bestFit":
      return "Next step: what best describes where you are?";
    case "street":
      return "Great. Which property should we start with?\nType the address below.";
    case "apt":
      return "Any apartment or unit number?";
    case "city":
      return "What city is the property in?";
    case "state":
      return "Which state?";
    case "zip":
      return "And the ZIP code?";
    case "transaction":
      return "What kind of financing is this?";
    case "notes":
      return a.bestFit === "I have a deal"
        ? "Anything else the team should know about the deal?"
        : "Anything else you'd like us to know?";
    default:
      return "Go ahead.";
  }
}

function chipsFor(step: StepId): Chip[] | undefined {
  if (step === "bestFit") {
    return [
      {label: "I have a deal", value: "I have a deal"},
      {label: "Looking for general info", value: "Looking for general info"},
    ];
  }
  if (step === "transaction") {
    return [
      {label: "Purchase", value: "Purchase"},
      {label: "Refinance Cash Out", value: "Refinance Cash Out"},
      {label: "Refinance Rate/Term", value: "Refinance Rate/Term"},
    ];
  }
  if (step === "apt") return [{label: "No unit", value: "No unit"}];
  if (step === "notes") return [{label: "Nothing else", value: "Nothing else"}];
  return undefined;
}

function placeholderFor(step: StepId, phase: string): string {
  if (phase === "review") return "Message...";
  switch (step) {
    case "firstName":
      return "First name";
    case "lastName":
      return "Last name";
    case "email":
      return "you@company.com";
    case "phone":
      return "(xxx) xxx-xxxx";
    case "street":
      return "14 Alder Lane";
    case "apt":
      return "Apt or unit";
    case "city":
      return "City";
    case "state":
      return "State";
    case "zip":
      return "ZIP code";
    case "notes":
      return "Anything else...";
    default:
      return "Message...";
  }
}

type Applied = {error?: string; answers?: Answers; display?: string; pass?: StepId[]};

function applyAnswer(step: StepId, raw: string, a: Answers): Applied {
  const text = raw.trim();
  if (!text) return {error: "Type an answer and I'll keep going."};
  if (step === "firstName" || step === "lastName" || step === "city" || step === "street") {
    if (text.length > 120) return {error: "That's a little long. Try a shorter version."};
    return {answers: {...a, [step]: text}, display: text};
  }
  if (step === "email") {
    const email = text.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {error: "That email doesn't look complete yet. Try something like jane@domain.com."};
    }
    return {answers: {...a, email}, display: email};
  }
  if (step === "phone") {
    const phone = formatUsPhone(text);
    if (phone.replace(/\D/g, "").length !== 10) return {error: "I need a 10-digit US number."};
    return {answers: {...a, phone}, display: phone};
  }
  if (step === "bestFit") {
    const bestFit = parseBestFit(text);
    if (!bestFit) {
      return {error: "Pick the closest one: you have a deal, or you're looking for general info."};
    }
    return {answers: {...a, bestFit}, display: bestFit};
  }
  if (step === "apt") {
    if (/^(no unit|skip|none|n\/a|na)$/i.test(text)) {
      return {answers: {...a, apt: ""}, display: "No unit", pass: ["apt"]};
    }
    return {answers: {...a, apt: text}, display: text, pass: ["apt"]};
  }
  if (step === "state") {
    const state = parseState(text);
    if (!state) return {error: "I didn't catch that state. Try NJ, or New Jersey."};
    return {answers: {...a, state}, display: state};
  }
  if (step === "zip") {
    const zip = text.replace(/\D/g, "").slice(0, 5);
    if (zip.length !== 5) return {error: "ZIP codes are 5 digits."};
    return {answers: {...a, zip}, display: zip};
  }
  if (step === "transaction") {
    const transaction = parseTransaction(text);
    if (!transaction) return {error: "Pick Purchase, Refinance Cash Out, or Refinance Rate/Term."};
    return {answers: {...a, transaction}, display: transaction};
  }
  if (/^(nothing else|skip|none|n\/a|na)$/i.test(text)) {
    return {answers: {...a, notes: ""}, display: "Nothing else", pass: ["notes"]};
  }
  return {answers: {...a, notes: text}, display: text, pass: ["notes"]};
}

function stripLeadIn(raw: string): string {
  return raw.trim().replace(/^(actually[,:]?\s*)?(it'?s\s+|it is\s+)?/i, "").trim();
}

function guessStep(raw: string): StepId | null {
  const text = stripLeadIn(raw);
  if (!text) return null;
  if (text.includes("@")) return "email";
  if (parseTransaction(text) && text.length < 40) return "transaction";
  if (parseBestFit(text) && text.length < 48) return "bestFit";
  const digits = text.replace(/\D/g, "");
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))) return "phone";
  if (/^\d{5}$/.test(text)) return "zip";
  if (parseState(text) && text.length < 22 && !/\d/.test(text)) return "state";
  if (/^\d+\s+\S+/.test(text)) return "street";
  if (/^[a-zA-Z][a-zA-Z'’.-]+(?:\s+[a-zA-Z][a-zA-Z'’.-]+){1,2}$/.test(text)) return "firstName";
  return null;
}

function wait(ms: number) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return new Promise((resolve) => window.setTimeout(resolve, reduce ? 0 : ms));
}

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

const Pencil = () => (
  <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
    <path d="M13 7l4 4" />
  </svg>
);

const ArrowUp = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

const AgentMark = () => (
  <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50">
    <svg className="h-4 w-4 text-[#ff7a00]" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" strokeLinecap="round" />
      <path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5" strokeLinecap="round" />
      <path d="M5 14.5A8.5 8.5 0 0 1 12 3.5" strokeLinecap="round" />
    </svg>
  </span>
);

export default function AgentLeadForm() {
  const [phase, setPhase] = React.useState<"intro" | "chat" | "review" | "sending" | "done">("intro");
  const [step, setStep] = React.useState<StepId>("firstName");
  const [answers, setAnswers] = React.useState<Answers>(EMPTY);
  const [passed, setPassed] = React.useState<Set<string>>(() => new Set());
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [pickingEdit, setPickingEdit] = React.useState(false);
  const [sendProgress, setSendProgress] = React.useState(0);
  const [returnToReview, setReturnToReview] = React.useState(false);

  const answersRef = React.useRef(answers);
  const passedRef = React.useRef(passed);
  const stepRef = React.useRef(step);
  const phaseRef = React.useRef(phase);
  const returnRef = React.useRef(returnToReview);
  const busyRef = React.useRef(false);
  const sentRef = React.useRef(false);
  const leadTrackedRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  answersRef.current = answers;
  passedRef.current = passed;
  stepRef.current = step;
  phaseRef.current = phase;
  returnRef.current = returnToReview;

  const addressRootRef = React.useRef<HTMLDivElement>(null);
  const onAddressRef = React.useRef<(address: SelectedAddress) => void>(() => {});
  const addressAutocomplete = useAddressAutocomplete((address) => onAddressRef.current(address));

  React.useEffect(() => {
    if (phase === "done" && !leadTrackedRef.current) {
      leadTrackedRef.current = true;
      trackMetaEvent("Lead");
    }
  }, [phase]);

  const thanksRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    if (phase !== "done") return;
    thanksRef.current?.scrollIntoView({block: "start"});
  }, [phase]);

  React.useEffect(() => {
    if (phase === "done") return;
    bottomRef.current?.scrollIntoView({block: "end"});
  }, [messages, phase, typing, sendProgress, pickingEdit]);

  React.useEffect(() => {
    if (phase === "intro" || phase === "chat" || phase === "review") {
      inputRef.current?.focus();
    }
  }, [phase, step]);

  React.useEffect(() => {
    if (phase !== "sending") return;
    let cancelled = false;
    const total = answers.bestFit === "I have a deal" ? 3 : 2;
    (async () => {
      for (let i = 1; i <= total; i++) {
        await wait(620);
        if (cancelled) return;
        setSendProgress(i);
      }
      await wait(360);
      if (!cancelled) setPhase("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, answers.bestFit]);

  const pushAgent = React.useCallback(async (text: string, chips?: Chip[]) => {
    setTyping(true);
    await wait(360);
    setTyping(false);
    setMessages((m) => [...m, {kind: "agent", id: nextId(), text, chips}]);
  }, []);

  const advance = React.useCallback(
    async (from: StepId, nextAnswers: Answers, nextPassed: Set<string>, edited: boolean) => {
      const nxt = following(from, nextAnswers, nextPassed);
      if (nxt === "review") {
        setReturnToReview(false);
        setPhase("review");
        setPickingEdit(false);
        const lead = edited ? "Updated — that's everything I need." : "Got it — that's saved to your setup.";
        await pushAgent(`${lead}\nHere's everything you told me:`);
      } else {
        setStep(nxt);
        setPhase("chat");
        const prefix = edited && from !== "street" ? "Updated. " : "";
        const saved =
          from === "street"
            ? edited
              ? `Updated to ${nextAnswers.street}.\n`
              : "Got it — that's saved to your setup.\n"
            : "";
        await pushAgent(`${saved}${prefix}${promptFor(nxt, nextAnswers)}`, chipsFor(nxt));
      }
    },
    [pushAgent],
  );

  const commit = React.useCallback(
    async (raw: string, chipValue?: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const phaseNow = phaseRef.current;
        let text = raw;
        if (phaseNow === "review" || stepRef.current === "street") {
          const cleaned = stripLeadIn(text);
          if (cleaned) text = cleaned;
        }
        if (phaseNow === "review" && !chipValue) {
          const guessed = guessStep(text);
          if (!guessed) {
            setPickingEdit(true);
            setMessages((m) => [...m, {kind: "user", id: nextId(), text: text.trim()}]);
            setDraft("");
            await pushAgent("Which part should I update?");
            return;
          }
          setStep(guessed);
          stepRef.current = guessed;
        }
        const target = stepRef.current;
        let base = answersRef.current;
        // A free-text street correction shouldn't keep the previous city.
        if ((phaseNow === "review" || returnRef.current) && target === "street") {
          base = {...base, city: "", state: "", zip: ""};
        }
        // The name pin accepts "First Last" in one message. Intro asks for first name on its own.
        let nameDisplay = "";
        if (target === "firstName") {
          const parts = text.trim().split(/\s+/);
          if (parts.length >= 2) {
            base = {...base, lastName: parts.slice(1).join(" ")};
            text = parts[0];
            nameDisplay = `${parts[0]} ${parts.slice(1).join(" ")}`;
          }
        }
        const applied = applyAnswer(target, text, base);
        if (applied.error || !applied.answers || !applied.display) {
          await pushAgent(applied.error || "Try that once more.");
          return;
        }
        const nextAnswers = applied.answers;
        const nextPassed = new Set(passedRef.current);
        (applied.pass || []).forEach((p) => nextPassed.add(p));
        setAnswers(nextAnswers);
        setPassed(nextPassed);
        answersRef.current = nextAnswers;
        passedRef.current = nextPassed;
        setDraft("");
        const display = nameDisplay || applied.display;
        setMessages((m) => {
          const copy = m.map((msg) => ({...msg}));
          if (chipValue) {
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].kind === "agent" && copy[i].chips) {
                copy[i] = {...copy[i], selected: chipValue};
                break;
              }
            }
          }
          copy.push({kind: "user", id: nextId(), text: display});
          return copy;
        });
        const edited = phaseNow === "review" || returnRef.current;
        await advance(target, nextAnswers, nextPassed, edited);
      } finally {
        busyRef.current = false;
      }
    },
    [advance, pushAgent],
  );

  const beginEdit = React.useCallback(
    async (target: StepId) => {
      if (busyRef.current) return;
      setPickingEdit(false);
      setReturnToReview(true);
      returnRef.current = true;
      setStep(target);
      stepRef.current = target;
      setPhase("chat");
      busyRef.current = true;
      const ask =
        target === "firstName"
          ? "What name should I use? First and last is perfect."
          : promptFor(target, answersRef.current).replace(/^Welcome aboard.*?\n?/, "");
      await pushAgent(ask, chipsFor(target));
      busyRef.current = false;
    },
    [pushAgent],
  );

  onAddressRef.current = (address) => {
    if (stepRef.current !== "street" || busyRef.current) return;
    const nextPassed = new Set(passedRef.current);
    if (address.apt) nextPassed.add("apt");
    const nextAnswers: Answers = {
      ...answersRef.current,
      street: address.street || answersRef.current.street,
      apt: address.apt || answersRef.current.apt,
      city: address.city || answersRef.current.city,
      state: (address.stateAbbr || "").toUpperCase() || answersRef.current.state,
      zip: address.zip || answersRef.current.zip,
    };
    setAnswers(nextAnswers);
    setPassed(nextPassed);
    answersRef.current = nextAnswers;
    passedRef.current = nextPassed;
    setDraft("");
    addressAutocomplete.onInputChange("");
    setMessages((m) => [...m, {kind: "user", id: nextId(), text: formatAddress(nextAnswers) || nextAnswers.street}]);
    busyRef.current = true;
    void (async () => {
      await advance("street", nextAnswers, nextPassed, returnRef.current);
      busyRef.current = false;
    })();
  };

  const onDraftChange = (value: string) => {
    if (step === "phone" && phase !== "review") setDraft(formatUsPhone(value));
    else if (step === "zip" && phase !== "review") setDraft(value.replace(/\D/g, "").slice(0, 5));
    else setDraft(value);
    if (step === "street" && phase === "chat") addressAutocomplete.onInputChange(value);
  };

  const sendDraft = () => {
    const value = draft;
    if (!value.trim()) return;
    if (step === "street" && addressAutocomplete.open && addressAutocomplete.activeIndex >= 0) return;
    void commit(value);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (step === "street" && phase === "chat") addressAutocomplete.onKeyDown(e);
    if (e.key === "Enter" && !e.defaultPrevented) {
      e.preventDefault();
      sendDraft();
    }
  };

  const submit = () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSendProgress(0);
    setPhase("sending");
    const a = answersRef.current;
    const payload = {
      variant: "agent",
      firstName: a.firstName.trim(),
      lastName: a.lastName.trim(),
      email: a.email.trim(),
      phone: a.phone.trim(),
      address: {
        street: a.street.trim(),
        apt: a.apt.trim(),
        city: a.city.trim(),
        state: a.state,
        zip: a.zip,
      },
      transactionType: a.transaction || "",
      bestFit: a.bestFit || "",
      notes: a.notes || "",
    };
    void fetch(LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    }).catch(() => {
      // Same as the simple form: the visitor still sees thanks if the network call fails.
    });
  };

  const required = requiredFor(answers);
  const answered = required.filter((s) => satisfied(s, answers)).length;
  const pins = pinItems(answers);

  const editChoices: {step: StepId; label: string}[] = [
    {step: "firstName", label: "Name"},
    {step: "email", label: "Email"},
    {step: "phone", label: "Phone"},
    {step: "bestFit", label: "Where you are"},
  ];
  if (answers.bestFit === "I have a deal") {
    editChoices.push(
      {step: "street", label: "Property"},
      {step: "apt", label: "Unit"},
      {step: "city", label: "City"},
      {step: "state", label: "State"},
      {step: "zip", label: "ZIP"},
      {step: "transaction", label: "Financing"},
    );
  }
  editChoices.push({step: "notes", label: "Notes"});

  const sendItems =
    answers.bestFit === "I have a deal"
      ? ["Saving your contact info", "Noting the property", "Sending it to the lending team"]
      : ["Saving your contact info", "Sending it to the lending team"];

  return (
    <div className="agent-window flex w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(40,30,10,0.12)] ring-1 ring-black/5">
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="mx-auto rounded-full bg-neutral-100 px-3 py-1 text-[11px] tracking-wide text-neutral-500">
          onboarding
        </div>
        <span className="w-10" />
      </div>

      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <img alt="BRRRR Loans" className="h-6 w-auto max-w-[148px] shrink-0 object-contain sm:h-7 sm:max-w-none" src={logoUrl} />
        <div className="min-w-0 flex-1 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-neutral-500">
            <span className="agent-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" />
            <span className="sm:hidden">ONLINE</span>
            <span className="hidden sm:inline">ONBOARDING AGENT · ONLINE</span>
          </div>
        </div>
        <div className="relative">
          <button
            className="text-sm font-medium text-neutral-600"
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
          >
            Help
          </button>
          {helpOpen && (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-3 text-left text-sm leading-5 text-neutral-600 shadow-lg">
              Send this over and a lender follows up. Nothing here is a credit pull, and a quote doesn’t lock you in. You can change any answer before you confirm.
            </div>
          )}
        </div>
      </div>

      {phase !== "intro" && phase !== "done" && (
        <div className="border-t border-neutral-100 px-4 py-3 sm:px-5">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-[0.14em] text-neutral-400">
            <span>YOUR SETUP</span>
            <span className="text-[#ff7a00]">
              {phase === "review" || phase === "sending" || phase === "done"
                ? "FINAL STEP · REVIEW"
                : `${answered} OF ${required.length} ANSWERED`}
            </span>
          </div>
          <div className="flex gap-1">
            {required.map((s, i) => (
              <span
                key={s}
                className="h-1 flex-1 rounded-full"
                style={{
                  background:
                    i < answered || phase === "review" || phase === "sending" || phase === "done"
                      ? "#ff7a00"
                      : "#e7e5e4",
                }}
              />
            ))}
          </div>
          {pins.length > 0 && (
            <div className="agent-pins mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
              {pins.map((pin) => (
                <button
                  key={pin.step}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 py-1 pr-1.5 pl-2.5 text-xs text-neutral-700"
                  type="button"
                  onClick={() => void beginEdit(pin.step)}
                >
                  <span className="max-w-[140px] truncate">{pin.label}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-400">
                    <Pencil />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={
          "flex flex-col " +
          (phase === "chat" || phase === "review" || phase === "sending"
            ? "h-[min(640px,70dvh)] min-h-[420px]"
            : "min-h-[420px]")
        }
      >
        <div
          aria-live="polite"
          className={
            "space-y-4 px-4 py-5 sm:px-6 " +
            (phase === "chat" || phase === "review" || phase === "sending"
              ? "flex-1 overflow-y-auto"
              : "flex flex-1 flex-col")
          }
        >
          {phase === "intro" && (
            <div className="flex h-full flex-col items-center justify-center px-2 text-center">
              <h1 className="agent-serif text-[2rem] leading-tight text-neutral-900">Let’s get you set up.</h1>
              <p className="mt-3 max-w-sm text-[15px] leading-6 text-neutral-500">
                I’m the BRRRR onboarding agent. Start with your first name and I’ll take it from there.
              </p>
              <form
                className="mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = draft.trim();
                  if (!name || busyRef.current) return;
                  const next = {...answers, firstName: name};
                  setAnswers(next);
                  answersRef.current = next;
                  setDraft("");
                  setPhase("chat");
                  setStep("lastName");
                  setMessages([{kind: "user", id: nextId(), text: name}]);
                  busyRef.current = true;
                  void (async () => {
                    await pushAgent(promptFor("lastName", next));
                    busyRef.current = false;
                  })();
                }}
              >
                <input
                  ref={inputRef}
                  aria-label="First name"
                  autoComplete="given-name"
                  className="h-10 min-w-0 flex-1 bg-transparent px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                  data-testid="agent-input"
                  placeholder="First name"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  className="h-10 shrink-0 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white disabled:cursor-default"
                  data-testid="agent-go"
                  disabled={!draft.trim()}
                  type="submit"
                >
                  Go
                </button>
              </form>
            </div>
          )}

          {phase !== "intro" &&
            messages.map((msg) =>
              msg.kind === "user" ? (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="max-w-[85%] rounded-full bg-neutral-900 px-4 py-2 text-sm text-white">
                    {msg.text}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-400">
                    Sent <span className="text-[#16a34a]">✓</span> just now
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-2.5">
                  <AgentMark />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold tracking-[0.14em] text-neutral-400">BRRRR AGENT</div>
                    <p className="mt-1 text-[15px] leading-6 whitespace-pre-line text-neutral-800">{msg.text}</p>
                    {msg.chips && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.chips.map((chip) => {
                          const selected = msg.selected === chip.value;
                          return (
                            <button
                              key={chip.value}
                              className={
                                "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
                                (selected
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500")
                              }
                              data-testid="agent-chip"
                              disabled={Boolean(msg.selected) || phase !== "chat"}
                              type="button"
                              onClick={() => void commit(chip.value, chip.value)}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

          {typing && (
            <div className="flex items-center gap-2.5 text-sm text-neutral-400">
              <AgentMark />
              <span>Typing…</span>
            </div>
          )}

          {phase === "review" && (
            <div className="rounded-2xl border border-neutral-200 p-3">
              <dl>
                {summaryRows(answers).map((row) => (
                  <div key={row.label} className="flex items-center gap-3 border-b border-neutral-100 py-2.5 last:border-b-0">
                    <dt className="w-24 shrink-0 text-sm text-neutral-400">{row.label}</dt>
                    <dd className="min-w-0 flex-1 text-sm font-medium text-neutral-900">{row.value}</dd>
                    <button
                      aria-label={`Edit ${row.label}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
                      type="button"
                      onClick={() => void beginEdit(row.step)}
                    >
                      <Pencil />
                    </button>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-neutral-700">Does this look right?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                  data-testid="agent-looks-good"
                  type="button"
                  onClick={submit}
                >
                  Looks good ✓
                </button>
                <button
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
                  type="button"
                  onClick={() => setPickingEdit((v) => !v)}
                >
                  Make an edit
                </button>
              </div>
              {pickingEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {editChoices.map((choice) => (
                    <button
                      key={choice.step}
                      className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800"
                      type="button"
                      onClick={() => void beginEdit(choice.step)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "sending" && (
            <div className="flex items-start gap-2.5">
              <AgentMark />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-[0.14em] text-neutral-400">BRRRR AGENT</div>
                <p className="mt-1 text-[15px] text-neutral-800">Perfect. Sending this to the lending team…</p>
                <div className="mt-3 rounded-2xl border border-neutral-200 p-3">
                  <div className="mb-2 h-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#ff7a00] transition-all"
                      style={{width: `${(sendProgress / sendItems.length) * 100}%`}}
                    />
                  </div>
                  <ul className="space-y-1.5">
                    {sendItems.map((item, i) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                        <span className={i < sendProgress ? "text-[#16a34a]" : "text-neutral-300"}>
                          {i < sendProgress ? "✓" : "○"}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div>
              <h2 ref={thanksRef} className="agent-serif scroll-mt-6 text-3xl text-neutral-900">You’re all set.</h2>
              <p className="mt-2 text-[15px] leading-6 text-neutral-500">
                We received your request. Our team will reach out shortly.
              </p>
              <LightObjections />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {(phase === "chat" || phase === "review") && (
          <div ref={addressRootRef} className="relative px-4 pt-1 pb-4 sm:px-5">
            {phase === "chat" && step === "street" && addressAutocomplete.open && (
              <div className="absolute right-4 bottom-full left-4 z-30 mb-2 max-h-60 overflow-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg sm:right-5 sm:left-5">
                <div id={addressAutocomplete.listboxId} role="listbox">
                  {addressAutocomplete.suggestions.map((s, i) => (
                    <button
                      key={s.placeId}
                      className={
                        "w-full rounded-xl px-3 py-2 text-left " +
                        (i === addressAutocomplete.activeIndex ? "bg-neutral-100" : "")
                      }
                      id={addressAutocomplete.optionId(i)}
                      role="option"
                      type="button"
                      onMouseEnter={() => addressAutocomplete.setActiveIndex(i)}
                      onClick={() => void addressAutocomplete.select(s)}
                    >
                      <div className="text-sm text-neutral-900">{s.mainText}</div>
                      <div className="text-xs text-neutral-500">{s.secondaryText}</div>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1 text-[10px] text-neutral-400">Powered by Google</div>
              </div>
            )}
            <form
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                sendDraft();
              }}
            >
              <input
                ref={phase === "intro" ? undefined : inputRef}
                aria-autocomplete={step === "street" ? "list" : undefined}
                aria-controls={step === "street" ? addressAutocomplete.listboxId : undefined}
                aria-expanded={step === "street" ? addressAutocomplete.open : undefined}
                aria-label={placeholderFor(step, phase)}
                autoComplete={step === "email" ? "email" : step === "phone" ? "tel" : "off"}
                className="h-10 min-w-0 flex-1 bg-transparent px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                data-testid="agent-input"
                inputMode={step === "phone" || step === "zip" ? "numeric" : step === "email" ? "email" : "text"}
                placeholder={placeholderFor(step, phase)}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onFocus={step === "street" ? addressAutocomplete.onFocus : undefined}
                onKeyDown={onKeyDown}
              />
              <button
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white disabled:cursor-default"
                data-testid="agent-send"
                disabled={!draft.trim()}
                type="submit"
              >
                <ArrowUp />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function pinItems(a: Answers): {step: StepId; label: string}[] {
  const pins: {step: StepId; label: string}[] = [];
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  if (a.firstName && a.lastName) pins.push({step: "firstName", label: name});
  if (satisfied("email", a)) pins.push({step: "email", label: a.email});
  if (satisfied("phone", a)) pins.push({step: "phone", label: a.phone});
  if (a.bestFit) pins.push({step: "bestFit", label: a.bestFit});
  if (a.street) pins.push({step: "street", label: formatAddress(a)});
  if (a.transaction) pins.push({step: "transaction", label: a.transaction});
  return pins;
}

function summaryRows(a: Answers): {step: StepId; label: string; value: string}[] {
  const rows: {step: StepId; label: string; value: string}[] = [
    {step: "firstName", label: "Name", value: [a.firstName, a.lastName].filter(Boolean).join(" ")},
    {step: "email", label: "Email", value: a.email},
    {step: "phone", label: "Phone", value: a.phone},
    {step: "bestFit", label: "Where you are", value: a.bestFit},
  ];
  if (a.bestFit === "I have a deal") {
    rows.push({step: "street", label: "Property", value: formatAddress(a)});
    rows.push({step: "transaction", label: "Financing", value: a.transaction});
  }
  if (a.notes) rows.push({step: "notes", label: "Notes", value: a.notes});
  return rows;
}

function LightObjections() {
  return (
    <section className="mt-8">
      <h3 className="text-lg font-semibold text-neutral-900">Before we talk</h3>
      <p className="mt-1 text-sm text-neutral-500">What investors usually ask us first.</p>
      <div className="mt-2">
        {objections.map((o, i) => (
          <details key={o.question} className="border-b border-neutral-200 py-3" open={i === 0}>
            <summary className="cursor-pointer list-none font-semibold text-neutral-900">
              {o.question}
            </summary>
            <div className="pt-2 text-sm leading-6 text-neutral-600">
              {o.rates && (
                <div className="mb-3">
                  <p className="font-medium text-neutral-900">We go as low as:</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2">
                    {o.rates.map((r) => (
                      <div key={r.loan} className="rounded-xl bg-neutral-50 px-3 py-2.5">
                        <dt className="text-sm font-semibold text-neutral-900">{r.loan}</dt>
                        <dd className="text-2xl font-bold text-[#ff7a00] tabular-nums">{r.rate}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {o.answer}
              {o.quote && (
                <figure className="mt-3 border-l-2 border-[#ff7a00] pl-3">
                  <blockquote className="italic text-neutral-600">“{o.quote.text}”</blockquote>
                  <figcaption className="mt-1 text-xs text-neutral-400">{o.quote.source}</figcaption>
                </figure>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
