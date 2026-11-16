import {pricingInputs} from "./model";
import {loanOptionPayload, visibleLoanOptions, type LoanOption} from "./quote";
import {
  beginQuote,
  readPricingLead,
  readQuoteInputs,
  readQuoteSession,
  subscribeQuote,
  type PricingLead,
  type QuoteSession,
} from "./quote-session";

export type SavedSheet = {
  scenarioId: string;
  label?: string;
  pppYears?: number | null;
};

const SAVE_KEY = "pricing-scenario-save";

type SaveTarget = {
  /** Quote session request this save belongs to. A newer passing quote starts another save. */
  quoteKey?: number;
  loanId?: string;
  scenarioId?: string;
  applicationUrl?: string;
  /** Email already sent to the application as guarantor 1. */
  authorizedEmail?: string;
  contactError?: string;
  /** Option the loan currently has selected. */
  selectedOptionId?: string;
  /** Scenarios created for the options on screen. Term sheet links are not stored. */
  scenarios?: Record<string, SavedSheet>;
  /** Options the save could not price. Their term sheet button stays hidden. */
  unsavedOptionIds?: string[];
  /** Local stand-in. Never sent to the save service. */
  preview?: boolean;
  selecting?: boolean;
  selectError?: string;
};

export type ScenarioSave =
  | {status: "idle"}
  | ({status: "pending"; requestId: string} & SaveTarget)
  | ({status: "ready"; requestId: string; loanId: string; scenarioId: string; applicationUrl: string; termSheetUrl?: string} & SaveTarget)
  | ({status: "error"; requestId: string; message: string} & SaveTarget);

const IDLE: ScenarioSave = {status: "idle"};
const listeners = new Set<() => void>();
const running = new Set<string>();
let snapshot: ScenarioSave = IDLE;
let snapshotRaw: string | null = null;

function storageGet(): string {
  try {
    return sessionStorage.getItem(SAVE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storageSet(value: string) {
  try {
    sessionStorage.setItem(SAVE_KEY, value);
  } catch {
    /* private mode */
  }
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function httpUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    /* not a url */
  }
  return "";
}

function unwrap(payload: unknown): Record<string, unknown> {
  const record = Array.isArray(payload) ? payload[0] : payload;
  if (!record || typeof record !== "object" || Array.isArray(record)) return {};
  const obj = record as Record<string, unknown>;
  const wrapped = obj.response ?? (obj.body && obj.statusCode != null ? obj.body : undefined);
  if (wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)) return wrapped as Record<string, unknown>;
  return obj;
}

function asQuoteKey(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function storedLink(value: unknown, preview: boolean): string {
  const text = asText(value);
  const http = httpUrl(text);
  if (http) return http;
  if (preview && text.startsWith("preview:")) return text;
  return "";
}

function yearsOf(value: unknown): number | null | undefined {
  if (value == null) return value === null ? null : undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function idList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => (typeof item === "string" ? item.trim() : typeof item === "number" ? String(item) : "")).filter(Boolean);
}

function sheetsOf(value: unknown): Record<string, SavedSheet> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const sheets: Record<string, SavedSheet> = {};
  for (const [optionId, sheet] of Object.entries(value as Record<string, unknown>)) {
    if (!optionId || !sheet || typeof sheet !== "object") continue;
    const row = sheet as Record<string, unknown>;
    const scenarioId = asText(row.scenarioId);
    if (!scenarioId) continue;
    sheets[optionId] = {
      scenarioId,
      label: asText(row.label) || undefined,
      pppYears: yearsOf(row.pppYears ?? row.ppp_years),
    };
  }
  return Object.keys(sheets).length > 0 ? sheets : undefined;
}

