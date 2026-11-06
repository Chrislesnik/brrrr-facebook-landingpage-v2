import {fieldByCode, leaseRowCount, unitBounds, type TableRow} from "./model";

/** The pricing engine workflow behind the Subject Property "Property Data" button. */
export const PROPERTY_DATA_URL =
  "https://www.pricingengine.pro/api/workflows/d7f8873d-d489-45bf-85b9-e9183056b62c/webhook";

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
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
};

export type PropertyPatch = {
  values: Record<string, string>;
  rows: TableRow[] | null;
};

export function propertyDataUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_PROPERTY_DATA_URL ?? "").trim() || PROPERTY_DATA_URL;
}

/** The form stores "New Jersey". The engine webhook expects "NJ". */
export function stateAbbreviation(name: string): string {
  const trimmed = name.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? "";
}

function money(value: unknown): string {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : NaN;
  if (!Number.isFinite(numeric)) return "";
  return (Math.round(numeric * 100) / 100).toFixed(2);
}

function wholeNumber(value: unknown): string {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/,/g, "")) : NaN;
  if (!Number.isFinite(numeric)) return "";
  return String(Math.trunc(numeric));
}

function dateOnly(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

function allowed(value: unknown, options: string[]): string {
  const text = typeof value === "string" ? value.trim() : "";
  return options.includes(text) ? text : "";
}

function leaseRents(value: unknown): string[] | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.map((row) => {
    if (!row || typeof row !== "object") return "";
    return money((row as Record<string, unknown>).market_rent);
  });
}

/** Fields the Property Data webhook wrote, plus lease rows when it returned rents. */
export function propertyPatch(current: Record<string, string>, inputs: Record<string, unknown>): PropertyPatch {
  const values: Record<string, string> = {};
  const propertyOptions = fieldByCode("property_type")?.options ?? [];
  const propertyType = allowed(inputs.property_type, propertyOptions);
  if (propertyType) values.property_type = propertyType;

  const bounds = unitBounds(values.property_type ?? current.property_type ?? "");
  if (bounds.min === bounds.max) {
    values.number_of_units = String(bounds.min);
  } else {
    const units = Number(wholeNumber(inputs.number_of_units));
    if (Number.isFinite(units) && units > 0) values.number_of_units = String(units);
  }

  const annualTaxes = money(inputs.annual_taxes);
  if (annualTaxes) values.annual_taxes = annualTaxes;
  const sqFootage = wholeNumber(inputs.sq_footage);
  if (sqFootage) values.sq_footage = sqFootage;
  const asIs = money(inputs.as_is_value);
  if (asIs) values.as_is_value = asIs;
  const rural = allowed(inputs.rural, ["Yes", "No"]);
  if (rural) values.rural = rural;
  const acquired = dateOnly(inputs.acquisition_date);
  if (acquired) values.acquisition_date = acquired;
  if ("purchase_price" in inputs) {
    const price = money(inputs.purchase_price);
    if (price) values.purchase_price = price;
  }

  const rents = leaseRents(inputs.leased_units);
  if (!rents || rents.every((rent) => rent === "")) return {values, rows: null};
  const count = leaseRowCount({...current, ...values});
  const rows = Array.from({length: count}, (_, index) => ({
    leased: "No",
    gross_rent: "",
    market_rent: rents[index] ?? "",
  }));
  return {values, rows};
}

export async function requestPropertyData(body: Record<string, string>): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(propertyDataUrl(), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(70000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {inputs?: unknown};
    if (!json.inputs || typeof json.inputs !== "object" || Array.isArray(json.inputs)) return null;
    return json.inputs as Record<string, unknown>;
  } catch {
    return null;
  }
}
