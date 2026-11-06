import states from "../states";

export type FieldType =
  | "text"
  | "tags"
  | "dropdown"
  | "state"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "boolean"
  | "table";

export type PricingField = {
  code: string;
  label: string;
  type: FieldType;
  section: string;
  row: number;
  width: 50 | 100;
  options?: string[];
  placeholder?: string;
  /** Shown on first paint. Formulas stay blank so they are never sent as text. */
  initial?: string;
  hint?: string;
  tooltip?: string;
  /** Engine rule: not editable for external users, which every visitor here is. */
  locked?: boolean;
  dateMin?: "today";
  dateMax?: "yesterday";
};

export type SectionDef = {
  id: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
};

export type TableColumn = {
  key: string;
  label: string;
  type: "text" | "currency" | "number" | "toggle";
  required: boolean;
};

export type TableRow = Record<string, string>;

/** Category order from the pricing engine (display_order on pricing_engine_input_categories). */
export const SECTIONS: SectionDef[] = [
  {
    id: "loan",
    title: "Loan Details",
    description: "The loan and the transaction.",
  },
  {
    id: "borrowers",
    title: "Borrowers & Guarantors",
    description: "Who is borrowing and their credit.",
  },
  {
    id: "experience",
    title: "Experience",
    description: "Rentals, flips, and ground-up projects.",
  },
  {
    id: "subject",
    title: "Subject Property",
    description: "The address and what kind of property it is.",
  },
  {
    id: "income",
    title: "Income & Expenses",
    description: "Yearly taxes, insurance, and rent for each unit.",
  },
  {
    id: "rehab",
    title: "Rehab Details",
    description: "The work, the budget, and the after-repair value.",
  },
  {
    id: "structure",
    title: "Loan Structure",
    description: "What the property is worth and what is owed.",
  },
  {
    id: "additional",
    title: "Additional Details",
    description: "Borrower, fees, escrow, and mortgage history.",
    defaultOpen: false,
  },
];

const YES_NO = ["Yes", "No"];