function targetOf(value: {
  quoteKey?: unknown;
  loanId?: unknown;
  scenarioId?: unknown;
  applicationUrl?: unknown;
  authorizedEmail?: unknown;
  contactError?: unknown;
  selectedOptionId?: unknown;
  scenarios?: unknown;
  preview?: unknown;
  selecting?: unknown;
  selectError?: unknown;
  unsavedOptionIds?: unknown;
}): SaveTarget {
  const preview = value.preview === true;
  const loanId = asText(value.loanId) || undefined;
  const scenarioId = asText(value.scenarioId) || undefined;
  const applicationUrl = storedLink(value.applicationUrl, preview) || undefined;
  return {
    quoteKey: asQuoteKey(value.quoteKey),
    loanId: preview ? loanId : loanId,
    scenarioId,
    applicationUrl,
    authorizedEmail: asText(value.authorizedEmail) || undefined,
    contactError: asText(value.contactError) || undefined,
    selectedOptionId: asText(value.selectedOptionId) || undefined,
    scenarios: sheetsOf(value.scenarios),
    unsavedOptionIds: idList(value.unsavedOptionIds),
    preview: preview || undefined,
    selecting: value.selecting === true || undefined,
    selectError: asText(value.selectError) || undefined,
  };
}

function parseStored(raw: string): ScenarioSave {
  if (!raw) return IDLE;
  try {
    const parsed = JSON.parse(raw) as ScenarioSave;
    if (parsed?.status === "pending" && parsed.requestId) {
      return {status: "pending", requestId: parsed.requestId, ...targetOf(parsed)};
    }
    if (parsed?.status === "error" && parsed.requestId && parsed.message) {
      return {status: "error", requestId: parsed.requestId, message: parsed.message, ...targetOf(parsed)};
    }
    if (parsed?.status === "ready" && parsed.requestId && parsed.loanId && storedLink(parsed.applicationUrl, parsed.preview === true)) {
      const target = targetOf(parsed);
      return {
        status: "ready",
        requestId: parsed.requestId,
        loanId: parsed.loanId,
        scenarioId: parsed.scenarioId || target.scenarioId || "",
        applicationUrl: target.applicationUrl || storedLink(parsed.applicationUrl, parsed.preview === true),
        ...target,
      };
    }
  } catch {
    /* ignore */
  }
  return IDLE;
}

function persisted(save: ScenarioSave): string {
  const copy = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  delete copy.termSheetUrl;
  if (copy.scenarios && typeof copy.scenarios === "object") {
    for (const sheet of Object.values(copy.scenarios as Record<string, Record<string, unknown>>)) {
      delete sheet.termSheetUrl;
    }
  }
  return JSON.stringify(copy);
}

function commit(save: ScenarioSave) {
  const raw = persisted(save);
  snapshot = save;
  snapshotRaw = raw;
  storageSet(raw);
  for (const listener of listeners) listener();
}

export function subscribeScenarioSave(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readScenarioSave(): ScenarioSave {
  const raw = storageGet();
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = parseStored(raw);
  return snapshot;
}

function saveUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_PRICING_SAVE_URL ?? "").trim();
}

function whenQuoteSettled(): Promise<QuoteSession> {
  return new Promise((resolve) => {
    const finish = (session: QuoteSession) => {
      if (session.status === "pending") return false;
      resolve(session);
      return true;
    };
    if (finish(readQuoteSession())) return;
    const stop = subscribeQuote(() => {
      if (!finish(readQuoteSession())) return;
      stop();
    });
    if (finish(readQuoteSession())) stop();
  });
}

function passingQuoteKey(session: QuoteSession): number | null {
  if (session.status !== "ready") return null;
  if (visibleLoanOptions(session.result).length > 0) return session.requestId;
  if (!session.result.programs.some((program) => program.pass !== false)) return null;
  return session.requestId;
}

function shownOptions(session: QuoteSession): LoanOption[] {
  if (session.status !== "ready") return [];
  return visibleLoanOptions(session.result);
}

const restoreFor = new Map<string, ScenarioSave>();

function keptTarget(save: ScenarioSave): SaveTarget {
  if (save.status === "idle" || save.preview) {
    if (save.status === "idle") return {};
    return {authorizedEmail: save.authorizedEmail, contactError: save.contactError};
  }
  return {
    loanId: save.loanId,
    scenarioId: save.scenarioId,
    applicationUrl: save.applicationUrl,
    authorizedEmail: save.authorizedEmail,
    contactError: save.contactError,
    selectedOptionId: save.selectedOptionId,
    scenarios: save.scenarios,
    unsavedOptionIds: save.unsavedOptionIds,
  };
}

