import {fieldByCode, pricingInputs, type TableRow} from "./model";

export type QuoteOption = {
  rate?: number;
  price?: number;
  premium?: number;
  loanAmount?: number;
  ltv?: number;
  pitia?: number;
  /** PITIA, shown to the borrower as the monthly payment. */
  monthlyPayment?: number;
  /** Origination, already formatted as money or a percent. */
  origination?: string;
  dscr?: number;
  initialLoanAmount?: number;
  rehabHoldback?: number;
  totalLoanAmount?: number;
  /** Engine option id, used to save this rate onto a scenario. */
  id?: string;
};

export type QuoteProgram = {
  name: string;
  pass: boolean | null;
  /** Hard reasons the program did not pass. */
  validations: string[];
  /** Soft notes that don't block the program from passing. */
  warnings: string[];
  loanAmount?: number;
  ltv?: number;
  origination?: string;
  /** Engine option id when the program returns one. */
  optionId?: string;
  options: QuoteOption[];
};

/** One prepay choice returned at the top level of a quote. */
export type LoanOption = {
  id: string;
  label: string;
  pppYears: number | null;
  program: string;
  pass: boolean;
  recommended: boolean;
  rate?: number;
  loanAmount?: number;
  monthlyPayment?: number;
  ltv?: number;
  dscr?: number;
  origination?: string;
  /** This option's price id. Falls back to the quote's id when the row omits it. */
  quoteId?: string;
  /** Quote row, sent back on the first save. */
  source?: Record<string, unknown>;
};

export type QuoteResult = {
  programs: QuoteProgram[];
  /** Prepay choices. Empty when the quote service has not started sending them. */
  options: LoanOption[];
  /** Local stand-in choices, used until the quote service sends `options`. */
  preview?: boolean;
  missing: string[];
  note?: string;
  /** From priceScenario. Required to save this exact rate. Quotes expire after 15 minutes. */
  quoteId?: string;
  /** The priced option shown for the passing program. */
  optionId?: string;
};

export function visibleLoanOptions(result: QuoteResult): LoanOption[] {
  return (result.options ?? []).filter((option) => option.pass !== false);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[$,%\s,]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return undefined;
}

function asId(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return asText(value);
}

/** `null` when the response did not include the field. An included null stays empty. */
function idField(body: Record<string, unknown>, key: string, alt: string): string | undefined | null {
  if (!Object.prototype.hasOwnProperty.call(body, key) && !Object.prototype.hasOwnProperty.call(body, alt)) return null;
  return asId(body[key]) ?? asId(body[alt]);
}

function stringListOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return asText(record.reason) ?? asText(record.message) ?? asText(record.field);
      }
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
}

const ORIGINATION_KEYS = [
  "origination_fee",
  "origination",
  "lender_origination",
  "lender_orig_percent",
  "origination_points",
  "broker_origination",
];

function originationOf(...sources: Record<string, unknown>[]): string | undefined {
  for (const source of sources) {
    for (const key of ORIGINATION_KEYS) {
      const value = source[key];
      if (typeof value === "string" && value.trim() !== "") {
        if (/[%$]/.test(value)) return value.trim();
      }
      const amount = asNumber(value);
      if (amount == null) continue;
      const asPercent = key.includes("percent") || key.includes("points") || Math.abs(amount) <= 15;
      if (asPercent) return `${amount.toLocaleString("en-US", {maximumFractionDigits: 3})}%`;
      return amount.toLocaleString("en-US", {style: "currency", currency: "USD", maximumFractionDigits: 0});
    }
  }
  return undefined;
}

function optionOf(value: unknown): QuoteOption {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const outputs = row.outputs && typeof row.outputs === "object" ? (row.outputs as Record<string, unknown>) : {};
  const pick = (key: string) => asNumber(row[key] ?? outputs[key]);
  const pitia = pick("pitia") ?? pick("funded_pitia") ?? pick("monthly_payment");
  return {
    rate: pick("rate") ?? pick("interest_rate"),
    price: pick("price") ?? pick("loan_price"),
    premium: pick("premium"),
    loanAmount: pick("loan_amount"),
    ltv: pick("ltv"),
    pitia,
    monthlyPayment: pitia,
    origination: originationOf(outputs, row),
    dscr: pick("dscr"),
    initialLoanAmount: pick("initial_loan_amount"),
    rehabHoldback: pick("rehab_holdback"),
    totalLoanAmount: pick("total_loan_amount"),
    id: asId(row.option_id) ?? asId(row.id),
  };
}