export const FIELDS: PricingField[] = [
  {code: "address_street", label: "Street", type: "text", section: "subject", row: 0, width: 100, placeholder: "123 Main St"},
  {code: "address_apt", label: "Apt", type: "text", section: "subject", row: 1, width: 50, placeholder: "Unit/Apt"},
  {code: "address_city", label: "City", type: "text", section: "subject", row: 1, width: 50, placeholder: "City"},
  {code: "address_state", label: "State", type: "state", section: "subject", row: 2, width: 50},
  {code: "address_zip", label: "Zip", type: "text", section: "subject", row: 2, width: 50, placeholder: "12345"},
  {code: "address_county", label: "County", type: "text", section: "subject", row: 3, width: 50, placeholder: "County"},
  {
    code: "property_type",
    label: "Property Type",
    type: "dropdown",
    section: "subject",
    row: 4,
    width: 50,
    options: ["Single Family", "Townhome/PUD", "Condominium", "Multifamily 2-4 Units", "Multifamily 5-10 Units", "Mixed Use"],
  },
  {
    code: "warrantability",
    label: "Warrantability",
    type: "dropdown",
    section: "subject",
    row: 4,
    width: 50,
    options: ["Warrantable", "Non-Warrantable"],
    initial: "Warrantable",
  },
  {
    code: "residential_gla_51",
    label: ">51% GLA Sq Ft Residential",
    type: "dropdown",
    section: "subject",
    row: 4,
    width: 50,
    options: YES_NO,
    initial: "Yes",
    tooltip:
      "Yes means the residential units make up 51% or more of the property's total square footage, compared with the commercial square footage. No means the commercial space is the larger share.",
  },
  {code: "number_of_units", label: "Number of Units", type: "number", section: "subject", row: 5, width: 50, placeholder: "0", initial: "1"},
  {code: "sq_footage", label: "Sq Footage", type: "number", section: "subject", row: 5, width: 50, placeholder: "0"},
  {code: "rural", label: "Rural", type: "dropdown", section: "subject", row: 6, width: 50, options: YES_NO, initial: "No"},
  {code: "short_term_rental", label: "Short-Term Rental", type: "dropdown", section: "subject", row: 6, width: 50, options: YES_NO, initial: "No"},
  {code: "declining_market", label: "Declining Market", type: "dropdown", section: "subject", row: 7, width: 50, options: YES_NO, initial: "No"},
  {code: "pe_full_address", label: "Full Address", type: "text", section: "subject", row: 8, width: 50},

  {code: "annual_taxes", label: "Annual Taxes", type: "currency", section: "income", row: 0, width: 50, placeholder: "0.00"},
  {code: "annual_hoi", label: "Annual Homeowner's Insurance", type: "currency", section: "income", row: 0, width: 50, placeholder: "0.00"},
  {code: "annual_flood", label: "Annual Flood", type: "currency", section: "income", row: 1, width: 50, placeholder: "0.00", initial: "0"},
  {code: "annual_hoa", label: "Annual HOA", type: "currency", section: "income", row: 1, width: 50, placeholder: "0.00", initial: "0"},
  {code: "annual_management", label: "Annual Management", type: "currency", section: "income", row: 2, width: 50, placeholder: "0.00", initial: "0"},
  {
    code: "other_annual_expenses",
    label: "Other Annual Expenses",
    type: "currency",
    section: "income",
    row: 1,
    width: 50,
    placeholder: "0.00",
    tooltip: "Flood insurance, HOA dues, and property management.",
  },
  {code: "leased_units", label: "Leased Units", type: "table", section: "income", row: 3, width: 100},

  {code: "borrower_name", label: "Borrower Name", type: "text", section: "additional", row: 0, width: 50, placeholder: "Borrowing Entity LLC", initial: "Borrowing Entity LLC"},
  {code: "guarantors", label: "Guarantor(s)", type: "tags", section: "additional", row: 0, width: 50, placeholder: "First Last", initial: "First Last"},
  {code: "uw_exception", label: "UW Exception", type: "dropdown", section: "additional", row: 2, width: 50, options: YES_NO, initial: "No"},
  {code: "section_8", label: "Section 8", type: "dropdown", section: "additional", row: 2, width: 50, options: YES_NO, initial: "No"},
  {code: "hoi_effective", label: "HOI Effective", type: "date", section: "additional", row: 3, width: 50},
  {code: "flood_effective", label: "Flood Effective", type: "date", section: "additional", row: 3, width: 50},
  {code: "title_recording_fee", label: "Title / Recording Fee", type: "currency", section: "additional", row: 4, width: 50, placeholder: "0.00"},
  {code: "assignment_fee", label: "Assignment Fee", type: "currency", section: "additional", row: 4, width: 50, placeholder: "0.00"},
  {code: "seller_concessions", label: "Seller Concessions", type: "currency", section: "additional", row: 5, width: 50, placeholder: "0.00"},
  {code: "tax_escrow_months", label: "Tax Escrow Months", type: "number", section: "additional", row: 5, width: 50, placeholder: "0", initial: "3"},
  {code: "hoi_premium", label: "HOI Premium", type: "currency", section: "additional", row: 7, width: 50, placeholder: "0.00"},
  {code: "flood_premium", label: "Flood Premium", type: "currency", section: "additional", row: 7, width: 50, placeholder: "0.00"},
  {code: "emd", label: "EMD", type: "currency", section: "additional", row: 8, width: 50, placeholder: "0.00"},
  {code: "month_to_month", label: "Month to Month", type: "dropdown", section: "additional", row: 8, width: 50, options: YES_NO, initial: "No"},
  {code: "pe_mortgage_lates", label: "Mortgage Lates", type: "table", section: "additional", row: 9, width: 100},

  {code: "borrower_type", label: "Borrower Type", type: "dropdown", section: "borrowers", row: 0, width: 50, options: ["Entity", "Individual"], initial: "Entity"},
  {
    code: "citizenship",
    label: "Citizenship",
    type: "dropdown",
    section: "borrowers",
    row: 0,
    width: 50,
    options: ["U.S. Citizen", "Permanent Resident", "Non-Permanent Resident", "Foreign National"],
    initial: "U.S. Citizen",
  },
  {code: "first_time_homebuyer", label: "First Time Homebuyer", type: "dropdown", section: "borrowers", row: 1, width: 50, options: YES_NO, initial: "No"},
  {code: "mortgage_debt", label: "Mortgage Debt", type: "currency", section: "borrowers", row: 1, width: 50, placeholder: "0.00", initial: "0"},
  {code: "fico_score", label: "FICO Score", type: "number", section: "borrowers", row: 1, width: 50, placeholder: "700"},

  {
    code: "gla_expansion",
    label: "GLA Expansion",
    type: "dropdown",
    section: "rehab",
    row: 0,
    width: 50,
    options: YES_NO,
    initial: "No",
    tooltip: "Yes if the project expands the living square footage of the building by 20% or more.",
  },
  {
    code: "change_of_use",
    label: "Change of Use",
    type: "dropdown",
    section: "rehab",
    row: 0,
    width: 50,
    options: YES_NO,
    initial: "No",
    tooltip: "Yes if the project converts how the property is used, such as turning a single-family house into a duplex.",
  },
  {code: "rehab_budget", label: "Rehab Budget", type: "currency", section: "rehab", row: 1, width: 50, placeholder: "0.00"},
  {code: "arv", label: "ARV", type: "currency", section: "rehab", row: 1, width: 50, placeholder: "0.00"},

  {code: "loan_type", label: "Loan Type", type: "dropdown", section: "loan", row: 0, width: 50, options: ["DSCR", "Bridge"]},
  {
    code: "transaction_type",
    label: "Transaction Type",
    type: "dropdown",
    section: "loan",
    row: 0,
    width: 50,
    options: ["Purchase", "Refinance Rate/Term", "Refinance Cash Out"],
  },
  {code: "bridge_type", label: "Bridge Type", type: "dropdown", section: "loan", row: 1, width: 50, options: ["Bridge", "Bridge + Rehab", "Ground Up"]},

  {
    code: "loan_structure_type",
    label: "Loan Structure Type",
    type: "dropdown",
    section: "structure",
    row: 0,
    width: 50,
    options: ["30 Year Fixed", "15 Year Fixed", "10/6 ARM", "7/6 ARM", "5/6 ARM"],
    initial: "30 Year Fixed",
  },
  {code: "interest_only", label: "Interest Only", type: "dropdown", section: "structure", row: 0, width: 50, options: ["10 Years", "None"], initial: "None"},
  {
    code: "ppp_term",
    label: "Pre-Payment Penalty Term",
    type: "dropdown",
    section: "structure",
    row: 1,
    width: 50,
    options: ["60 Months", "48 Months", "36 Months", "24 Months", "12 Months", "None"],
    initial: "60 Months",
  },
  {
    code: "ppp_structure",
    label: "Pre-Payment Penalty Structure",
    type: "dropdown",
    section: "structure",
    row: 1,
    width: 50,
    options: ["Declining", "Fixed"],
    initial: "Declining",
  },
  {code: "projected_closing_date", label: "Projected Closing Date", type: "date", section: "structure", row: 3, width: 50, dateMin: "today"},
  {code: "acquisition_date", label: "Acquisition Date", type: "date", section: "structure", row: 3, width: 50, dateMax: "yesterday"},
  {code: "bridge_term", label: "Term", type: "dropdown", section: "structure", row: 4, width: 50, options: ["12 Months", "15 Months", "18 Months"], initial: "12 Months"},
  {code: "purchase_price", label: "Purchase Price", type: "currency", section: "structure", row: 5, width: 50, placeholder: "0.00"},
  {code: "as_is_value", label: "As-Is Value", type: "currency", section: "structure", row: 5, width: 50, placeholder: "0.00"},
  {code: "rehab_completed_amount", label: "Rehab Completed", type: "currency", section: "structure", row: 6, width: 50, placeholder: "0.00"},
  {code: "payoff_amount", label: "Payoff Amount", type: "currency", section: "structure", row: 6, width: 50, placeholder: "0.00"},
  {code: "request_max_leverage", label: "Request Max Leverage", type: "boolean", section: "structure", row: 8, width: 50, initial: "true"},
  {code: "loan_amount", label: "Loan Amount", type: "currency", section: "structure", row: 8, width: 50, placeholder: "0.00"},
  {code: "initial_loan_amount", label: "Initial Loan Amount", type: "currency", section: "structure", row: 9, width: 50, placeholder: "0.00"},
  {code: "rehab_holdback", label: "Rehab Holdback", type: "currency", section: "structure", row: 9, width: 50, placeholder: "0.00"},
  {code: "lender_origination", label: "Lender Origination", type: "percentage", section: "structure", row: 11, width: 50, placeholder: "0.00", locked: true},
  {code: "lender_admin_fee", label: "Lender Admin Fee", type: "currency", section: "structure", row: 11, width: 50, placeholder: "0.00", locked: true},
  {code: "broker_origination", label: "Broker Origination", type: "percentage", section: "structure", row: 12, width: 50, placeholder: "0.00"},
  {code: "broker_admin_fee", label: "Broker Admin Fee", type: "currency", section: "structure", row: 12, width: 50, placeholder: "0.00"},

  {code: "rentals_owned", label: "Rentals Owned", type: "number", section: "experience", row: 0, width: 50, placeholder: "0"},
  {code: "number_of_flips", label: "Number of Flips", type: "number", section: "experience", row: 0, width: 50, placeholder: "0"},
  {code: "number_of_gunc", label: "Number of Ground Ups", type: "number", section: "experience", row: 1, width: 50, placeholder: "0"},
  {code: "other_experience", label: "Other Experience", type: "dropdown", section: "experience", row: 1, width: 50, options: YES_NO},
];

