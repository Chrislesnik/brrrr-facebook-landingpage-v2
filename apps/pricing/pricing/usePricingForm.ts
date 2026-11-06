import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {
  blankLates,
  blankLeaseRow,
  expressionDefaults,
  fieldByCode,
  initialValues,
  leaseRowCount,
  missingRequired,
  unitBounds,
  type TableRow,
} from "./model";
import {propertyPatch, requestPropertyData, stateAbbreviation} from "./property-data";
import type {QuoteResult} from "./quote";
import {beginQuote, markPricingFormOpen, readPricingDraft, writePricingDraft} from "./quote-session";
import {navigate} from "../routes";
import {
  applyPricingTheme,
  readStoredScheme,
  resolvePricingScheme,
  writePricingScheme,
  type PricingColorScheme,
} from "./theme";

export type QuoteStatus =
  | {state: "idle"}
  | {state: "loading"}
  | {state: "done"; result: QuoteResult}
  | {state: "error"; message: string};

export {syncPricingTheme} from "./theme";

function propertyLookupKey(values: Record<string, string>): string {
  const street = values.address_street.trim();
  const city = values.address_city.trim();
  const state = stateAbbreviation(values.address_state);
  const zip = values.address_zip.trim();
  if (!street || !city || !state || !zip) return "";
  return [street, city, state, zip, values.transaction_type.trim()].join("\n");
}

function resizeLeases(current: TableRow[], count: number): TableRow[] {
  const next = current.slice(0, count);
  while (next.length < count) next.push(blankLeaseRow());
  return next;
}

export function usePricingTheme() {
  const [scheme, setScheme] = useState<PricingColorScheme>(() =>
    typeof window === "undefined" ? "light" : resolvePricingScheme(),
  );

  useEffect(() => {
    applyPricingTheme(resolvePricingScheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readStoredScheme()) return;
      const next = resolvePricingScheme();
      setScheme(next);
      applyPricingTheme(next);
    };
    media.addEventListener("change", onSystemChange);
    return () => {
      media.removeEventListener("change", onSystemChange);
      document.documentElement.classList.remove("pricing-theme", "dark");
      document.body.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    applyPricingTheme(scheme);
  }, [scheme]);

  const setColorScheme = useCallback((next: PricingColorScheme) => {
    writePricingScheme(next);
    setScheme(next);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme(scheme === "dark" ? "light" : "dark");
  }, [scheme, setColorScheme]);

  return {scheme, setColorScheme, toggleColorScheme};
}