function stillPending(requestId: string): ScenarioSave | null {
  const save = readScenarioSave();
  if (save.status !== "pending" || save.requestId !== requestId) return null;
  return save;
}

function messageFrom(payload: unknown, fallback: string): string {
  const body = unwrap(payload);
  const error = body.error;
  const errorText =
    typeof error === "string" ? error : error && typeof error === "object" ? asText((error as Record<string, unknown>).message) : "";
  return asText(body.message) || errorText || asText(body.hint) || fallback;
}

function scenariosFrom(body: Record<string, unknown>): Record<string, SavedSheet> {
  const raw = body.scenarios;
  if (!Array.isArray(raw)) return {};
  const sheets: Record<string, SavedSheet> = {};
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const optionId = asText(row.option_id) || asText(row.optionId);
    const scenarioId = asText(row.scenarioId) || asText(row.scenario_id);
    if (!optionId || !scenarioId) continue;
    sheets[optionId] = {
      scenarioId,
      label: asText(row.label) || undefined,
      pppYears: yearsOf(row.ppp_years ?? row.pppYears),
    };
  }
  return sheets;
}

function linksFrom(payload: unknown, requestId: string, selectedOptionId: string): ScenarioSave | null {
  const body = unwrap(payload);
  const applicationUrl = httpUrl(asText(body.applicationUrl) || asText(body.application_url));
  const loanId = asText(body.loanId) || asText(body.loan_id);
  if (!loanId || !applicationUrl) return null;
  const scenarios = scenariosFrom(body);
  const selectedFromBody = asText(body.selected_option_id) || asText(body.selectedOptionId) || selectedOptionId;
  const scenarioId =
    asText(body.scenarioId) ||
    asText(body.scenario_id) ||
    asText(body.selected_scenario_id) ||
    asText(body.selectedScenarioId);
  if (Object.keys(scenarios).length === 0 && scenarioId && selectedFromBody) {
    scenarios[selectedFromBody] = {scenarioId};
  }
  const selectedKey = scenarios[selectedFromBody] ? selectedFromBody : Object.keys(scenarios)[0] ?? selectedFromBody;
  const selected = selectedKey ? scenarios[selectedKey] : undefined;
  return {
    status: "ready",
    requestId,
    loanId,
    scenarioId: scenarioId || selected?.scenarioId || "",
    applicationUrl,
    selectedOptionId: selectedKey || undefined,
    scenarios,
    unsavedOptionIds: idList(body.unsaved_option_ids),
  };
}

let wantedOptionId = "";
let rejectedOptionId = "";
const selectingLoan = new Set<string>();

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function chosenId(options: LoanOption[], pendingSelected?: string): string {
  const preferred = wantedOptionId || pendingSelected || "";
  if (options.some((option) => option.id === preferred)) return preferred;
  return options.find((option) => option.recommended)?.id ?? options[0]?.id ?? "";
}