export const STATE_OPTIONS = states.map((state) => state.title);

export const LEASED_COLUMNS: TableColumn[] = [
  {key: "leased", label: "Leased", type: "toggle", required: true},
  {key: "gross_rent", label: "Gross Rent", type: "currency", required: true},
  {key: "market_rent", label: "Expected Market Rent", type: "currency", required: true},
];

export const LATES_COLUMNS: TableColumn[] = [
  {key: "previous_12_months", label: "Previous 12 months", type: "number", required: false},
  {key: "previous_24_months", label: "Previous 24 months", type: "number", required: false},
];

export const LATES_ROW_LABELS = ["30-day", "60-day", "90-day"];

const DSCR_ONLY = new Set([
  "annual_taxes",
  "annual_hoi",
  "annual_flood",
  "annual_hoa",
  "annual_management",
  "other_annual_expenses",
  "leased_units",
  "first_time_homebuyer",
  "mortgage_debt",
  "section_8",
  "short_term_rental",
  "declining_market",
  "loan_structure_type",
  "ppp_term",
  "rehab_completed_amount",
]);

const BRIDGE_ONLY = new Set([
  "gla_expansion",
  "change_of_use",
  "rehab_budget",
  "arv",
  "bridge_type",
  "bridge_term",
  "rentals_owned",
  "number_of_flips",
  "number_of_gunc",
  "other_experience",
  "initial_loan_amount",
  "rehab_holdback",
]);

