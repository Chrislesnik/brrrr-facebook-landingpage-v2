import React, {useEffect, useId, useState} from "react";
import {CircleAlert, Info, Lock, MinusIcon, PlusIcon} from "lucide-react";
import {Button as AriaButton, Group, Input as AriaInput, NumberField} from "react-aria-components";

import {Badge} from "@/components/ui/badge";
import {Calendar} from "@/components/ui/calendar";
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {Item, ItemContent, ItemGroup, ItemTitle} from "@/components/ui/item";
import {Input} from "@/components/ui/input";
import {Spinner} from "@/components/ui/spinner";
import {Status} from "@/components/ui/status";
import {Label} from "@/components/ui/label";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";
import {useAddressAutocomplete, type SelectedAddress} from "../use-address-autocomplete";
import {CalcInput} from "./calc-input";
import {DateInput} from "./date-input";
import {YesNoSwitch} from "./yes-no-switch";
import {
  LATES_COLUMNS,
  LATES_ROW_LABELS,
  LEASED_COLUMNS,
  STATE_OPTIONS,
  fieldByCode,
  isRequired,
  leaseRowCount,
  rowsOf,
  unitBounds,
  type PricingField,
  type TableRow,
} from "./model";
import type {LoanOption, QuoteProgram, QuoteResult} from "./quote";