async function postSelection(optionId: string) {
  const current = readScenarioSave();
  if (current.status !== "ready" || !current.loanId || !optionId) return;
  if (selectingLoan.has(current.loanId)) return;
  if (current.selectedOptionId === optionId && !current.selectError) return;
  selectingLoan.add(current.loanId);
  rejectedOptionId = "";
  commit({...current, selecting: true, selectError: undefined});
  let failed = false;
  try {
    if (current.preview) {
      const latest = readScenarioSave();
      if (latest.status !== "ready") return;
      const sheet = latest.scenarios?.[optionId];
      commit({
        ...latest,
        selecting: undefined,
        selectError: undefined,
        selectedOptionId: optionId,
        scenarioId: sheet?.scenarioId || latest.scenarioId,
      });
      return;
    }
    const url = saveUrl();
    if (!url) throw new Error("missing");
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        loanId: current.loanId,
        selected_option_id: optionId,
      }),
    });
    const json = await response.json().catch(() => null);
    const latest = readScenarioSave();
    if (latest.status !== "ready" || latest.loanId !== current.loanId) return;
    if (!response.ok) {
      failed = true;
      rejectedOptionId = optionId;
      commit({...latest, selecting: undefined, selectError: messageFrom(json, "That option could not be selected. Try again.")});
      return;
    }
    const body = unwrap(json);
    const applicationUrl = httpUrl(asText(body.applicationUrl) || asText(body.application_url)) || latest.applicationUrl;
    const incoming = scenariosFrom(body);
    const scenarios = Object.keys(incoming).length > 0 ? {...latest.scenarios, ...incoming} : latest.scenarios;
    const selectedOptionId = asText(body.selected_option_id) || optionId;
    const scenarioId =
      asText(body.scenarioId) ||
      asText(body.scenario_id) ||
      asText(body.selected_scenario_id) ||
      scenarios?.[selectedOptionId]?.scenarioId ||
      latest.scenarioId;
    commit({
      ...latest,
      selecting: undefined,
      selectError: undefined,
      applicationUrl: applicationUrl || latest.applicationUrl,
      scenarios,
      selectedOptionId,
      scenarioId,
      unsavedOptionIds: idList(body.unsaved_option_ids) ?? latest.unsavedOptionIds,
    });
  } catch {
    failed = true;
    rejectedOptionId = optionId;
    const latest = readScenarioSave();
    if (latest.status === "ready" && latest.loanId === current.loanId) {
      commit({...latest, selecting: undefined, selectError: "That option could not be selected. Try again."});
    }
  } finally {
    selectingLoan.delete(current.loanId);
    const latest = readScenarioSave();
    if (!failed && latest.status === "ready" && wantedOptionId && latest.selectedOptionId !== wantedOptionId) {
      void postSelection(wantedOptionId);
    }
  }
}