function loanOptionOf(value: unknown, parentQuoteId?: string): LoanOption | null {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = asId(row.option_id) ?? asId(row.id);
  const label = asText(row.label);
  if (!id || !label) return null;
  const years = row.ppp_years == null ? null : asNumber(row.ppp_years);
  return {
    id,
    label,
    pppYears: years ?? null,
    program: asText(row.program) ?? asText(row.program_name) ?? "",
    pass: typeof row.pass === "boolean" ? row.pass : true,
    recommended: row.recommended === true,
    rate: asNumber(row.rate) ?? asNumber(row.interest_rate),
    loanAmount: asNumber(row.loan_amount),
    monthlyPayment: asNumber(row.monthly_payment) ?? asNumber(row.pitia),
    ltv: asNumber(row.ltv),
    dscr: asNumber(row.dscr),
    origination: originationOf(row),
    quoteId: asId(row.quote_id) ?? asId(row.quoteId) ?? parentQuoteId,
    source: row,
  };
}

function loanOptionsFrom(value: unknown, parentQuoteId?: string): LoanOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => loanOptionOf(item, parentQuoteId)).filter((option): option is LoanOption => option != null);
}

/** Quote row to send on the first save. Each option keeps its own quote id and prepay term. */
export function loanOptionPayload(option: LoanOption, quoteId?: string): Record<string, unknown> {
  const source = option.source ?? {};
  return {
    ...source,
    option_id: option.id,
    label: option.label,
    ppp_years: option.pppYears,
    quote_id: option.quoteId ?? quoteId ?? null,
  };
}

function programOf(value: unknown, index: number): QuoteProgram {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const optionsRaw = row.options ?? row.rates ?? row.rate_options;
  const pass = typeof row.pass === "boolean" ? row.pass : typeof row.eligible === "boolean" ? row.eligible : null;
  const options = Array.isArray(optionsRaw) ? optionsRaw.map(optionOf) : [];
  const programOutputs = row.outputs && typeof row.outputs === "object" ? (row.outputs as Record<string, unknown>) : {};
  return {
    name:
      asText(row.external_name) ??
      asText(row.internal_name) ??
      asText(row.name) ??
      asText(row.label) ??
      `Program ${index + 1}`,
    pass,
    validations: stringListOf(row.validations ?? row.reasons ?? row.failures ?? row.errors),
    warnings: stringListOf(row.warnings),
    loanAmount: asNumber(row.loan_amount) ?? asNumber(programOutputs.loan_amount),
    ltv: asNumber(row.ltv) ?? asNumber(programOutputs.ltv),
    origination: options.find((option) => option.origination)?.origination ?? originationOf(programOutputs, row),
    optionId: asId(row.option_id) ?? options.find((option) => option.id)?.id,
    options,
  };
}

/** n8n sometimes wraps the quote as `[{ response }]` or `[{ body, statusCode }]`. */
function unwrapQuotePayload(payload: unknown): Record<string, unknown> {
  const record = Array.isArray(payload) ? payload[0] : payload;
  if (!record || typeof record !== "object" || Array.isArray(record)) return {};
  const obj = record as Record<string, unknown>;
  const wrapped = obj.response ?? (obj.body && obj.statusCode != null ? obj.body : undefined);
  if (wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)) return wrapped as Record<string, unknown>;
  return obj;
}