function PricingSelect(props: {
  id?: string;
  value: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select onValueChange={props.onChange} value={props.value}>
      <SelectTrigger
        aria-describedby={props.describedBy}
        aria-invalid={props.invalid || undefined}
        className={props.invalid ? "border-destructive" : undefined}
        id={props.id}
      >
        <SelectValue placeholder={props.placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {props.options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Problem(props: {hint?: string; message: string; id: string}) {
  if (!props.message && !props.hint) return null;
  return (
    <div className="text-xs leading-5">
      {props.message ? (
        <p className="pricing-error" id={props.id}>
          {props.message}
        </p>
      ) : props.hint ? (
        <p className="pricing-muted" id={props.id}>
          {props.hint}
        </p>
      ) : null}
    </div>
  );
}

function toDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(offsetDays: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function NumberInput(props: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  minValue?: number;
  maxValue?: number;
  readOnly?: boolean;
}) {
  const numeric = props.value !== "" && Number.isFinite(Number(props.value)) ? Number(props.value) : Number.NaN;
  return (
    <NumberField
      aria-describedby={props.describedBy}
      aria-label={props.label}
      className="w-full"
      isReadOnly={props.readOnly}
      maxValue={props.maxValue}
      minValue={props.minValue}
      onChange={(next) => props.onChange(Number.isNaN(next) ? "" : String(next))}
      value={numeric}
    >
      <Group
        className={`border-input data-focus-within:ring-1 data-focus-within:ring-ring relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border bg-transparent shadow-xs transition-colors outline-none data-disabled:opacity-50 ${props.invalid ? "border-destructive" : ""}`}
      >
        <AriaInput
          aria-invalid={props.invalid || undefined}
          className="w-full grow bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          id={props.id}
          placeholder={props.placeholder}
        />
        {props.readOnly ? null : (
          <>
            <AriaButton
              className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground flex aspect-square h-[inherit] items-center justify-center border-l text-sm transition-colors disabled:opacity-50"
              slot="decrement"
            >
              <MinusIcon className="size-4" />
            </AriaButton>
            <AriaButton
              className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground flex aspect-square h-[inherit] items-center justify-center border-l text-sm transition-colors disabled:opacity-50"
              slot="increment"
            >
              <PlusIcon className="size-4" />
            </AriaButton>
          </>
        )}
      </Group>
    </NumberField>
  );
}

function DatePickerControl(props: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  min?: Date;
  max?: Date;
}) {
  const selected = toDate(props.value);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  return (
    <Popover>
      <PopoverTrigger asChild>
        <DateInput
          className={props.invalid ? "border-destructive" : undefined}
          emptyOnMount
          id={props.id}
          onChange={(date) => props.onChange(fromDate(date))}
          value={selected}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          autoFocus
          className="min-w-[264px] rounded-md border"
          disabled={
            props.min || props.max
              ? (date: Date) => Boolean((props.min && date < props.min) || (props.max && date > props.max))
              : undefined
          }
          mode="single"
          month={month}
          onMonthChange={setMonth}
          onSelect={(date) => date && props.onChange(fromDate(date))}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  );
}

function CurrencyInput(props: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 z-10 text-sm text-muted-foreground">$</span>
      <CalcInput
        disabled={props.disabled}
        aria-describedby={props.describedBy}
        aria-invalid={props.invalid || undefined}
        aria-label={props.label}
        className={`w-full pl-6 ${props.invalid ? "border-destructive" : ""}`}
        id={props.id}
        onValueChange={props.onChange}
        placeholder={props.placeholder}
        value={props.value}
      />
    </div>
  );
}

function pricingState(address: SelectedAddress): string {
  const name = address.stateName.trim().toLowerCase();
  return STATE_OPTIONS.find((option) => option.toLowerCase() === name) ?? "";
}

function AddressInput(props: {
  id?: string;
  value: string;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  onChange: (code: string, value: string) => void;
}) {
  const fill = (address: SelectedAddress) => {
    props.onChange("address_street", address.street);
    if (address.apt) props.onChange("address_apt", address.apt);
    if (address.city) props.onChange("address_city", address.city);
    if (address.zip) props.onChange("address_zip", address.zip);
    if (address.county) props.onChange("address_county", address.county);
    const state = pricingState(address);
    if (state) props.onChange("address_state", state);
  };
  const places = useAddressAutocomplete(fill);
  return (
    <div className="relative" ref={places.rootRef}>
      <Input
        aria-activedescendant={places.activeIndex >= 0 ? places.optionId(places.activeIndex) : undefined}
        aria-autocomplete="list"
        aria-controls={places.listboxId}
        aria-describedby={props.describedBy}
        aria-expanded={places.open}
        aria-invalid={props.invalid || undefined}
        autoComplete="off"
        className={props.invalid ? "border-destructive" : undefined}
        id={props.id}
        onChange={(event) => {
          props.onChange("address_street", event.target.value);
          places.onInputChange(event.target.value);
        }}
        onFocus={places.onFocus}
        onKeyDown={places.onKeyDown}
        placeholder={props.placeholder}
        role="combobox"
        value={props.value}
      />
      {places.open ? (
        <div className="suggestions-in absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
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
    </div>
  );
}

function FieldControl(props: {
  field: PricingField;
  value: string;
  message: string;
  notice?: string;
  values: Record<string, string>;
  onChange: (code: string, value: string) => void;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const described = props.message || props.field.hint ? noteId : undefined;
  const invalid = props.message ? true : undefined;
  const locked = Boolean(props.field.locked);
  const label = (
    <div className="flex items-center gap-1">
      <Label htmlFor={id}>{props.field.label}</Label>
      {isRequired(props.field.code, props.values) ? <span className="text-xs text-red-500">*</span> : null}
      {locked ? <Lock aria-label="Set by the lender" className="ml-1 inline-block size-3 text-muted-foreground" /> : null}
      {props.field.tooltip ? (
        <Tooltip delayDuration={50}>
          <TooltipTrigger type="button">
            <Info className="size-3 stroke-[1.25] text-muted-foreground" />
            <span className="sr-only">More Info</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{props.field.tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );

  if (props.field.type === "boolean") {
    return (
      <div className="flex scroll-mt-24 scroll-mb-32 flex-col gap-1.5" data-field={props.field.code}>
        {label}
        <div className="flex h-9 items-center">
          <YesNoSwitch
            checked={props.value === "true"}
            id={id}
            onCheckedChange={(checked) => props.onChange(props.field.code, checked ? "true" : "false")}
          />
        </div>
        <Problem hint={props.field.hint} id={noteId} message={props.message} />
      </div>
    );
  }

  if (props.field.type === "dropdown" || props.field.type === "state") {
    const options = props.field.type === "state" ? STATE_OPTIONS : props.field.options ?? [];
    return (
      <div className="flex scroll-mt-24 scroll-mb-32 flex-col gap-1.5" data-field={props.field.code}>
        {label}
        <PricingSelect
          describedBy={described}
          id={id}
          invalid={Boolean(props.message)}
          onChange={(value) => props.onChange(props.field.code, value)}
          options={options}
          value={props.value}
        />
        <Problem hint={props.field.hint} id={noteId} message={props.message} />
      </div>
    );
  }

  const bounds = props.field.code === "number_of_units" ? unitBounds(props.values.property_type) : null;
  const change = (value: string) => props.onChange(props.field.code, value);
  const invalidClass = props.message ? "border-destructive" : undefined;

  let control: React.ReactNode;
  if (props.field.type === "currency") {
    control = (
      <CurrencyInput
        describedBy={described}
        disabled={locked}
        id={id}
        invalid={Boolean(props.message)}
        label={props.field.label}
        onChange={change}
        placeholder={props.field.placeholder}
        value={props.value}
      />
    );
  } else if (props.field.type === "number") {
    control = (
      <NumberInput
        describedBy={described}
        id={id}
        invalid={Boolean(props.message)}
        label={props.field.label}
        maxValue={bounds?.max}
        minValue={bounds?.min ?? 0}
        onChange={change}
        placeholder={props.field.placeholder}
        readOnly={bounds ? bounds.min === bounds.max : undefined}
        value={props.value}
      />
    );
  } else if (props.field.type === "percentage") {
    control = (
      <div className="relative">
        <Input
          aria-describedby={described}
          aria-invalid={invalid}
          className={`pr-8 ${invalidClass ?? ""}`}
          disabled={locked}
          id={id}
          max={100}
          min={0}
          onChange={(event) => {
            const next = event.target.value;
            const number = Number(next);
            if (next !== "" && Number.isFinite(number)) {
              if (number < 0) return change("0");
              if (number > 100) return change("100");
            }
            change(next);
          }}
          placeholder={props.field.placeholder}
          step={0.01}
          type="number"
          value={props.value}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    );
  } else if (props.field.type === "date") {
    control = (
      <DatePickerControl
        id={id}
        invalid={Boolean(props.message)}
        max={props.field.dateMax === "yesterday" ? startOfDay(-1) : undefined}
        min={props.field.dateMin === "today" ? startOfDay(0) : undefined}
        onChange={change}
        value={props.value}
      />
    );
  } else if (props.field.code === "address_street") {
    control = (
      <AddressInput
        describedBy={described}
        id={id}
        invalid={Boolean(props.message)}
        onChange={props.onChange}
        placeholder={props.field.placeholder}
        value={props.value}
      />
    );
  } else {
    control = (
      <Input
        aria-describedby={described}
        aria-invalid={invalid}
        className={invalidClass}
        id={id}
        onChange={(event) => change(event.target.value)}
        placeholder={props.field.placeholder}
        value={props.value}
      />
    );
  }

  return (
    <div className="flex scroll-mt-24 scroll-mb-32 flex-col gap-1.5" data-field={props.field.code}>
      {label}
      {control}
      <Problem hint={props.field.hint} id={noteId} message={props.message} />
      {props.notice ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner aria-hidden="true" role="presentation" />
          <span>{props.notice}</span>
        </p>
      ) : null}
    </div>
  );
}

function RequiredMark() {
  return <span className="text-xs text-red-500">*</span>;
}

function LeaseRow(props: {
  index: number;
  total: number;
  required: boolean;
  row: TableRow;
  onCell: (code: string, row: number, key: string, value: string) => void;
}) {
  const leasedId = useId();
  const rentId = useId();
  const leased = props.row.leased ?? "";
  const rentKey = leased === "Yes" ? "gross_rent" : "market_rent";
  const rentLabel = leased === "Yes" ? "Gross Rent" : "Expected Market Rent";
  const unit = props.total > 1 ? `Unit ${props.index + 1} ` : "";
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <Label htmlFor={leasedId}>{unit}Leased</Label>
          {props.required ? <RequiredMark /> : null}
        </div>
        <PricingSelect
          id={leasedId}
          onChange={(value) => props.onCell("leased_units", props.index, "leased", value)}
          options={["Yes", "No"]}
          value={leased}
        />
      </div>
      {leased === "Yes" || leased === "No" ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor={rentId}>{rentLabel}</Label>
            {props.required ? <RequiredMark /> : null}
          </div>
          <CurrencyInput
            id={rentId}
            label={`${unit}${rentLabel}`}
            onChange={(value) => props.onCell("leased_units", props.index, rentKey, value)}
            placeholder="0.00"
            value={props.row[rentKey] ?? ""}
          />
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}

function LeaseUnits(props: {
  message: string;
  required: boolean;
  rows: TableRow[];
  onCell: (code: string, row: number, key: string, value: string) => void;
}) {
  return (
    <div className="scroll-mt-24 scroll-mb-32 sm:col-span-2" data-field="leased_units">
      <p className="mb-3 text-sm font-medium">Leased Units</p>
      <div className="flex flex-col gap-4">
        {props.rows.map((row, index) => (
          <LeaseRow index={index} key={index} onCell={props.onCell} required={props.required} row={row} total={props.rows.length} />
        ))}
      </div>
      {props.message ? <p className="pricing-error mt-1 text-xs">{props.message}</p> : null}
    </div>
  );
}

function TableEditor(props: {
  code: string;
  message: string;
  required: boolean;
  rows: TableRow[];
  onCell: (code: string, row: number, key: string, value: string) => void;
}) {
  const columns = props.code === "leased_units" ? LEASED_COLUMNS : LATES_COLUMNS;
  const labels = props.code === "pe_mortgage_lates" ? LATES_ROW_LABELS : props.rows.map((_, index) => `#${index + 1}`);
  return (
    <div className="scroll-mt-24 scroll-mb-32 sm:col-span-2" data-field={props.code}>
      <p className="mb-2 text-sm font-medium">
        {fieldByCode(props.code)?.label}
        {props.required ? <span className="pricing-error"> *</span> : null}
      </p>
      <div className="pricing-line overflow-x-auto rounded-md border">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="pricing-table-head text-left">
              <th className="px-3 py-2 font-medium"> </th>
              {columns.map((column) => (
                <th className="px-3 py-2 font-medium" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, index) => (
              <tr className="pricing-line border-t" key={labels[index] ?? index}>
                <th className="px-3 py-2 text-left font-medium">{labels[index]}</th>
                {columns.map((column) => (
                  <td className="px-3 py-2" key={column.key}>
                    {column.type === "toggle" ? (
                      <PricingSelect
                        onChange={(value) => props.onCell(props.code, index, column.key, value)}
                        options={["Yes", "No"]}
                        value={row[column.key] ?? ""}
                      />
                    ) : column.type === "currency" ? (
                      <CurrencyInput
                        label={`${labels[index]} ${column.label}`}
                        onChange={(value) => props.onCell(props.code, index, column.key, value)}
                        placeholder="0.00"
                        value={row[column.key] ?? ""}
                      />
                    ) : (
                      <NumberInput
                        label={`${labels[index]} ${column.label}`}
                        minValue={0}
                        onChange={(value) => props.onCell(props.code, index, column.key, value)}
                        placeholder="0"
                        value={row[column.key] ?? ""}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.message ? <p className="pricing-error mt-1 text-xs">{props.message}</p> : null}
    </div>
  );
}

export function SectionFields(props: {
  sectionId: string;
  values: Record<string, string>;
  tables: Record<string, TableRow[]>;
  messages: Record<string, string>;
  propertyLookup?: "idle" | "loading";
  onChange: (code: string, value: string) => void;
  onCell: (code: string, row: number, key: string, value: string) => void;
}) {
  const rows = rowsOf(props.sectionId, props.values);
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {rows.map(({row, fields}) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" key={row}>
            {fields.map((field) => {
              if (field.type === "table") {
                const count = field.code === "leased_units" ? leaseRowCount(props.values) : LATES_ROW_LABELS.length;
                const tableRows = (props.tables[field.code] ?? []).slice(0, count);
                if (field.code === "leased_units") {
                  return (
                    <LeaseUnits
                      key={field.code}
                      message={props.messages[field.code] ?? ""}
                      onCell={props.onCell}
                      required={isRequired(field.code, props.values)}
                      rows={tableRows}
                    />
                  );
                }
                return (
                  <TableEditor
                    code={field.code}
                    key={field.code}
                    message={props.messages[field.code] ?? ""}
                    onCell={props.onCell}
                    required={isRequired(field.code, props.values)}
                    rows={tableRows}
                  />
                );
              }
              return (
                <div className={field.width === 100 ? "sm:col-span-2" : ""} key={field.code}>
                <FieldControl
                  field={field}
                    message={props.messages[field.code] ?? ""}
                    notice={field.code === "address_street" && props.propertyLookup === "loading" ? "Looking up property…" : undefined}
                    onChange={props.onChange}
                    value={props.values[field.code] ?? ""}
                    values={props.values}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function useFocusField(turn: number, field: string, root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (turn === 0 || !field) return;
    const target = root.current?.querySelector(`[data-field="${field}"] :is(input, select, button)`);
    if (target instanceof HTMLElement) target.focus();
  }, [turn, field, root]);
}

function money(value: number | undefined): string {
  if (value == null) return "—";
  const digits = Number.isInteger(value) ? 0 : 2;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function figure(value: number | undefined, digits = 3): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US", {maximumFractionDigits: digits});
}

function percent(value: number | undefined, digits = 3): string {
  if (value == null) return "—";
  return `${figure(value, digits)}%`;
}

/** A raw rate of 8 is 8.000%. */
function ratePercent(value: number | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("en-US", {minimumFractionDigits: 3, maximumFractionDigits: 3})}%`;
}

export function quoteHighlights(program: QuoteProgram): {label: string; value: string}[] {
  const option = program.options[0];
  const loanAmount = program.loanAmount ?? option?.totalLoanAmount ?? option?.loanAmount ?? option?.initialLoanAmount;
  const ltv = program.ltv ?? option?.ltv;
  return [
    {label: "Loan amount", value: money(loanAmount)},
    {label: "Loan-to-value", value: percent(ltv, 2)},
    {label: "Interest rate", value: ratePercent(option?.rate)},
    {label: "Monthly payment (PITIA)", value: money(option?.monthlyPayment ?? option?.pitia)},
    {label: "DSCR", value: figure(option?.dscr, 3)},
    {label: "Origination fee", value: program.origination ?? option?.origination ?? "—"},
  ];
}

export function loanOptionRows(option: LoanOption): {label: string; value: string}[] {
  return [
    {label: "Loan amount", value: money(option.loanAmount)},
    {label: "Loan-to-value", value: percent(option.ltv, 2)},
    {label: "Interest rate", value: ratePercent(option.rate)},
    {label: "Monthly payment (PITIA)", value: money(option.monthlyPayment)},
    {label: "DSCR", value: figure(option.dscr, 3)},
    {label: "Origination fee", value: option.origination ?? "—"},
  ];
}

export function RateFigures(props: {rows: {label: string; value: string}[]}) {
  const {rows} = props;
  const rate = rows.find((row) => row.label === "Interest rate");
  const lead = rows.filter((row) => row.label === "Loan amount" || row.label.startsWith("Monthly payment"));
  const rest = rows.filter((row) => row.label !== "Interest rate" && !lead.includes(row));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Interest rate</p>
        <p className="text-4xl font-semibold tracking-tight tabular-nums">{rate?.value ?? "—"}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {lead.map((row) => (
          <Figure key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rest.map((row) => (
          <Figure key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function Figure(props: {label: string; value: string}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/60 px-3 py-3">
      <span className="text-xs text-muted-foreground">{props.label}</span>
      <span className="text-lg font-semibold tracking-tight tabular-nums">{props.value}</span>
    </div>
  );
}

export function QuotePanel(props: {footer?: React.ReactNode; result: QuoteResult}) {
  const {result} = props;
  return (
    <div className="flex flex-col gap-4">
      {result.missing.length > 0 ? (
        <p className="pricing-error text-sm">Still needed: {result.missing.join(", ")}.</p>
      ) : null}
      {result.programs.length === 0 && result.missing.length === 0 ? (
        <Empty className="pricing-card border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert />
            </EmptyMedia>
            <EmptyTitle>No rate yet</EmptyTitle>
            <EmptyDescription>
              {result.note ?? "We couldn't match this deal to a program. Double-check the details above and try again."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {result.programs.map((program) => {
        const failed = program.pass === false;
        return (
          <Card className="pricing-card border" key={program.name}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Status variant={failed ? "destructive" : "success"} />
                  <h3 className="text-sm font-semibold">{failed ? "Fail" : "Pass"}</h3>
                </div>
                <Badge variant={failed ? "destructive" : "success"}>{program.name}</Badge>
              </div>
              {failed ? (
                program.validations.length > 0 ? (
                  <ItemGroup>
                    {program.validations.map((reason) => (
                      <Item key={reason} size="sm" variant="outline">
                        <ItemContent>
                          <ItemTitle>{reason}</ItemTitle>
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                ) : (
                  <p className="text-sm text-muted-foreground">This scenario does not qualify.</p>
                )
              ) : (
                <RateFigures rows={quoteHighlights(program)} />
              )}
            </CardContent>
            {!failed && props.footer ? <CardFooter className="grid gap-2 sm:grid-cols-2">{props.footer}</CardFooter> : null}
          </Card>
        );
      })}
    </div>
  );
}