async function runSave(requestId: string, lead: PricingLead | null) {
  if (running.has(requestId)) return;
  running.add(requestId);
  try {
    const current = readScenarioSave();
    if (current.status !== "pending" || current.requestId !== requestId) return;
    const quote = await whenQuoteSettled();
    const pending = stillPending(requestId);
    if (!pending) return;
    const quoteKey = passingQuoteKey(quote);
    if (quoteKey == null) {
      commit(restoreFor.get(requestId) ?? IDLE);
      return;
    }
    const stored = readQuoteInputs();
    if (!stored || !stillPending(requestId)) {
      if (stillPending(requestId)) {
        commit({status: "error", requestId, message: "The scenario could not be saved. Try again.", ...keptTarget(pending), quoteKey});
      }
      return;
    }
    const options = shownOptions(quote);
    const selected = chosenId(options, pending.selectedOptionId);
    const selectedOption = options.find((option) => option.id === selected);
    if (quote.status === "ready" && quote.result.preview) {
      await wait(700);
      if (!stillPending(requestId)) return;
      const selectedNow = chosenId(options, pending.selectedOptionId);
      const scenarios: Record<string, SavedSheet> = {};
      for (const option of options) scenarios[option.id] = {scenarioId: "preview", label: option.label, pppYears: option.pppYears};
      const saved: ScenarioSave = {
        status: "ready",
        requestId,
        quoteKey,
        preview: true,
        loanId: "preview",
        scenarioId: "preview",
        applicationUrl: "preview:application",
        selectedOptionId: selectedNow,
        scenarios,
        authorizedEmail: pending.authorizedEmail,
      };
      commit(saved);
      const contact = queuedContact ?? readPricingLead();
      if (contact && saved.authorizedEmail !== contact.email) authorizeApplicant(contact);
      return;
    }
    const url = saveUrl();
    if (!url) {
      commit({
        status: "error",
        requestId,
        message: "The scenario could not be saved. The save service is not connected yet.",
        ...keptTarget(pending),
        quoteKey,
      });
      return;
    }
    const quoteId =
      (quote.status === "ready" ? quote.result.quoteId : undefined) ?? selectedOption?.quoteId;
    const payload: Record<string, unknown> = {
      requestId,
      quote_id: quoteId ?? null,
      option_id: selected || (quote.status === "ready" ? quote.result.optionId ?? null : null),
      inputs: pricingInputs(stored.values, stored.tables),
    };
    if (options.length > 0) {
      payload.selected_option_id = selected;
      payload.options = options.map((option) => loanOptionPayload(option, quoteId));
      if (pending.loanId) payload.loanId = pending.loanId;
    } else {
      payload.option_id = quote.status === "ready" ? quote.result.optionId ?? null : null;
      if (lead) {
        payload.firstName = lead.firstName;
        payload.lastName = lead.lastName;
        payload.email = lead.email;
      }
      if (pending.loanId && pending.scenarioId) {
        payload.loanId = pending.loanId;
        payload.scenarioId = pending.scenarioId;
      }
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    if (!stillPending(requestId)) return;
    if (!response.ok && QUOTE_GONE.test(messageFrom(json, "")) && Date.now() - lastReprice > 60_000) {
      if (repriceAndSave(pending, lead)) return;
    }
    const ready = response.ok ? linksFrom(json, requestId, selected) : null;
    if (!ready || ready.status !== "ready") {
      commit({
        status: "error",
        requestId,
        message: messageFrom(
          json,
          response.ok
            ? "The scenario could not be saved. The save service did not return a link."
            : "The scenario could not be saved. Try again.",
        ),
        quoteKey,
        ...keptTarget(pending),
      });
      return;
    }
    const saved = {...ready, quoteKey, applicationUrl: ready.applicationUrl, authorizedEmail: pending.authorizedEmail};
    commit(saved);
    const contact = queuedContact ?? readPricingLead();
    if (contact && saved.authorizedEmail !== contact.email) authorizeApplicant(contact);
    if (saved.status === "ready" && wantedOptionId && saved.selectedOptionId !== wantedOptionId) {
      void postSelection(wantedOptionId);
    }
  } catch {
    const pending = stillPending(requestId);
    if (pending) {
      commit({
        status: "error",
        requestId,
        message: "The scenario could not be saved. Try again.",
        ...keptTarget(pending),
        quoteKey: pending.quoteKey,
      });
    }
  } finally {
    running.delete(requestId);
  }
}

/** Save the priced scenario as soon as a quote passes. Contact details are attached afterwards. */
export function beginScenarioSave(lead: PricingLead | null, selectedOptionId = "") {
  if (selectedOptionId) wantedOptionId = selectedOptionId;
  const quote = readQuoteSession();
  const quoteKey = passingQuoteKey(quote);
  const current = readScenarioSave();
  if (quoteKey == null) return;
  if (current.status === "ready" && current.quoteKey == null) {
    commit({...current, quoteKey});
    return;
  }
  if (current.status !== "idle" && current.quoteKey === quoteKey) {
    if (
      current.status === "ready" &&
      wantedOptionId &&
      current.selectedOptionId !== wantedOptionId &&
      wantedOptionId !== rejectedOptionId
    ) {
      void postSelection(wantedOptionId);
    }
    return;
  }
  if (current.status === "pending" && current.quoteKey == null) return;
  const requestId = crypto.randomUUID();
  const previous = current.status === "ready" ? current : restoreFor.get(current.status === "pending" ? current.requestId : "") ?? IDLE;
  restoreFor.set(requestId, previous);
  const kept = keptTarget(current.status === "ready" ? current : previous.status === "ready" ? previous : current);
  const preview = quote.status === "ready" && quote.result.preview === true;
  commit({
    status: "pending",
    requestId,
    quoteKey,
    ...(preview ? {authorizedEmail: kept.authorizedEmail, contactError: kept.contactError} : kept),
    selectedOptionId: wantedOptionId || undefined,
    preview: preview || undefined,
  });
  void runSave(requestId, lead);
}

/** Try the option switch again after it failed. */
export function retryOptionSelection(lead: PricingLead | null, optionId: string) {
  rejectedOptionId = "";
  beginScenarioSave(lead, optionId);
}

const QUOTE_GONE = /couldn.t find your saved quote/i;
let lastReprice = 0;

/** Price the same inputs again, then save the new quote. Used when the old quote expired or was already saved. */
function repriceAndSave(base: ScenarioSave, lead: PricingLead | null): boolean {
  const inputs = readQuoteInputs();
  const session = readQuoteSession();
  if (!inputs || session.status === "idle") return false;
  const requestId = crypto.randomUUID();
  const {quoteKey: _previous, ...kept} = keptTarget(base);
  lastReprice = Date.now();
  beginQuote(inputs.values, inputs.tables, session.returnTo);
  commit({status: "pending", requestId, ...kept});
  void runSave(requestId, lead);
  return true;
}

/** Retry the current attempt. A quote n8n can no longer find is priced again first. */
export function retryScenarioSave(lead: PricingLead | null) {
  const current = readScenarioSave();
  if (current.status !== "error") return;
  if (QUOTE_GONE.test(current.message) && repriceAndSave(current, lead)) return;
  commit({...current, status: "pending"});
  void runSave(current.requestId, lead);
}

/** Continue a save that was in flight when the page refreshed. */
export function resumeScenarioSave() {
  const current = readScenarioSave();
  if (current.status !== "pending") return;
  void runSave(current.requestId, readPricingLead());
}

let queuedContact: PricingLead | null = null;
const authorizing = new Set<string>();

/** Put the contact name on the scenario and their email on the application as guarantor 1. */
export function authorizeApplicant(lead: PricingLead) {
  queuedContact = lead;
  const current = readScenarioSave();
  if (current.status !== "ready" || !current.loanId || !current.scenarioId) return;
  if (current.authorizedEmail === lead.email) return;
  if (current.preview) {
    commit({...current, authorizedEmail: lead.email, contactError: undefined});
    return;
  }
  if (authorizing.has(current.loanId)) return;
  void sendAuthorization(current.loanId, current.scenarioId, lead);
}

async function sendAuthorization(loanId: string, scenarioId: string, lead: PricingLead) {
  if (authorizing.has(loanId)) return;
  authorizing.add(loanId);
  try {
    const url = saveUrl();
    if (!url) return;
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        action: "authorize",
        loanId,
        scenarioId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
      }),
    });
    const json = await response.json().catch(() => null);
    const latest = readScenarioSave();
    if (latest.status !== "ready" || latest.loanId !== loanId) return;
    if (!response.ok) {
      commit({...latest, contactError: messageFrom(json, "This email could not be added to the application.")});
      return;
    }
    commit({...latest, authorizedEmail: lead.email, contactError: undefined});
  } catch {
    const latest = readScenarioSave();
    if (latest.status === "ready" && latest.loanId === loanId) {
      commit({...latest, contactError: "This email could not be added to the application. Try again."});
    }
  } finally {
    authorizing.delete(loanId);
  }
}