const DSCR_REQUIRED = new Set([
  "annual_taxes",
  "annual_hoi",
  "loan_structure_type",
  "interest_only",
  "ppp_term",
  "leased_units",
  "ppp_structure",
]);

const ALWAYS_REQUIRED = new Set([
  "borrower_type",
  "citizenship",
  "loan_type",
  "transaction_type",
  "address_state",
  "property_type",
  "as_is_value",
]);

export const fieldByCode = (code: string) => FIELDS.find((field) => field.code === code);

export function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function isoYearsAgo(years: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export function initialValues(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    if (field.code === "projected_closing_date" || field.code === "hoi_effective" || field.code === "flood_effective") {
      values[field.code] = isoDate(30);
    } else if (field.code === "acquisition_date") {
      values[field.code] = isoYearsAgo(1);
    } else {
      values[field.code] = field.initial ?? "";
    }
  }
  return values;
}

/** The engine's expression defaults; a field shows its result until the visitor edits it. */
export function expressionDefaults(values: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const units = numericValue(values.number_of_units ?? "");
  if (units != null) result.sq_footage = String(units * 700);
  const asIs = numericValue(values.as_is_value ?? "");
  if (asIs != null) result.title_recording_fee = (Math.round(asIs * 0.01 * 100) / 100).toFixed(2);
  return result;
}

/** The engine's pe_full_address rules: "street[ apt], city, state zip". */
export function fullAddress(values: Record<string, string>): string {
  const part = (code: string) => (values[code] ?? "").trim();
  const street = part("address_apt") ? `${part("address_street")} ${part("address_apt")}` : part("address_street");
  const address = `${street}, ${part("address_city")}, ${part("address_state")} ${part("address_zip")}`;
  return address.replace(/[\s,]+/g, "").length === 0 ? "" : address;
}