export function usePricingForm() {
  const theme = usePricingTheme();
  const draft = useState(readPricingDraft)[0];
  const [entered, setValues] = useState(draft?.entered ?? initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>(draft?.touched ?? {});
  const computed = useMemo(() => {
    const defaults = expressionDefaults(entered);
    return Object.keys(defaults).filter((code) => !touched[code]);
  }, [entered, touched]);
  const values = useMemo(() => {
    const defaults = expressionDefaults(entered);
    const next = {...entered};
    for (const code of computed) next[code] = defaults[code];
    return next;
  }, [computed, entered]);
  const [tables, setTables] = useState<Record<string, TableRow[]>>(
    draft?.tables ?? {
      leased_units: [blankLeaseRow()],
      pe_mortgage_lates: blankLates(),
    },
  );
  const [asked, setAsked] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState({field: "", turn: 0});
  const [quote, setQuote] = useState<QuoteStatus>({state: "idle"});
  const [propertyLookup, setPropertyLookup] = useState<"idle" | "loading">("idle");
  const enteredRef = useRef(entered);
  enteredRef.current = entered;
  const lookupId = useRef(0);
  // The address already on the form when it opened. A reload restores it, so that is not a change.
  const lookupKey = useRef(propertyLookupKey(values));

  const messages = useMemo(() => {
    const next: Record<string, string> = {};
    for (const [sectionId, isAsked] of Object.entries(asked)) {
      if (!isAsked) continue;
      for (const code of missingRequired(values, tables, sectionId === "all" ? undefined : sectionId)) {
        const field = fieldByCode(code);
        if (sectionId !== "all" && field?.section !== sectionId) continue;
        next[code] = `Enter ${field?.label ?? code}.`;
      }
    }
    const units = Number(values.number_of_units);
    const bounds = unitBounds(values.property_type);
    if (values.number_of_units !== "" && (!Number.isFinite(units) || units < bounds.min || units > bounds.max)) {
      next.number_of_units = `Enter a unit count from ${bounds.min} to ${bounds.max}.`;
    }
    return next;
  }, [asked, tables, values]);

  const setValue = (code: string, value: string) => {
    setQuote({state: "idle"});
    setTouched((current) => (current[code] ? current : {...current, [code]: true}));
    setValues((current) => {
      const next = {...current, [code]: value};
      if (code === "property_type" || code === "number_of_units") {
        const bounds = unitBounds(next.property_type);
        if (bounds.min === bounds.max) next.number_of_units = String(bounds.min);
      }
      return next;
    });
    if (code === "property_type" || code === "number_of_units") {
      setTables((current) => {
        const source = code === "property_type" ? {...values, property_type: value} : {...values, number_of_units: value};
        if (code === "property_type" && unitBounds(value).min === unitBounds(value).max) {
          source.number_of_units = String(unitBounds(value).min);
        }
        return {...current, leased_units: resizeLeases(current.leased_units ?? [], leaseRowCount(source))};
      });
    }
  };

  const setCell = (code: string, row: number, key: string, value: string) => {
    setQuote({state: "idle"});
    setTables((current) => {
      const rows = (current[code] ?? []).map((item) => ({...item}));
      while (rows.length <= row) rows.push(code === "leased_units" ? blankLeaseRow() : {previous_12_months: "", previous_24_months: ""});
      rows[row] = {...rows[row], [key]: value};
      if (code === "leased_units" && key === "leased") {
        rows[row].gross_rent = value === "Yes" ? rows[row].gross_rent ?? "" : "";
        rows[row].market_rent = value === "No" ? rows[row].market_rent ?? "" : "";
      }
      return {...current, [code]: rows};
    });
  };

  const focusField = (field: string) => {
    if (!field) return;
    setFocus((current) => ({field, turn: current.turn + 1}));
  };

  const ask = (sectionId: string) => {
    setAsked((current) => ({...current, [sectionId]: true}));
  };

  useEffect(() => {
    const street = values.address_street.trim();
    const city = values.address_city.trim();
    const state = stateAbbreviation(values.address_state);
    const zip = values.address_zip.trim();
    const key = propertyLookupKey(values);
    if (!key || key === lookupKey.current) return;
    const id = ++lookupId.current;
    const transaction = values.transaction_type;
    const timer = window.setTimeout(() => {
      lookupKey.current = key;
      setPropertyLookup("loading");
      void requestPropertyData({
        address_street: street,
        address_city: city,
        address_state: state,
        address_zip: zip,
        transaction_type: transaction,
      }).then((inputs) => {
        if (id !== lookupId.current || !inputs) return;
        const patch = propertyPatch(enteredRef.current, inputs);
        if (Object.keys(patch.values).length > 0) {
          setTouched((current) => {
            const next = {...current};
            for (const code of Object.keys(patch.values)) next[code] = true;
            return next;
          });
          setValues((current) => ({...current, ...patch.values}));
        }
        if (patch.rows) setTables((current) => ({...current, leased_units: patch.rows ?? current.leased_units}));
      }).finally(() => {
        if (id === lookupId.current) setPropertyLookup("idle");
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      lookupId.current += 1;
    };
  }, [values.address_city, values.address_state, values.address_street, values.address_zip, values.transaction_type]);

  useEffect(() => {
    writePricingDraft({entered, tables, touched});
  }, [entered, tables, touched]);

  const resetForm = () => {
    lookupId.current += 1;
    const next = initialValues();
    lookupKey.current = propertyLookupKey(next);
    setValues(next);
    setTouched({});
    setTables({
      leased_units: [blankLeaseRow()],
      pe_mortgage_lates: blankLates(),
    });
    setAsked({});
    setFocus({field: "", turn: 0});
    setQuote({state: "idle"});
    setPropertyLookup("idle");
  };

  const beginCalculate = (returnTo: string) => {
    ask("all");
    const missing = missingRequired(values, tables);
    if (missing.length > 0 || messages.number_of_units) {
      focusField(missing[0] ?? "number_of_units");
      setQuote({state: "idle"});
      return;
    }
    markPricingFormOpen();
    beginQuote(values, tables, returnTo);
    navigate("/pricing/result");
  };

  return {
    values,
    computed,
    tables,
    messages,
    focus,
    quote,
    propertyLookup,
    setValue,
    setCell,
    focusField,
    ask,
    resetForm,
    beginCalculate,
    scheme: theme.scheme,
    toggleColorScheme: theme.toggleColorScheme,
  };
}