const fetchingSheet = new Set<string>();

function termSheetLink(payload: unknown): string {
  const body = unwrap(payload);
  return httpUrl(asText(body.termSheetUrl) || asText(body.term_sheet_url) || asText(body.download_url));
}

/** Ask for a fresh term sheet link. Signed links expire, so this does not keep the URL. */
export async function fetchTermSheet(optionId: string): Promise<string> {
  const current = readScenarioSave();
  if (current.status !== "ready" || !optionId) return "";
  if (current.unsavedOptionIds?.includes(optionId)) return "";
  if (current.preview) return "preview:sheet";
  if (fetchingSheet.has(optionId)) return "";
  const url = saveUrl();
  if (!url || !current.loanId) return "";
  fetchingSheet.add(optionId);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        loanId: current.loanId,
        selected_option_id: optionId,
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) return "";
    const body = unwrap(json);
    const latest = readScenarioSave();
    if (latest.status === "ready" && latest.loanId === current.loanId) {
      const incoming = scenariosFrom(body);
      const selectedOptionId = asText(body.selected_option_id) || optionId;
      commit({
        ...latest,
        applicationUrl: httpUrl(asText(body.applicationUrl) || asText(body.application_url)) || latest.applicationUrl,
        scenarioId: asText(body.scenarioId) || asText(body.scenario_id) || asText(body.selected_scenario_id) || latest.scenarioId,
        selectedOptionId,
        scenarios: Object.keys(incoming).length > 0 ? {...latest.scenarios, ...incoming} : latest.scenarios,
        unsavedOptionIds: idList(body.unsaved_option_ids) ?? latest.unsavedOptionIds,
      });
    }
    return termSheetLink(json);
  } catch {
    return "";
  } finally {
    fetchingSheet.delete(optionId);
  }
}