export function blankLeaseRow(): TableRow {
  return {leased: "", gross_rent: "", market_rent: ""};
}

export function blankLates(): TableRow[] {
  return LATES_ROW_LABELS.map(() => ({previous_12_months: "", previous_24_months: ""}));
}

export function unitBounds(propertyType: string): {min: number; max: number} {
  if (propertyType === "Multifamily 2-4 Units") return {min: 2, max: 4};
  if (propertyType === "Multifamily 5-10 Units") return {min: 5, max: 10};
  if (propertyType === "Mixed Use") return {min: 2, max: 8};
  return {min: 1, max: 1};
}

function isRehabBridge(values: Record<string, string>): boolean {
  return values.loan_type === "Bridge" && (values.bridge_type === "Bridge + Rehab" || values.bridge_type === "Ground Up");
}

/** Questions a borrower is not asked. Their saved defaults still go out with the quote. */
const BORROWER_HIDDEN = new Set([
  "declining_market",
  "mortgage_debt",
  "annual_flood",
  "annual_hoa",
  "annual_management",
  "loan_structure_type",
  "interest_only",
  "ppp_term",
  "ppp_structure",
  "projected_closing_date",
  "lender_origination",
  "lender_admin_fee",
  "broker_origination",
  "broker_admin_fee",
  "other_experience",
  "bridge_term",
]);

/** Whether the pricing engine uses the field for this loan. Ignores the borrower form. */
function engineVisible(code: string, values: Record<string, string>): boolean {
  if (code === "pe_full_address" || code === "other_annual_expenses") return false;
  const loan = values.loan_type;
  const isBridge = loan === "Bridge";
  const isDscr = loan === "DSCR";
  const isPurchase = values.transaction_type === "Purchase";
  if (code === "warrantability") return values.property_type === "Condominium";
  if (code === "residential_gla_51") return values.property_type === "Mixed Use";
  if (code === "interest_only" || code === "ppp_structure") return !isBridge;
  if (code === "acquisition_date" || code === "payoff_amount") return !isPurchase;
  if (code === "rehab_completed_amount") return isDscr && !isPurchase;
  if (code === "loan_amount") {
    if (values.request_max_leverage === "true") return false;
    if (isRehabBridge(values)) return false;
    return true;
  }
  if (code === "initial_loan_amount" || code === "rehab_holdback") {
    if (values.request_max_leverage === "true" || values.bridge_type === "Bridge") return false;
  }
  if (DSCR_ONLY.has(code)) return isDscr;
  if (BRIDGE_ONLY.has(code)) return isBridge;
  return true;
}

export function isVisible(code: string, values: Record<string, string>): boolean {
  const field = fieldByCode(code);
  if (field?.section === "additional" || BORROWER_HIDDEN.has(code)) return false;
  return engineVisible(code, values) || (code === "other_annual_expenses" && values.loan_type === "DSCR");
}

export function isRequired(code: string, values: Record<string, string>): boolean {
  if (!isVisible(code, values)) return false;
  if (ALWAYS_REQUIRED.has(code)) return true;
  if (code === "loan_amount") return true;
  if (code === "fico_score") return values.citizenship === "U.S. Citizen";
  if (code === "purchase_price" && values.transaction_type === "Purchase") return true;
  if (code === "payoff_amount" && values.transaction_type === "Refinance Rate/Term") return true;
  if (code === "warrantability" || code === "residential_gla_51") return true;
  if (values.loan_type === "DSCR" && DSCR_REQUIRED.has(code)) return true;
  if (values.loan_type === "Bridge" && (code === "bridge_type" || code === "bridge_term")) return true;
  if (isRehabBridge(values) && (code === "rehab_budget" || code === "arv" || code === "initial_loan_amount")) return true;
  return false;
}

export function visibleSections(values: Record<string, string>): SectionDef[] {
  return SECTIONS.filter((section) => FIELDS.some((field) => field.section === section.id && isVisible(field.code, values)));
}

export function sectionFields(sectionId: string, values: Record<string, string>): PricingField[] {
  return FIELDS.filter((field) => field.section === sectionId && isVisible(field.code, values)).sort((a, b) => a.row - b.row);
}