export function parseQuote(payload: unknown): QuoteResult {
  const body = unwrapQuotePayload(payload);
  const programsRaw = body.programs ?? body.results ?? body.quotes;
  const programs = Array.isArray(programsRaw) ? programsRaw.map(programOf) : [];
  const passing = programs.find((program) => program.pass !== false);
  const quoteId = idField(body, "quote_id", "quoteId");
  const options = loanOptionsFrom(body.options, quoteId && quoteId !== null ? quoteId : undefined);
  const optionId = idField(body, "option_id", "optionId");
  const missingRaw = body.missing_required ?? body.missing;
  const missing = Array.isArray(missingRaw)
    ? missingRaw.map((item) => {
        if (typeof item === "string") return fieldByCode(item)?.label ?? item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const code = asText(record.input_code) ?? asText(record.code);
          return asText(record.label) ?? (code ? fieldByCode(code)?.label ?? code : "A required field");
        }
        return "A required field";
      })
    : [];
  return {
    programs,
    options,
    missing,
    note: missing.length > 0 ? undefined : asText(body.message) ?? asText(body.error),
    quoteId: quoteId === null ? undefined : quoteId,
    optionId: optionId === null ? passing?.optionId : optionId,
  };
}

export function quoteUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_PRICING_QUOTE_URL ?? "").trim();
}

export async function requestPricingQuote(values: Record<string, string>, tables: Record<string, TableRow[]>): Promise<QuoteResult> {
  const url = quoteUrl();
  const inputs = pricingInputs(values, tables);
  if (!url) {
    return {
      programs: [],
      options: [],
      missing: [],
      note: "The quote service is not connected yet, so no rate was returned. Nothing was sent.",
    };
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({inputs}),
  });
  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok) {
    const parsed = parseQuote(json);
    if (parsed.missing.length > 0) return parsed;
    return {
      ...parsed,
      note: parsed.note ?? `The quote service returned ${response.status}.`,
    };
  }
  const parsed = parseQuote(json);
  if (parsed.programs.length === 0 && parsed.options.length === 0 && parsed.missing.length === 0 && !parsed.note) {
    return {...parsed, note: "The quote service responded, and it did not include any programs."};
  }
  if (import.meta.env.DEV && parsed.options.length === 0) return withPreviewOptions(parsed);
  return parsed;
}

/**
 * Stand-in prepay choices until the quote service returns `options`.
 * The 5-year row uses the priced rate. The other rows step off that rate so the toggle can be tried locally.
 */
function withPreviewOptions(result: QuoteResult): QuoteResult {
  const program = result.programs.find((item) => item.pass !== false);
  const priced = program?.options[0];
  if (!program || priced?.rate == null) return result;
  const rate = priced.rate;
  const payment = priced.monthlyPayment ?? priced.pitia;
  const loanAmount = program.loanAmount ?? priced.totalLoanAmount ?? priced.loanAmount ?? priced.initialLoanAmount;
  const steps: {label: string; years: number | null; delta: number; recommended: boolean; pass: boolean}[] = [
    {label: "5-year prepay", years: 5, delta: 0, recommended: true, pass: true},
    {label: "3-year prepay", years: 3, delta: 0.375, recommended: false, pass: true},
    {label: "1-year prepay", years: 1, delta: 0.75, recommended: false, pass: true},
    {label: "No prepay", years: null, delta: 1.125, recommended: false, pass: true},
    {label: "Unavailable", years: 0, delta: 0, recommended: false, pass: false},
  ];
  const options = steps.map((step) => {
    const nextRate = Math.round((rate + step.delta) * 1000) / 1000;
    const id = `preview-${step.label}`;
    const row = {
      option_id: id,
      label: step.label,
      ppp_years: step.years,
      quote_id: result.quoteId ?? null,
      program: program.name,
      pass: step.pass,
      recommended: step.recommended,
      rate: nextRate,
      loan_amount: loanAmount,
      monthly_payment: payment == null ? undefined : Math.round(payment * (nextRate / rate)),
      ltv: program.ltv ?? priced.ltv,
      dscr: priced.dscr,
      origination_fee: program.origination ?? priced.origination,
    };
    return {
      id,
      label: step.label,
      pppYears: step.years,
      program: program.name,
      pass: step.pass,
      recommended: step.recommended,
      rate: nextRate,
      loanAmount,
      monthlyPayment: row.monthly_payment,
      ltv: program.ltv ?? priced.ltv,
      dscr: priced.dscr,
      origination: program.origination ?? priced.origination,
      quoteId: result.quoteId,
      source: row,
    };
  });
  return {...result, options, preview: true};
}
