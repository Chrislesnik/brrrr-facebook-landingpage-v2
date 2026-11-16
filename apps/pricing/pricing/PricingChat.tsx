import {Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore} from "react";
import type {KeyboardEvent} from "react";
import {ArrowUpIcon, PencilIcon, RotateCcwIcon} from "lucide-react";

import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Bubble, BubbleContent} from "@/components/ui/bubble";
import {Button} from "@/components/ui/button";
import {Guides} from "@/components/ui/guides";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle} from "@/components/ui/item";
import {Message, MessageAvatar, MessageContent} from "@/components/ui/message";
import {Progress, ProgressLabel} from "@/components/ui/progress";
import {ShineButton} from "@/components/ui/shine-button";
import {Spinner} from "@/components/ui/spinner";
import {cn} from "@/lib/utils";
import {useAddressAutocomplete, type SelectedAddress} from "../use-address-autocomplete";
import PricingHeader from "./PricingHeader";
import {
  FIELDS,
  STATE_OPTIONS,
  fieldByCode,
  fullAddress,
  isRequired,
  isVisible,
  leaseRowCount,
  missingRequired,
  unitBounds,
  type TableRow,
} from "./model";
import {formatWithCommas, sanitizeNumericRaw} from "./numeric-mask";
import {assignAmount, assignCount, assignOption, askJev} from "./jev";
import {loanOptionRows} from "./PricingControls";
import {RateBody, ScenarioActions} from "./PricingResult";
import PricingTerms from "./PricingTerms";
import {stateAbbreviation} from "./property-data";
import {visibleLoanOptions, type LoanOption} from "./quote";
import {
  beginQuote,
  markPricingFormOpen,
  readPricingLead,
  readQuoteSession,
  resumeQuote,
  subscribeQuote,
  type PricingLead,
  type QuoteSession,
} from "./quote-session";
import {
  authorizeApplicant,
  beginScenarioSave,
  readScenarioSave,
  resumeScenarioSave,
  subscribeScenarioSave,
} from "./scenario-save";
import {usePricingForm} from "./usePricingForm";

const CHAT_KEY = "pricing-chat";

/** Conversation order. Anything required that is missing here is asked after these. */
const ORDER = [
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "property_type",
  "number_of_units",
  "warrantability",
  "residential_gla_51",
  "as_is_value",
  "loan_type",
  "transaction_type",
  "bridge_type",
  "purchase_price",
  "payoff_amount",
  "rehab_budget",
  "arv",
  "request_max_leverage",
  "loan_amount",
  "initial_loan_amount",
  "annual_taxes",
  "annual_hoi",
  "leased_units",
  "borrower_type",
  "citizenship",
  "fico_score",
  "rentals_owned",
  "number_of_flips",
];

/** Not required by the engine, but worth asking in a conversation. */
const ALSO_ASK = new Set([
  "address_street",
  "address_city",
  "address_zip",
  "number_of_units",
  "request_max_leverage",
  "rentals_owned",
  "number_of_flips",
]);

const MUST_BE_POSITIVE = new Set([
  "purchase_price",
  "as_is_value",
  "arv",
  "rehab_budget",
  "loan_amount",
  "initial_loan_amount",
]);

const CHOICE_LABELS: Record<string, Record<string, string>> = {
  loan_type: {DSCR: "DSCR rental", Bridge: "Bridge or fix & flip"},
  transaction_type: {Purchase: "Buying it", "Refinance Rate/Term": "Rate/term refinance", "Refinance Cash Out": "Cash-out refinance"},
  request_max_leverage: {true: "The most you can lend", false: "A specific amount"},
};

type Ask = {key: string; code: string; row?: number; part?: "leased" | "rent"};
type Chip = {label: string; value: string};
type ChatMessage = {id: number; kind: "agent" | "user"; text: string; chips?: Chip[]; picked?: string; askKey?: string; result?: boolean};
type Phase = "chat" | "review" | "result";

let messageSeq = 0;
/** The prepay option on the card, so a follow-up talks about the one on screen. */
let shownOptionId = "";
let selectShownOption: (id: string) => void = () => {};

function readChat(): {answered: string[]; phase: Phase} | null {
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {answered?: unknown; phase?: unknown};
    if (!Array.isArray(parsed.answered)) return null;
    return {
      answered: parsed.answered.filter((item): item is string => typeof item === "string"),
      phase: parsed.phase === "review" || parsed.phase === "result" ? parsed.phase : "chat",
    };
  } catch {
    return null;
  }
}

function writeChat(answered: Set<string>, phase: Phase) {
  try {
    sessionStorage.setItem(CHAT_KEY, JSON.stringify({answered: [...answered], phase}));
  } catch {
    /* private mode */
  }
}

function clearChat() {
  try {
    sessionStorage.removeItem(CHAT_KEY);
  } catch {
    /* private mode */
  }
}

function asksFor(values: Record<string, string>): Ask[] {
  const wants = (code: string) => {
    if (!isVisible(code, values)) return false;
    if (code === "number_of_units") {
      const bounds = unitBounds(values.property_type);
      return bounds.min !== bounds.max;
    }
    return isRequired(code, values) || ALSO_ASK.has(code);
  };
  const codes = ORDER.filter(wants);
  for (const field of FIELDS) {
    if (!codes.includes(field.code) && isRequired(field.code, values)) codes.push(field.code);
  }
  const asks: Ask[] = [];
  for (const code of codes) {
    if (code === "leased_units") {
      for (let row = 0; row < leaseRowCount(values); row += 1) {
        asks.push({key: `lease:${row}:leased`, code, row, part: "leased"});
        asks.push({key: `lease:${row}:rent`, code, row, part: "rent"});
      }
    } else {
      asks.push({key: code, code});
    }
  }
  return asks;
}

function money(raw: string): string {
  const clean = sanitizeNumericRaw(raw ?? "");
  return clean ? `$${formatWithCommas(clean)}` : "";
}