export function rowsOf(sectionId: string, values: Record<string, string>): {row: number; fields: PricingField[]}[] {
  const grouped = new Map<number, PricingField[]>();
  for (const field of sectionFields(sectionId, values)) {
    const list = grouped.get(field.row) ?? [];
    list.push(field);
    grouped.set(field.row, list);
  }
  return [...grouped.entries()].sort((a, b) => a[0] - b[0]).map(([row, fields]) => ({row, fields}));
}

export function leaseRowCount(values: Record<string, string>): number {
  const bounds = unitBounds(values.property_type);
  const parsed = Number(values.number_of_units);
  if (!Number.isFinite(parsed)) return bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, Math.trunc(parsed)));
}

function cellFilled(value: string | undefined): boolean {
  return (value ?? "").trim() !== "";
}

export function fieldFilled(code: string, values: Record<string, string>, tables: Record<string, TableRow[]>): boolean {
  const field = fieldByCode(code);
  if (!field) return false;
  if (field.type === "boolean") return values[code] === "true" || values[code] === "false";
  if (field.type === "table") {
    if (code !== "leased_units") return true;
    const rows = tables.leased_units ?? [];
    const count = leaseRowCount(values);
    return rows.slice(0, count).every((row) => {
      if (row.leased === "Yes") return cellFilled(row.gross_rent);
      if (row.leased === "No") return cellFilled(row.market_rent);
      return false;
    });
  }
  return cellFilled(values[code]);
}

export function missingRequired(values: Record<string, string>, tables: Record<string, TableRow[]>, sectionId?: string): string[] {
  return FIELDS.filter((field) => (sectionId ? field.section === sectionId : true) && isRequired(field.code, values) && !fieldFilled(field.code, values, tables)).map((field) => field.code);
}

export function sectionProgress(sectionId: string, values: Record<string, string>, tables: Record<string, TableRow[]>): {done: number; total: number} {
  const required = FIELDS.filter((field) => field.section === sectionId && isRequired(field.code, values));
  const done = required.filter((field) => fieldFilled(field.code, values, tables)).length;
  return {done, total: required.length};
}

function numericValue(raw: string): number | undefined {
  const cleaned = raw.replace(/[$,%\s]/g, "").replace(/,/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

/** Values priceScenario will use. Blank fields are omitted so the engine default applies. Placeholders are never sent. */
export function pricingInputs(values: Record<string, string>, tables: Record<string, TableRow[]>): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const field of FIELDS) {
    if (field.section === "additional" || field.code === "other_annual_expenses" || !engineVisible(field.code, values)) continue;
    if (field.type === "table") {
      if (field.code === "leased_units") {
        const rows = (tables.leased_units ?? []).slice(0, leaseRowCount(values)).map((row) => ({
          leased: row.leased,
          gross_rent: row.leased === "Yes" ? numericValue(row.gross_rent ?? "") : undefined,
          market_rent: row.leased === "No" ? numericValue(row.market_rent ?? "") : undefined,
        }));
        if (rows.some((row) => row.leased || row.gross_rent != null || row.market_rent != null)) inputs.leased_units = rows;
      }
      if (field.code === "pe_mortgage_lates") {
        const rows = (tables.pe_mortgage_lates ?? blankLates()).map((row, index) => ({
          label: LATES_ROW_LABELS[index],
          previous_12_months: numericValue(row.previous_12_months ?? ""),
          previous_24_months: numericValue(row.previous_24_months ?? ""),
        }));
        if (rows.some((row) => row.previous_12_months != null || row.previous_24_months != null)) inputs.pe_mortgage_lates = rows;
      }
      continue;
    }
    if (field.type === "boolean") {
      inputs[field.code] = values[field.code] === "true";
      continue;
    }
    const raw = (values[field.code] ?? "").trim();
    if (raw === "") continue;
    if (field.type === "number" || field.type === "currency" || field.type === "percentage") {
      const value = numericValue(raw);
      if (value != null) inputs[field.code] = value;
      continue;
    }
    inputs[field.code] = raw;
  }
  if (values.loan_type === "DSCR") {
    const other = numericValue(values.other_annual_expenses ?? "");
    inputs.annual_flood = 0;
    inputs.annual_hoa = 0;
    inputs.annual_management = other ?? 0;
  }
  const address = fullAddress(values);
  if (address) inputs.pe_full_address = address;
  return inputs;
}
