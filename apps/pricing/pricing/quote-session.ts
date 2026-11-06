import type {TableRow} from "./model";
import {requestPricingQuote, type QuoteResult} from "./quote";

const DRAFT_KEY = "pricing-form-draft";
const OPEN_KEY = "pricing-form-open";

export type PricingDraft = {
  entered: Record<string, string>;
  tables: Record<string, TableRow[]>;
  touched: Record<string, boolean>;
};

export function readPricingDraft(): PricingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PricingDraft;
    if (!parsed?.entered || !parsed.tables) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePricingDraft(draft: PricingDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function pricingFormIsOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPricingFormOpen() {
  try {
    sessionStorage.setItem(OPEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

const QUOTE_KEY = "pricing-quote-result";
const INPUTS_KEY = "pricing-quote-inputs";
const RETURN_KEY = "pricing-return-path";
const LEAD_KEY = "pricing-lead";

const RETURN_PATHS = ["/pricing", "/pricing/scenario", "/pricing/steps"];

export type QuoteSession =
  | {status: "idle"}
  | {status: "pending"; requestId: number; returnTo: string}
  | {status: "ready"; requestId: number; returnTo: string; result: QuoteResult}
  | {status: "error"; requestId: number; returnTo: string; message: string};

export type PricingLead = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type QuoteInputs = {
  values: Record<string, string>;
  tables: Record<string, TableRow[]>;
};

const IDLE: QuoteSession = {status: "idle"};
const listeners = new Set<() => void>();
const running = new Set<number>();
let serial = 0;
let activeRequest = 0;
let snapshot: QuoteSession = IDLE;
let snapshotRaw: string | null = null;

function storageGet(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function storageSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function allowedReturn(path: string): string {
  return RETURN_PATHS.includes(path) ? path : "/pricing";
}

function parseSession(raw: string): QuoteSession {
  if (!raw) return IDLE;
  try {
    const parsed = JSON.parse(raw) as QuoteSession & QuoteResult;
    if (parsed?.status === "pending" || parsed?.status === "error") {
      return {...parsed, returnTo: allowedReturn(parsed.returnTo)};
    }
    if (parsed?.status === "ready" && parsed.result && Array.isArray(parsed.result.programs)) {
      return {...parsed, returnTo: allowedReturn(parsed.returnTo)};
    }
    if (Array.isArray(parsed?.programs) && Array.isArray(parsed?.missing)) {
      return {status: "ready", requestId: 0, returnTo: allowedReturn(storageGet(RETURN_KEY)), result: parsed};
    }
  } catch {
    /* ignore */
  }
  return IDLE;
}

function commit(session: QuoteSession) {
  const raw = JSON.stringify(session);
  snapshot = session;
  snapshotRaw = raw;
  storageSet(QUOTE_KEY, raw);
  if (session.status !== "idle") storageSet(RETURN_KEY, session.returnTo);
  for (const listener of listeners) listener();
}

export function subscribeQuote(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readQuoteSession(): QuoteSession {
  const raw = storageGet(QUOTE_KEY);
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = parseSession(raw);
  return snapshot;
}

export function readQuoteReturn(): string {
  const session = readQuoteSession();
  if (session.status !== "idle") return session.returnTo;
  return allowedReturn(storageGet(RETURN_KEY));
}

export function readPricingLead(): PricingLead | null {
  try {
    const parsed = JSON.parse(storageGet(LEAD_KEY)) as PricingLead;
    if (!parsed?.firstName || !parsed.lastName || !parsed.email || !parsed.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePricingLead(lead: PricingLead) {
  storageSet(LEAD_KEY, JSON.stringify(lead));
}

export function readQuoteInputs(): QuoteInputs | null {
  try {
    const parsed = JSON.parse(storageGet(INPUTS_KEY)) as QuoteInputs;
    if (!parsed?.values || !parsed.tables) return null;
    return parsed;
  } catch {
    return null;
  }
}

function runQuote(requestId: number, values: Record<string, string>, tables: Record<string, TableRow[]>, returnTo: string) {
  if (running.has(requestId)) return;
  running.add(requestId);
  void requestPricingQuote(values, tables)
    .then((result) => {
      if (activeRequest !== requestId) return;
      commit({status: "ready", requestId, returnTo, result});
    })
    .catch(() => {
      if (activeRequest !== requestId) return;
      commit({status: "error", requestId, returnTo, message: "The quote could not be retrieved. Try again."});
    })
    .finally(() => {
      running.delete(requestId);
    });
}

/** Start the quote and remember it for the result page. Safe to call, then navigate away. */
export function beginQuote(values: Record<string, string>, tables: Record<string, TableRow[]>, returnTo: string) {
  const requestId = ++serial;
  activeRequest = requestId;
  const path = allowedReturn(returnTo);
  storageSet(INPUTS_KEY, JSON.stringify({values, tables}));
  commit({status: "pending", requestId, returnTo: path});
  runQuote(requestId, values, tables, path);
}

/** Continue a quote that was in flight when the page refreshed. */
export function resumeQuote() {
  const session = readQuoteSession();
  if (session.status !== "pending") return;
  if (running.has(session.requestId)) return;
  const inputs = readQuoteInputs();
  if (!inputs) {
    commit({status: "error", requestId: session.requestId, returnTo: session.returnTo, message: "The quote could not be retrieved. Try again."});
    return;
  }
  activeRequest = session.requestId;
  runQuote(session.requestId, inputs.values, inputs.tables, session.returnTo);
}