/** Friendly chat labels stay on screen. The stored value is the same option the other forms post. */
function engineChoice(code: string, raw: string): string {
  const field = fieldByCode(code);
  const trimmed = raw.trim();
  if (!field) return trimmed;
  if (field.type === "state") return parseState(trimmed) || trimmed;
  if (field.type === "boolean") {
    if (trimmed === "true" || trimmed === "false") return trimmed;
    const hit = Object.entries(CHOICE_LABELS[code] ?? {}).find(([, label]) => label.toLowerCase() === trimmed.toLowerCase());
    return hit ? hit[0] : trimmed;
  }
  if (field.type === "dropdown" && field.options) {
    const exact = field.options.find((option) => option.toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact;
    const hit = Object.entries(CHOICE_LABELS[code] ?? {}).find(([, label]) => label.toLowerCase() === trimmed.toLowerCase());
    if (hit && field.options.includes(hit[0])) return hit[0];
  }
  return trimmed;
}

function leasedEngine(raw: string): string {
  if (raw === "Yes" || raw === "No") return raw;
  if (/^no\b|vacant/i.test(raw)) return "No";
  if (/^yes\b|leased/i.test(raw)) return "Yes";
  return raw;
}

function choicesOf(ask: Ask): Chip[] | undefined {
  if (ask.part === "leased") return [{label: "Yes, leased", value: "Yes"}, {label: "No, vacant", value: "No"}];
  if (ask.part === "rent") return undefined;
  const field = fieldByCode(ask.code);
  if (!field) return undefined;
  if (field.type === "boolean") {
    const labels = CHOICE_LABELS[field.code] ?? {};
    return ["true", "false"].map((value) => ({label: labels[value] ?? (value === "true" ? "Yes" : "No"), value}));
  }
  if (field.type !== "dropdown" || !field.options) return undefined;
  const labels = CHOICE_LABELS[field.code] ?? {};
  return field.options.map((option) => ({label: labels[option] ?? option, value: option}));
}

function leaseRow(tables: Record<string, TableRow[]>, row: number): TableRow {
  return tables.leased_units?.[row] ?? {leased: "", gross_rent: "", market_rent: ""};
}

function rentKey(tables: Record<string, TableRow[]>, row: number): "gross_rent" | "market_rent" {
  return leaseRow(tables, row).leased === "Yes" ? "gross_rent" : "market_rent";
}

function currentValue(ask: Ask, values: Record<string, string>, tables: Record<string, TableRow[]>): string {
  if (ask.row == null) return values[ask.code] ?? "";
  const row = leaseRow(tables, ask.row);
  return ask.part === "leased" ? row.leased ?? "" : row[rentKey(tables, ask.row)] ?? "";
}

function displayOf(ask: Ask, values: Record<string, string>, tables: Record<string, TableRow[]>): string {
  const raw = currentValue(ask, values, tables);
  if (ask.part === "leased") return raw === "Yes" ? "Leased" : raw === "No" ? "Vacant" : "";
  if (ask.part === "rent") return raw ? `${money(raw)}/mo` : "";
  const field = fieldByCode(ask.code);
  if (!field) return raw;
  if (ask.code === "address_street") return fullAddress(values) || raw;
  if (field.type === "currency") return money(raw);
  if (field.type === "boolean" || field.type === "dropdown") {
    return CHOICE_LABELS[field.code]?.[raw] ?? raw;
  }
  return raw;
}

function promptOf(ask: Ask, values: Record<string, string>, tables: Record<string, TableRow[]>): string {
  const units = leaseRowCount(values);
  if (ask.part === "leased") {
    return units > 1 ? `Is unit ${(ask.row ?? 0) + 1} leased right now?` : "Is the property leased right now?";
  }
  if (ask.part === "rent") {
    const unit = units > 1 ? ` for unit ${(ask.row ?? 0) + 1}` : "";
    return leaseRow(tables, ask.row ?? 0).leased === "Yes"
      ? `What's the monthly rent${unit}?`
      : `What do you expect it to rent for each month${unit}?`;
  }
  const purchase = values.transaction_type === "Purchase";
  switch (ask.code) {
    case "loan_type":
      return "What kind of loan are you pricing?";
    case "transaction_type":
      return "Are you buying the property, or refinancing one you own?";
    case "bridge_type":
      return "Which bridge loan fits the project?";
    case "address_street":
      return "What's the property address?\nStart typing and pick it from the list.";
    case "address_city":
      return "Which city is it in?";
    case "address_state":
      return "Which state?";
    case "address_zip":
      return "And the ZIP code?";
    case "property_type":
      return "What kind of property is it?";
    case "number_of_units": {
      const bounds = unitBounds(values.property_type);
      return `How many units? Anywhere from ${bounds.min} to ${bounds.max}.`;
    }
    case "warrantability":
      return "Is the condo warrantable?";
    case "residential_gla_51":
      return "Is at least 51% of the square footage residential?";
    case "purchase_price":
      return "What's the purchase price?";
    case "as_is_value":
      return purchase ? "What's it worth as-is today?" : "What's the property worth today?";
    case "payoff_amount":
      return "How much is owed on it today?";
    case "rehab_budget":
      return "What's the rehab budget?";
    case "arv":
      return "And the after-repair value?";
    case "request_max_leverage":
      return "Should I price the most we can lend, or a specific loan amount?";
    case "loan_amount":
      return "What loan amount do you want?";
    case "initial_loan_amount":
      return "How much do you want at closing?";
    case "annual_taxes":
      return "What are the yearly property taxes?";
    case "annual_hoi":
      return "And yearly homeowner's insurance?";
    case "borrower_type":
      return "Will you borrow in an entity, like an LLC, or as an individual?";
    case "citizenship":
      return "What's your citizenship status?";
    case "fico_score":
      return "What's your estimated FICO score?\nNothing gets pulled. A rough number is fine.";
    case "rentals_owned":
      return "How many rentals do you own today?";
    case "number_of_flips":
      return "How many flips have you completed?";
    default:
      return `What's the ${fieldByCode(ask.code)?.label.toLowerCase() ?? ask.code}?`;
  }
}

function placeholderOf(ask: Ask | null, phase: Phase): string {
  if (phase === "result") return "Ask about this rate, or what to change";
  if (!ask || phase === "review") return "Pick a row above to change it";
  if (ask.part === "rent") return "$0";
  const field = fieldByCode(ask.code);
  if (choicesOf(ask)) return "Pick an option above, or type it";
  if (ask.code === "address_street") return "123 Main St";
  if (ask.code === "address_state") return "NJ or New Jersey";
  if (ask.code === "address_zip") return "12345";
  if (field?.type === "currency") return "$0";
  if (field?.type === "number") return field.placeholder ?? "0";
  return field?.placeholder ?? "Type your answer";
}

function isMoney(ask: Ask | null): boolean {
  if (!ask) return false;
  return ask.part === "rent" || fieldByCode(ask.code)?.type === "currency";
}

function isCount(ask: Ask | null): boolean {
  if (!ask || ask.part) return false;
  return fieldByCode(ask.code)?.type === "number" || ask.code === "address_zip";
}

function parseState(raw: string): string {
  const text = raw.trim().toLowerCase().replace(/\./g, "");
  return STATE_OPTIONS.find((title) => title.toLowerCase() === text || stateAbbreviation(title).toLowerCase() === text) ?? "";
}

function matchChoice(raw: string, chips: Chip[]): string {
  const text = raw.trim().toLowerCase();
  if (!text) return "";
  const exact = chips.find((chip) => chip.value.toLowerCase() === text || chip.label.toLowerCase() === text);
  if (exact) return exact.value;
  const partial = chips.filter((chip) => chip.label.toLowerCase().includes(text) || chip.value.toLowerCase().includes(text));
  return partial.length === 1 ? partial[0].value : "";
}

type Parsed = {value: string; error?: undefined} | {value?: undefined; error: string};

const ADDRESS_CODES = ["address_street", "address_city", "address_state", "address_zip"];
const SEARCH_CODES = ["property_type", "number_of_units", "sq_footage", "rural", "annual_taxes", "annual_hoi", "as_is_value", "purchase_price"];

function addressReady(values: Record<string, string>, answered: Set<string>): boolean {
  return ADDRESS_CODES.every((code) => answered.has(code) && (values[code] ?? "").trim() !== "");
}

function searchLines(
  before: Record<string, string>,
  after: Record<string, string>,
  tablesBefore: Record<string, TableRow[]>,
  tablesAfter: Record<string, TableRow[]>,
): string[] {
  const lines: string[] = [];
  for (const code of SEARCH_CODES) {
    const next = (after[code] ?? "").trim();
    if (!next || next === (before[code] ?? "").trim()) continue;
    const ask: Ask = {key: code, code};
    lines.push(`${shortLabel(ask)}: ${displayOf(ask, after, tablesAfter)}`);
  }
  const rents = (tablesAfter.leased_units ?? []).map((row) => row.market_rent ?? "").filter((rent) => rent !== "");
  const previous = (tablesBefore.leased_units ?? []).map((row) => row.market_rent ?? "").join("\n");
  if (rents.length > 0 && rents.join("\n") !== previous) {
    lines.push(`Expected rent: ${rents.map((rent) => `${money(rent)}/mo`).join(", ")}`);
  }
  return lines;
}

function waitForLookup(status: () => "idle" | "loading"): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    let sawLoading = false;
    const tick = () => {
      const current = status();
      if (current === "loading") sawLoading = true;
      if (sawLoading && current === "idle") {
        resolve();
        return;
      }
      if (!sawLoading && Date.now() - start > 1500) {
        resolve();
        return;
      }
      if (Date.now() - start > 20000) {
        resolve();
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

async function interpret(ask: Ask, raw: string, values: Record<string, string>): Promise<Parsed> {
  const chips = choicesOf(ask);
  if (chips) {
    const exact = chips.find((chip) => chip.value.toLowerCase() === raw.trim().toLowerCase() || chip.label.toLowerCase() === raw.trim().toLowerCase());
    if (exact) return {value: exact.value};
    const label = ask.part === "leased" ? "whether the unit is leased" : fieldByCode(ask.code)?.label ?? ask.code;
    const assigned = await assignOption(raw, label, chips);
    if (assigned) return {value: assigned};
    return {error: `I couldn't match that. Pick one: ${chips.map((chip) => chip.label).join(", ")}.`};
  }
  if (ask.code === "address_state") {
    const state = parseState(raw);
    if (state) return {value: state};
    const assigned = await assignOption(raw, "State", STATE_OPTIONS.map((title) => ({value: title, label: title})));
    if (assigned) return {value: assigned};
    return {error: "I didn't catch that state. Try NJ, or New Jersey."};
  }
  if (isMoney(ask)) {
    const local = parseAnswer(ask, raw, values);
    if (!local.error && !/[a-z]/i.test(raw)) return local;
    const label = ask.part === "rent" ? "monthly rent" : fieldByCode(ask.code)?.label ?? "amount";
    const amount = await assignAmount(raw, label);
    if (amount && Number(amount) > 0) return {value: sanitizeNumericRaw(amount)};
    return local.error ? local : {error: "I need a dollar amount, like 350,000 or 400k."};
  }
  if (isCount(ask) && ask.code !== "address_zip") {
    const local = parseAnswer(ask, raw, values);
    if (!local.error && !/[a-z]/i.test(raw)) return local;
    const count = await assignCount(raw, fieldByCode(ask.code)?.label ?? "number");
    if (count) return parseAnswer(ask, count, values);
    return local.error ? local : {error: "I need a whole number."};
  }
  return parseAnswer(ask, raw, values);
}

function parseAnswer(ask: Ask, raw: string, values: Record<string, string>): Parsed {
  const text = raw.trim();
  if (!text) return {error: "Type an answer and I'll keep going."};
  const chips = choicesOf(ask);
  if (chips) {
    const value = matchChoice(text, chips);
    return value ? {value} : {error: `Pick one: ${chips.map((chip) => chip.label).join(", ")}.`};
  }
  if (isMoney(ask)) {
    const clean = sanitizeNumericRaw(text);
    const amount = Number(clean);
    if (!clean || !Number.isFinite(amount)) return {error: "I need a dollar amount, like 350,000."};
    if ((ask.part === "rent" || MUST_BE_POSITIVE.has(ask.code)) && amount <= 0) return {error: "That needs to be more than $0."};
    return {value: clean};
  }
  if (ask.code === "address_state") {
    const state = parseState(text);
    return state ? {value: state} : {error: "I didn't catch that state. Try NJ, or New Jersey."};
  }
  if (ask.code === "address_zip") {
    const zip = text.replace(/\D/g, "").slice(0, 5);
    return zip.length === 5 ? {value: zip} : {error: "ZIP codes are 5 digits."};
  }
  const field = fieldByCode(ask.code);
  if (field?.type === "number") {
    const count = Number(text.replace(/[^\d]/g, ""));
    if (!/\d/.test(text) || !Number.isFinite(count)) return {error: "I need a whole number."};
    if (ask.code === "fico_score" && (count < 300 || count > 850)) return {error: "FICO scores run from 300 to 850."};
    if (ask.code === "number_of_units") {
      const bounds = unitBounds(values.property_type);
      if (count < bounds.min || count > bounds.max) return {error: `Enter ${bounds.min} to ${bounds.max} units.`};
    }
    return {value: String(count)};
  }
  if (text.length > 120) return {error: "That's a little long. Try a shorter version."};
  return {value: text};
}

function pricingState(address: SelectedAddress): string {
  const name = address.stateName.trim().toLowerCase();
  return STATE_OPTIONS.find((option) => option.toLowerCase() === name) ?? parseState(address.stateAbbr);
}

function wait(ms: number) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return new Promise((resolve) => window.setTimeout(resolve, reduce ? 0 : ms));
}

function shortLabel(ask: Ask): string {
  if (ask.part === "leased") return `Unit ${(ask.row ?? 0) + 1}`;
  if (ask.part === "rent") return `Unit ${(ask.row ?? 0) + 1} rent`;
  const field = fieldByCode(ask.code);
  const labels: Record<string, string> = {
    loan_type: "Loan",
    transaction_type: "Transaction",
    bridge_type: "Bridge type",
    address_street: "Property",
    address_city: "City",
    address_state: "State",
    address_zip: "ZIP",
    property_type: "Property type",
    number_of_units: "Units",
    as_is_value: "As-is value",
    request_max_leverage: "Leverage",
    annual_taxes: "Taxes",
    annual_hoi: "Insurance",
    borrower_type: "Borrower",
    fico_score: "FICO",
    rentals_owned: "Rentals",
    number_of_flips: "Flips",
  };
  return labels[ask.code] ?? field?.label ?? ask.code;
}

function pinLabel(ask: Ask, values: Record<string, string>, tables: Record<string, TableRow[]>): string {
  const shown = displayOf(ask, values, tables);
  const type = fieldByCode(ask.code)?.type;
  if (type !== "currency" && type !== "number") return shown;
  const labels: Record<string, string> = {purchase_price: "Purchase", fico_score: "FICO"};
  return `${labels[ask.code] ?? shortLabel(ask)} ${shown}`;
}

type ResultReply = {text: string; editKey?: string; review?: boolean; selectId?: string};

/** A follow-up after the rate is on screen. Jev picks the intent; the numbers come from the quote. */
async function replyAboutResult(text: string, values: Record<string, string>): Promise<ResultReply> {
  const session = readQuoteSession();
  const options = session.status === "ready" ? visibleLoanOptions(session.result) : [];
  const shown = options.find((option) => option.id === shownOptionId) ?? recommendedOption(options);
  const asks = asksFor(values).filter((ask) => !ask.part);
  const fieldCriteria: Record<string, string> = {none: "They are not asking to change a specific answer."};
  for (const ask of asks) fieldCriteria[ask.key] = shortLabel(ask);
  const questions: Record<string, {type: "choice"; instructions: string; criteria: Record<string, string>}> = {
    intent: {
      type: "choice",
      instructions: "The borrower is looking at their priced loan in a chat and typed a follow-up. What do they want?",
      criteria: {
        rate: "The interest rate.",
        payment: "The monthly payment or PITIA.",
        amount: "The loan amount.",
        ltv: "The loan-to-value.",
        dscr: "The DSCR.",
        fee: "The origination fee.",
        program: "Which program they qualified for.",
        prepay: "The prepay choices.",
        change: "Change one answer and reprice.",
        edit: "Review the whole scenario.",
        sheet: "Download the term sheet.",
        apply: "Start the application.",
        other: "Something else, or it is unclear.",
      },
    },
    field: {
      type: "choice",
      instructions: "If they want to change one answer, which one? Choose none when they are not changing a specific answer.",
      criteria: fieldCriteria,
    },
  };
  if (options.length > 1) {
    const prepay: Record<string, string> = {none: "They are not choosing a prepay option."};
    for (const option of options) prepay[option.id] = option.label;
    questions.prepay = {
      type: "choice",
      instructions: "If they are choosing one of the prepay options, which one? Choose none otherwise.",
      criteria: prepay,
    };
  }
  const answers = await askJev(text, questions);
  const intent = answers?.intent?.choice;
  const intentOk = Boolean(intent && (answers?.intent?.confidence ?? 0) >= 0.45);
  const pickedIntent = intentOk ? intent : localIntent(text);
  const field = answers?.field?.choice;
  const fieldOk = Boolean(field && field !== "none" && field in fieldCriteria && (answers?.field?.confidence ?? 0) >= 0.45);
  const editKey = (fieldOk && field ? field : localField(text, asks)) ?? undefined;
  const prepayId = answers?.prepay?.choice;
  const prepayOk = Boolean(prepayId && prepayId !== "none" && options.some((option) => option.id === prepayId) && (answers?.prepay?.confidence ?? 0) >= 0.45);
  if (pickedIntent === "change" && editKey) {
    const ask = asks.find((item) => item.key === editKey);
    return {text: `Let's update ${ask ? shortLabel(ask).toLowerCase() : "that"}.`, editKey};
  }
  if (pickedIntent === "edit") return {text: "Here's the scenario. Change a row, then I'll price it again.", review: true};
  if (prepayOk && prepayId) {
    const option = options.find((item) => item.id === prepayId) ?? null;
    return {text: lineFor("prepay", option, session), selectId: prepayId};
  }
  return {text: lineFor(pickedIntent ?? "other", shown, session)};
}

function localIntent(text: string): string | null {
  const raw = text.toLowerCase();
  if (/term sheet|download/.test(raw)) return "sheet";
  if (/appl(y|ication)/.test(raw)) return "apply";
  if (/change|update|edit|what if|instead/.test(raw)) return "change";
  if (/\brate\b|interest|apr\b/.test(raw)) return "rate";
  if (/payment|pitia|per month|monthly/.test(raw)) return "payment";
  if (/loan amount|how much (can|do)/.test(raw)) return "amount";
  if (/ltv|loan to value|loan-to-value/.test(raw)) return "ltv";
  if (/dscr/.test(raw)) return "dscr";
  if (/origination|fee\b/.test(raw)) return "fee";
  if (/program|qualif/.test(raw)) return "program";
  if (/prepay|ppp/.test(raw)) return "prepay";
  return null;
}

function localField(text: string, asks: Ask[]): string | null {
  const raw = text.toLowerCase();
  const hits = asks.filter((ask) => raw.includes(shortLabel(ask).toLowerCase()));
  return hits.length === 1 ? hits[0].key : null;
}

function lineFor(intent: string, option: LoanOption | null, session: QuoteSession): string {
  if (session.status === "pending") return "Still pricing this. Give me a few seconds, then ask again.";
  if (session.status === "error") return session.message;
  if (!option || session.status !== "ready") {
    return "This scenario doesn't have a passing option. Tell me which answer to change and I'll price it again.";
  }
  const rows = Object.fromEntries(loanOptionRows(option).map((row) => [row.label, row.value]));
  const rate = rows["Interest rate"] ?? "—";
  const payment = rows["Monthly payment (PITIA)"] ?? "—";
  const amount = rows["Loan amount"] ?? "—";
  switch (intent) {
    case "rate":
      return `The interest rate on ${option.label} is ${rate}.`;
    case "payment":
      return `The monthly payment (PITIA) on ${option.label} is ${payment}.`;
    case "amount":
      return `The loan amount on ${option.label} is ${amount}.`;
    case "ltv":
      return `Loan-to-value on ${option.label} is ${rows["Loan-to-value"] ?? "—"}.`;
    case "dscr":
      return `DSCR on ${option.label} is ${rows.DSCR ?? "—"}.`;
    case "fee":
      return `The origination fee on ${option.label} is ${rows["Origination fee"] ?? "—"}.`;
    case "program":
      return `${option.program || "This program"} is the one on ${option.label}. The rate is ${rate}.`;
    case "prepay":
      return `You're on ${option.label}. The rate there is ${rate}. The other prepay choices are on the card.`;
    case "sheet":
      return "Tap Download term sheet on the card. It uses the prepay option that's selected.";
    case "apply":
      return "Tap Start application on the card. It continues with the option that's selected.";
    default:
      return `On ${option.label}, the rate is ${rate}, the loan amount is ${amount}, and the monthly payment is ${payment}. Ask about any of those, or tell me which answer to change.`;
  }
}

export default function PricingChat() {
  const form = usePricingForm();
  const stored = useState(readChat)[0];
  const [answered, setAnswered] = useState<Set<string>>(() => new Set(stored?.answered ?? []));
  const [phase, setPhase] = useState<Phase>(stored?.phase ?? "chat");
  const [current, setCurrent] = useState<Ask | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [turn, setTurn] = useState(0);

  const valuesRef = useRef(form.values);
  const tablesRef = useRef(form.tables);
  const answeredRef = useRef(answered);
  const busy = useRef(false);
  const lookupTold = useRef(false);
  const lookupRef = useRef(form.propertyLookup);
  const composerRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  valuesRef.current = form.values;
  tablesRef.current = form.tables;
  answeredRef.current = answered;
  lookupRef.current = form.propertyLookup;

  useEffect(() => {
    writeChat(answered, phase);
  }, [answered, phase]);

  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    const thread = scrollRef.current;
    if (!thread) return;
    const live = lastMessage?.result ? thread.querySelector("[data-result='live']") : null;
    if (live instanceof HTMLElement) {
      const top = live.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop;
      thread.scrollTo({top: Math.max(0, top - 8), behavior: "smooth"});
      return;
    }
    thread.scrollTo({top: thread.scrollHeight, behavior: "smooth"});
  }, [messages, typing, lastMessage]);

  useEffect(() => {
    if (!typing) composerRef.current?.querySelector("input")?.focus({preventScroll: true});
  }, [current, typing]);

  const say = useCallback(async (text: string, extra?: Partial<ChatMessage>) => {
    setTyping(true);
    await wait(420);
    setTyping(false);
    setMessages((list) => [...list, {id: ++messageSeq, kind: "agent", text, ...extra}]);
  }, []);

  const askNext = useCallback(
    async (lead?: string) => {
      const values = valuesRef.current;
      const tables = tablesRef.current;
      let next = asksFor(values).find((ask) => !answeredRef.current.has(ask.key)) ?? null;
      if (next && !next.code.startsWith("address_") && addressReady(values, answeredRef.current) && !lookupTold.current) {
        lookupTold.current = true;
        const before = {...values};
        const tablesBefore = tables;
        const where = fullAddress(values);
        await say(`${lead ? `${lead}\n` : ""}Looking up ${where}…`);
        lead = undefined;
        await waitForLookup(() => lookupRef.current);
        const found = searchLines(before, valuesRef.current, tablesBefore, tablesRef.current);
        await say(
          found.length > 0
            ? `Here's what came back:\n${found.join("\n")}\nWe'll go through these before the rest of the loan. Change anything that looks off.`
            : "I couldn't find property records for that address. We'll enter the details as we go.",
        );
        next = asksFor(valuesRef.current).find((ask) => !answeredRef.current.has(ask.key)) ?? null;
      }
      if (!next) {
        setCurrent(null);
        setPhase("review");
        await say(`${lead ? `${lead}\n` : ""}That's everything I need. Here's your scenario:`);
        return;
      }
      setCurrent(next);
      setPhase("chat");
      const latestValues = valuesRef.current;
      const latestTables = tablesRef.current;
      const chips = choicesOf(next);
      let text = promptOf(next, latestValues, latestTables);
      const field = fieldByCode(next.code);
      const prefilled = currentValue(next, latestValues, latestTables);
      const extraChips: Chip[] = [];
      if (prefilled && chips && SEARCH_CODES.includes(next.code)) {
        text += `\nThe property search came back with ${displayOf(next, latestValues, latestTables)}.`;
      }
      if (prefilled && !chips && next.code !== "address_street" && (next.part === "rent" || field?.initial == null)) {
        const shown = displayOf(next, latestValues, latestTables);
        text += `\nI have ${shown} on file. Use it, or type a different number.`;
        extraChips.push({label: `Use ${shown}`, value: prefilled});
      }
      await say(lead ? `${lead}\n${text}` : text, {chips: chips ?? (extraChips.length ? extraChips : undefined), askKey: next.key});
    },
    [say],
  );

  useEffect(() => {
    if (busy.current) return;
    busy.current = true;
    void (async () => {
      if (stored?.phase === "result") {
        setMessages([{id: ++messageSeq, kind: "agent", text: "", result: true}]);
        setPhase("result");
        busy.current = false;
        return;
      }
      if (answeredRef.current.size === 0) {
        setMessages([
          {
            id: ++messageSeq,
            kind: "agent",
            text: "Hi, I'm the BRRRR pricing agent. Start with the property address and I'll look it up before we get into the loan. Nothing here pulls your credit.",
          },
        ]);
        await askNext();
      } else {
        await askNext("Welcome back. Picking up where you left off.");
      }
      busy.current = false;
    })();
  }, [askNext]);

  useEffect(() => {
    if (turn === 0) return;
    busy.current = true;
    void (async () => {
      await askNext();
      busy.current = false;
    })();
  }, [turn, askNext]);

  const store = (ask: Ask, value: string) => {
    if (ask.row != null) {
      if (ask.part === "leased") form.setCell("leased_units", ask.row, "leased", leasedEngine(value));
      else form.setCell("leased_units", ask.row, rentKey(tablesRef.current, ask.row), value);
      return;
    }
    const field = fieldByCode(ask.code);
    const posted =
      field && (field.type === "dropdown" || field.type === "boolean" || field.type === "state") ? engineChoice(ask.code, value) : value;
    form.setValue(ask.code, posted);
  };

  const markAnswered = (keys: string[]) => {
    const next = new Set(answeredRef.current);
    for (const key of keys) next.add(key);
    answeredRef.current = next;
    setAnswered(next);
  };

  const commit = async (raw: string, chipValue?: string) => {
    if (phase === "result") {
      await discuss(raw);
      return;
    }
    const ask = current;
    if (!ask || busy.current || typing) return;
    busy.current = true;
    let parsed: Parsed;
    if (chipValue != null) parsed = {value: chipValue};
    else {
      setTyping(true);
      parsed = await interpret(ask, raw, valuesRef.current);
      setTyping(false);
    }
    const shownRaw = raw.trim();
    setMessages((list) => {
      const copy = [...list];
      if (chipValue != null) {
        for (let i = copy.length - 1; i >= 0; i -= 1) {
          if (copy[i].kind === "agent" && copy[i].chips) {
            copy[i] = {...copy[i], picked: chipValue};
            break;
          }
        }
      }
      return copy;
    });
    if (parsed.error != null) {
      setMessages((list) => [...list, {id: ++messageSeq, kind: "user", text: shownRaw}]);
      setDraft("");
      await say(parsed.error);
      busy.current = false;
      return;
    }
    store(ask, parsed.value);
    if (ask.code === "address_street") places.onInputChange("");
    const shown =
      chipValue != null
        ? choicesOf(ask)?.find((chip) => chip.value === chipValue)?.label ?? displayOf(ask, {...valuesRef.current, [ask.code]: chipValue}, tablesRef.current)
        : isMoney(ask)
          ? money(parsed.value) + (ask.part === "rent" ? "/mo" : "")
          : parsed.value;
    setMessages((list) => [...list, {id: ++messageSeq, kind: "user", text: shown}]);
    setDraft("");
    if (ask.code === "address_street") lookupTold.current = false;
    markAnswered([ask.key]);
    setCurrent(null);
    busy.current = false;
    setTurn((value) => value + 1);
  };

  const places = useAddressAutocomplete((address) => {
    if (current?.code !== "address_street" || busy.current) return;
    lookupTold.current = false;
    form.setValue("address_street", address.street);
    if (address.apt) form.setValue("address_apt", address.apt);
    if (address.city) form.setValue("address_city", address.city);
    if (address.zip) form.setValue("address_zip", address.zip);
    if (address.county) form.setValue("address_county", address.county);
    const state = pricingState(address);
    if (state) form.setValue("address_state", state);
    const keys = ["address_street"];
    if (address.city) keys.push("address_city");
    if (state) keys.push("address_state");
    if (address.zip) keys.push("address_zip");
    const line = [address.street, address.apt].filter(Boolean).join(" ");
    const region = [state ? stateAbbreviation(state) : "", address.zip].filter(Boolean).join(" ");
    setMessages((list) => [...list, {id: ++messageSeq, kind: "user", text: [line, address.city, region].filter(Boolean).join(", ")}]);
    setDraft("");
    places.onInputChange("");
    markAnswered(keys);
    setCurrent(null);
    setTurn((value) => value + 1);
  });

  const beginEdit = async (key: string, lead = "Sure, let's change that.") => {
    if (busy.current || typing) return;
    const ask = asksFor(valuesRef.current).find((item) => item.key === key);
    if (!ask) return;
    const next = new Set(answeredRef.current);
    next.delete(key);
    if (ADDRESS_CODES.includes(key)) lookupTold.current = false;
    if (key === "address_street") ["address_city", "address_state", "address_zip"].forEach((code) => next.delete(code));
    answeredRef.current = next;
    setAnswered(next);
    busy.current = true;
    await askNext(lead);
    busy.current = false;
  };

  const discuss = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy.current || typing) return;
    busy.current = true;
    setMessages((list) => [...list, {id: ++messageSeq, kind: "user", text}]);
    setDraft("");
    setTyping(true);
    const reply = await replyAboutResult(text, valuesRef.current);
    setTyping(false);
    if (reply.selectId) selectShownOption(reply.selectId);
    if (reply.editKey) {
      busy.current = false;
      await beginEdit(reply.editKey, reply.text);
      return;
    }
    await say(reply.text);
    if (reply.review) setPhase("review");
    busy.current = false;
  };

  const calculate = async () => {
    if (busy.current) return;
    const missing = missingRequired(valuesRef.current, tablesRef.current);
    const blocked = missing[0] ?? (form.messages.number_of_units ? "number_of_units" : "");
    if (blocked) {
      const next = new Set(answeredRef.current);
      for (const ask of asksFor(valuesRef.current)) {
        if (ask.code === blocked) next.delete(ask.key);
      }
      answeredRef.current = next;
      setAnswered(next);
      busy.current = true;
      await askNext("One more thing before I price it.");
      busy.current = false;
      return;
    }
    form.ask("all");
    markPricingFormOpen();
    beginQuote(valuesRef.current, tablesRef.current, "/pricing/chat");
    setMessages((list) => [...list, {id: ++messageSeq, kind: "agent", text: "", result: true}]);
    setPhase("result");
  };

  const startOver = () => {
    if (busy.current) return;
    form.resetForm();
    clearChat();
    lookupTold.current = false;
    const empty = new Set<string>();
    answeredRef.current = empty;
    setAnswered(empty);
    setPhase("chat");
    setDraft("");
    setMessages([{id: ++messageSeq, kind: "agent", text: "Starting fresh."}]);
    setTurn((value) => value + 1);
  };

  const onDraftChange = (value: string) => {
    if (isMoney(current)) {
      const clean = sanitizeNumericRaw(value);
      setDraft(clean ? `$${formatWithCommas(clean)}` : "");
    } else if (isCount(current)) {
      setDraft(value.replace(/[^\d]/g, "").slice(0, current?.code === "address_zip" ? 5 : 6));
    } else {
      setDraft(value);
    }
    if (current?.code === "address_street") places.onInputChange(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (current?.code === "address_street") places.onKeyDown(event);
    if (event.key === "Enter" && !event.defaultPrevented) {
      event.preventDefault();
      if (current?.code === "address_street" && places.open && places.activeIndex >= 0) return;
      if (draft.trim()) void commit(draft);
    }
  };

  const asks = asksFor(form.values);
  const done = asks.filter((ask) => answered.has(ask.key)).length;
  const pins = asks.filter((ask) => answered.has(ask.key) && !ask.part && !["address_city", "address_state", "address_zip"].includes(ask.code));
  const latestChips = [...messages].reverse().find((message) => message.kind === "agent" && message.askKey);
  const lastResultId = [...messages].reverse().find((message) => message.result)?.id;

  // The thread fills the window for the whole conversation, including the rate card, so the composer stays on screen.
  const fitWindow = true;

  return (
    <div className={cn("pricing-page w-full", fitWindow ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen")}>
      <PricingHeader
        action={
          <Button onClick={startOver} size="sm" type="button" variant="ghost">
            <RotateCcwIcon data-icon="inline-start" />
            <span className="max-sm:sr-only">Start over</span>
          </Button>
        }
        className="max-w-3xl"
        label="Your rate"
        onToggle={form.toggleColorScheme}
        scheme={form.scheme}
      />
      <main className={cn("w-full px-4 sm:px-6", fitWindow ? "flex min-h-0 flex-1 flex-col py-3 md:py-6" : "py-8 md:py-12")}>
        <div className={cn("mx-auto flex w-full max-w-3xl flex-col", fitWindow ? "min-h-0 flex-1 gap-3" : "gap-6")}>
          <div className={cn("flex max-w-xl shrink-0 flex-col gap-1", fitWindow && "[@media(max-height:760px)]:gap-0")}>
            <h1 className="text-balance text-xl font-semibold tracking-tight">Check your rate</h1>
            <p className="text-pretty text-sm text-muted-foreground [@media(max-height:760px)]:hidden">
              Answer a few questions about the deal and we'll price it. Nothing here pulls your credit.
            </p>
          </div>

          <div className={cn("relative flex flex-col bg-background", fitWindow && "min-h-0 flex-1")}>
            <Guides extend="sm" marks="corners" />

            <div className="flex shrink-0 flex-col gap-3 px-5 py-4 sm:px-6">
              <Progress value={phase === "chat" ? (asks.length ? (done / asks.length) * 100 : 0) : 100}>
                <ProgressLabel>Your scenario</ProgressLabel>
                <span aria-live="polite" className="ms-auto text-sm tabular-nums text-muted-foreground">
                  {phase === "result" ? "Priced" : phase === "review" ? "Ready to price" : `${done} of ${asks.length} answered`}
                </span>
              </Progress>
              {pins.length > 0 ? (
                <div className="scrollbar-none flex scroll-fade-x gap-2 overflow-x-auto overscroll-x-contain">
                  {pins.map((ask) => (
                    <Button
                      aria-label={`Change ${shortLabel(ask)}`}
                      className="max-w-56 shrink-0"
                      key={ask.key}
                      onClick={() => void beginEdit(ask.key)}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      <span className="truncate">{pinLabel(ask, form.values, form.tables)}</span>
                      <PencilIcon data-icon="inline-end" />
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={cn("relative flex flex-col", fitWindow && "min-h-0 flex-1")}>
              <Guides marks="top" rules="top" sides={false} />
              <div
                aria-live="polite"
                className={cn(
                  "flex flex-col gap-5 px-5 py-6 sm:px-6",
                  fitWindow && "min-h-0 flex-1 overflow-y-auto",
                )}
                ref={scrollRef}
              >
                {messages.map((message) =>
                  message.result ? (
                    <Message data-result={message.id === lastResultId ? "live" : undefined} key={message.id}>
                      <AgentAvatar />
                      <MessageContent>
                        {message.id === lastResultId ? (
                          <ChatResult onEdit={() => setPhase("review")} stale={phase !== "result"} />
                        ) : (
                          <Bubble variant="muted">
                            <BubbleContent>I priced this earlier. The latest numbers are below.</BubbleContent>
                          </Bubble>
                        )}
                      </MessageContent>
                    </Message>
                  ) : message.kind === "user" ? (
                    <Message align="end" key={message.id}>
                      <MessageContent>
                        <Bubble align="end">
                          <BubbleContent>{message.text}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  ) : (
                    <Message key={message.id}>
                      <AgentAvatar />
                      <MessageContent>
                        <Bubble variant="muted">
                          <BubbleContent className="whitespace-pre-line">{message.text}</BubbleContent>
                        </Bubble>
                        {message.chips ? (
                          <div className="flex flex-wrap gap-2">
                            {message.chips.map((chip) => {
                              const picked = message.picked === chip.value;
                              const live = message === latestChips && phase === "chat" && !message.picked && !typing;
                              return (
                                <Button
                                  disabled={!live && !picked}
                                  key={chip.value}
                                  onClick={live ? () => void commit(chip.label, chip.value) : undefined}
                                  size="sm"
                                  type="button"
                                  variant={picked ? "default" : "outline"}
                                >
                                  {chip.label}
                                </Button>
                              );
                            })}
                          </div>
                        ) : null}
                      </MessageContent>
                    </Message>
                  ),
                )}

                {typing ? (
                  <Message>
                    <AgentAvatar />
                    <MessageContent>
                      <Bubble variant="muted">
                        <BubbleContent className="flex items-center gap-2 text-muted-foreground">
                          <Spinner className="size-3.5" />
                          Typing…
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                ) : null}

                {phase === "review" && !typing ? (
                  <div className="flex flex-col gap-4 rounded-xl border p-2">
                    <ItemGroup>
                      {asks.map((ask, index) => (
                        <Fragment key={ask.key}>
                          {index > 0 ? <ItemSeparator /> : null}
                          <Item size="xs">
                            <ItemContent className="flex-row items-center gap-3">
                              <ItemDescription className="w-28 shrink-0">{shortLabel(ask)}</ItemDescription>
                              <ItemTitle className="min-w-0 truncate">{displayOf(ask, form.values, form.tables)}</ItemTitle>
                            </ItemContent>
                            <ItemActions>
                              <Button
                                aria-label={`Change ${shortLabel(ask)}`}
                                onClick={() => void beginEdit(ask.key)}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <PencilIcon />
                              </Button>
                            </ItemActions>
                          </Item>
                        </Fragment>
                      ))}
                    </ItemGroup>
                    <div className="flex flex-col gap-3 px-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">Does this look right?</p>
                      <ShineButton onClick={() => void calculate()} size="xl" type="button">
                        Get my rate
                      </ShineButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative shrink-0 px-5 py-4 sm:px-6" ref={places.rootRef}>
              <Guides marks="top" rules="top" sides={false} />
              {current?.code === "address_street" && places.open ? (
                <div className="suggestions-in absolute right-5 bottom-full left-5 z-30 mb-1 max-h-72 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md sm:right-6 sm:left-6">
                  <div aria-label="Address suggestions" className="flex flex-col" id={places.listboxId} role="listbox">
                    {places.suggestions.map((suggestion, index) => (
                      <button
                        aria-selected={index === places.activeIndex}
                        className={cn("rounded-sm px-2 py-1.5 text-left outline-none", index === places.activeIndex && "bg-accent text-accent-foreground")}
                        id={places.optionId(index)}
                        key={suggestion.placeId}
                        onClick={() => void places.select(suggestion)}
                        onMouseEnter={() => places.setActiveIndex(index)}
                        role="option"
                        tabIndex={-1}
                        type="button"
                      >
                        <span className="block text-sm">{suggestion.mainText}</span>
                        {suggestion.secondaryText ? <span className="block text-xs text-muted-foreground">{suggestion.secondaryText}</span> : null}
                      </button>
                    ))}
                  </div>
                  <p className="px-2 pt-1 pb-0.5 text-[10px] text-muted-foreground">Powered by Google</p>
                </div>
              ) : null}
              <form
                ref={composerRef}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (draft.trim()) void commit(draft);
                }}
              >
                <InputGroup className="h-10">
                  <InputGroupInput
                    aria-activedescendant={current?.code === "address_street" && places.activeIndex >= 0 ? places.optionId(places.activeIndex) : undefined}
                    aria-autocomplete={current?.code === "address_street" ? "list" : undefined}
                    aria-controls={current?.code === "address_street" ? places.listboxId : undefined}
                    aria-expanded={current?.code === "address_street" ? places.open : undefined}
                    aria-label={placeholderOf(current, phase)}
                    autoComplete="off"
                    className="h-10 px-3"
                    disabled={phase === "review" || (phase === "chat" && !current)}
                    inputMode={isMoney(current) ? "decimal" : isCount(current) ? "numeric" : "text"}
                    onChange={(event) => onDraftChange(event.target.value)}
                    onFocus={current?.code === "address_street" ? places.onFocus : undefined}
                    onKeyDown={onKeyDown}
                    placeholder={placeholderOf(current, phase)}
                    role={current?.code === "address_street" ? "combobox" : undefined}
                    value={draft}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Send"
                      disabled={!draft.trim() || typing || phase === "review" || (phase === "chat" && !current)}
                      size="icon-sm"
                      type="submit"
                      variant="default"
                    >
                      <ArrowUpIcon />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>
            </div>
          </div>

          <p className={cn("text-xs text-muted-foreground", fitWindow ? "shrink-0 [@media(max-height:760px)]:hidden" : undefined)}>
            Rates shown are an illustration, not a commitment to lend.
          </p>
        </div>
      </main>
    </div>
  );
}

function passedProgram(session: QuoteSession): QuoteProgramName | null {
  if (session.status !== "ready") return null;
  return session.result.programs.find((program) => program.pass !== false)?.name ?? null;
}

type QuoteProgramName = string;

function recommendedOption(options: LoanOption[]): LoanOption | null {
  return options.find((option) => option.recommended) ?? options[0] ?? null;
}

function ChatResult(props: {onEdit: () => void; stale: boolean}) {
  const session = useSyncExternalStore(subscribeQuote, readQuoteSession, readQuoteSession);
  const save = useSyncExternalStore(subscribeScenarioSave, readScenarioSave, readScenarioSave);
  const [lead, setLead] = useState<PricingLead | null>(() => readPricingLead());
  const [selectedId, setSelectedId] = useState("");
  const locked = lead == null && session.status !== "idle";
  const options = session.status === "ready" ? visibleLoanOptions(session.result) : [];
  const recommended = recommendedOption(options);
  const recommendedId = recommended?.id ?? "";
  const optionKey = options.map((option) => option.label).join("|");
  const shown = options.find((option) => option.id === selectedId) ?? recommended;
  const qualified = Boolean(shown || passedProgram(session));
  const failed =
    session.status === "ready" &&
    !qualified &&
    (session.result.programs.length > 0 || (session.result.options?.length ?? 0) > 0);
  const programName = shown?.program || passedProgram(session) || "This program";
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
        : "Calculate a scenario to see a rate.";

  useEffect(() => {
    resumeQuote();
    resumeScenarioSave();
  }, []);

  useEffect(() => {
    selectShownOption = setSelectedId;
    return () => {
      selectShownOption = () => {};
    };
  }, []);

  useEffect(() => {
    if (shown?.id) shownOptionId = shown.id;
  }, [shown?.id]);

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
    <div className="flex min-w-0 flex-col gap-3">
      <Bubble variant="muted">
        <BubbleContent className="whitespace-pre-line">
          {heading}
          {"\n"}
          {detail}
          {props.stale ? "\nThese figures are from the last price." : ""}
        </BubbleContent>
      </Bubble>
      <div
        aria-hidden={(locked && session.status !== "pending") || undefined}
        className={locked && session.status !== "pending" ? "pointer-events-none select-none blur-xl" : undefined}
      >
        <RateBody
          footer={qualified && !locked ? <ScenarioActions lead={lead} optionId={shown?.id ?? ""} save={save} /> : null}
          onSelect={setSelectedId}
          revealed={!locked}
          selectedId={shown?.id ?? ""}
          session={session}
        />
      </div>
      <PricingTerms onEdit={props.onEdit} onSaved={setLead} open={locked} />
    </div>
  );
}

function AgentAvatar() {
  return (
    <MessageAvatar className="self-start">
      <Avatar size="sm">
        <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">B</AvatarFallback>
      </Avatar>
    </MessageAvatar>
  );
}
