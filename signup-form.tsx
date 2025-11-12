"use client";

import type {InputProps, SelectProps} from "@heroui/react";

import React from "react";
import {Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button} from "@heroui/react";
import states from "./states";
import {cn} from "@heroui/react";
import {ButtonWithBorderGradient} from "./button-with-border-gradient";
import {LazyMotion, domAnimation, m, AnimatePresence} from "framer-motion";

export type SignUpFormProps = React.HTMLAttributes<HTMLFormElement>;

const SignUpForm = React.forwardRef<HTMLFormElement, SignUpFormProps>(
  ({className, ...props}, ref) => {
    const formRef = React.useRef<HTMLFormElement>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submitState, setSubmitState] = React.useState<"idle" | "loading" | "success">("idle");
    const [loanType, setLoanType] = React.useState<"DSCR" | "Fix & Flip">("DSCR");
    const [transactionType, setTransactionType] = React.useState<
      "Purchase" | "Refinance Cash Out" | "Refinance Rate/Term"
    >("Purchase");
    const [currencyValues, setCurrencyValues] = React.useState<Record<string, string>>({});
    const [isPersonalModalOpen, setIsPersonalModalOpen] = React.useState(false);
    const [personalFirstName, setPersonalFirstName] = React.useState("");
    const [personalLastName, setPersonalLastName] = React.useState("");
    const [personalEmail, setPersonalEmail] = React.useState("");
    const [personalPhone, setPersonalPhone] = React.useState("");
    const [submittedLoanType, setSubmittedLoanType] = React.useState<"DSCR" | "Fix & Flip" | null>(null);
    const [pricingResult, setPricingResult] = React.useState<any | null>(null);
    const [pricingValidation, setPricingValidation] = React.useState<boolean | null>(null);
    const [pricingErrors, setPricingErrors] = React.useState<string[]>([]);
    const [zip, setZip] = React.useState("");

    const inputProps: Pick<InputProps, "labelPlacement" | "classNames"> = {
      labelPlacement: "outside",
      classNames: {
        label:
          "text-small font-medium text-default-700 group-data-[filled-within=true]:text-default-700",
      },
    };

    const selectProps: Pick<SelectProps, "labelPlacement" | "classNames"> = {
      labelPlacement: "outside",
      classNames: {
        label: "text-small font-medium text-default-700 group-data-[filled=true]:text-default-700",
      },
    };

    // Dynamic max for Requested LTV based on transaction type
    const requestedLtvMax = transactionType === "Refinance Cash Out" ? 75 : 80;

    // Currency helpers
    const formatCurrencyInput = (value: string): string => {
      if (!value) return "";
      // keep digits and at most one decimal point
      let cleaned = value.replace(/[^\d.]/g, "");
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
      if (cleaned === ".") return "0.";
      const [intPartRaw, fracRaw = ""] = cleaned.split(".");
      const intNum = intPartRaw ? Number(intPartRaw) : 0;
      const intFormatted = intNum.toLocaleString("en-US");
      const frac = fracRaw.slice(0, 2);
      return cleaned.includes(".") ? `${intFormatted}.${frac}` : intFormatted;
    };

    const handleCurrencyChange =
      (name: string): React.ChangeEventHandler<HTMLInputElement> =>
      (e) => {
        const formatted = formatCurrencyInput(e.target.value);
        setCurrencyValues((prev) => ({...prev, [name]: formatted}));
      };

    const parseCurrencyToNumber = (value: string): number => {
      const cleaned = (value || "").replace(/[^0-9.-]/g, "");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    // Phone formatting for modal: (xxx) xxx-xxxx
    const formatUsPhone = (raw: string): string => {
      const digits = raw.replace(/\D/g, "").slice(0, 10);
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 6);
      const c = digits.slice(6, 10);
      if (!digits) return "";
      if (digits.length <= 3) return `(${a}`;
      if (digits.length <= 6) return `(${a}) ${b}`;
      return `(${a}) ${b}-${c}`;
    };
    const handlePersonalPhoneChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      setPersonalPhone(formatUsPhone(e.target.value));
    };

    // Personal info validation (all required)
    const isPersonalValid =
      personalFirstName.trim().length > 0 &&
      personalLastName.trim().length > 0 &&
      personalEmail.trim().length > 0 &&
      personalPhone.replace(/\D/g, "").length === 10;

    // US State abbreviation helper
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
    const abbreviateUsState = (raw: string): string => {
      const trimmed = (raw || "").trim();
      if (!trimmed) return "";
      if (trimmed.length === 2) return trimmed.toUpperCase();
      const key = trimmed.toLowerCase().replace(/[-_]+/g, " ");
      return STATE_ABBR[key] ?? trimmed.toUpperCase();
    };

    // Helper to fetch a value from an object by alias-insensitive keys
    const getValueByAliases = (obj: any, aliases: string[]) => {
      if (!obj || typeof obj !== "object") return undefined;
      const normalizedMap = new Map<string, any>();
      for (const [k, v] of Object.entries(obj)) {
        normalizedMap.set(String(k).toLowerCase().replace(/[\s_\-]/g, ""), v);
      }
      for (const alias of aliases) {
        const key = alias.toLowerCase().replace(/[\s_\-]/g, "");
        if (normalizedMap.has(key)) return normalizedMap.get(key);
      }
      return undefined;
    };

    const formatPercent = (val: any): string => {
      if (val === null || val === undefined) return "—";
      const s = String(val).trim();
      if (s.endsWith("%")) return s;
      return `${s}%`;
    };

    const formatCurrency = (val: any): string => {
      if (val === null || val === undefined || val === "") return "—";
      const cleaned = String(val).replace(/[^0-9.\-]/g, "");
      const num = Number(cleaned);
      if (!Number.isFinite(num)) return `$${String(val)}`;
      return num.toLocaleString("en-US", {style: "currency", currency: "USD"});
    };

    // Required label helper
    const Required = ({text}: {text: string}) => (
      <span>
        {text} <span className="text-danger-500">*</span>
      </span>
    );

    const handleZipChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
      setZip(digits);
    };

    const clampNonNegative: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const n = Number(e.target.value);
      if (Number.isNaN(n) || n < 0) {
        e.target.value = "0";
      }
    };

    const clampInRange =
      (min: number, max: number): React.ChangeEventHandler<HTMLInputElement> =>
      (e) => {
        const n = Number(e.target.value);
        if (Number.isNaN(n)) {
          e.target.value = String(min);
          return;
        }
        if (n < min) e.target.value = String(min);
        if (n > max) e.target.value = String(max);
      };

    // Session storage helpers for personal info
    type PersonalInfo = {firstName: string; lastName: string; email: string; phone: string};
    const personalSessionKey = "brrrr_personal_info";
    const getStoredPersonal = (): PersonalInfo | null => {
      try {
        const raw = sessionStorage.getItem(personalSessionKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersonalInfo;
        if (!parsed?.firstName || !parsed?.lastName || !parsed?.email || !parsed?.phone) return null;
        return parsed;
      } catch {
        return null;
      }
    };
    const setStoredPersonal = (p: PersonalInfo) => {
      try {
        sessionStorage.setItem(personalSessionKey, JSON.stringify(p));
      } catch {
        // ignore storage errors
      }
    };

    const buildAndSendPayload = async (personal: PersonalInfo) => {
      // Use browser form validation where possible
      if (formRef.current && typeof formRef.current.reportValidity === "function") {
        const ok = formRef.current.reportValidity();
        if (!ok) return;
      }
      setSubmittedLoanType(loanType);
      setIsSubmitting(true);
      setSubmitState("loading");
      try {
        const form = formRef.current;
        const data = new FormData(form || undefined);

        // Programmatic validation for visible required fields
        const requiredNames: string[] = [
          "loan-type",
          "mid-fico-score",
          "street",
          "city",
          "state",
          "zip",
          "property-type",
          "transaction-type",
        ];
        if (transactionType === "Purchase") {
          requiredNames.push("purchase-price");
        }
        if (transactionType === "Refinance Cash Out" || transactionType === "Refinance Rate/Term") {
          requiredNames.push("as-is-value", "payoff-amount");
        }
        if (loanType === "DSCR") {
          requiredNames.push("monthly-income", "monthly-expenses");
        }
        if (loanType === "Fix & Flip") {
          requiredNames.push("projects-completed-36mo", "rehab-budget", "after-repair-value");
        }
        if (loanType !== "Fix & Flip") {
          requiredNames.push("requested-ltv");
        }
        const missing = requiredNames.filter((n) => String(data.get(n) || "").trim() === "");
        if (missing.length > 0) {
          // Trigger native validation UI if possible and abort
          if (form && typeof form.reportValidity === "function") form.reportValidity();
          setSubmitState("idle");
          setIsSubmitting(false);
          return;
        }
        const payload = {
          loanType: String(data.get("loan-type") || ""),
          midFicoScore: Number(String(data.get("mid-fico-score") || "0")),
          address: {
            street: String(data.get("street") || ""),
            apt: String(data.get("apt") || ""),
            city: String(data.get("city") || ""),
            state: abbreviateUsState(String(data.get("state") || "")),
            zip: String(data.get("zip") || ""),
          },
          propertyType: String(data.get("property-type") || ""),
          transactionType: String(data.get("transaction-type") || ""),
          purchasePrice: parseCurrencyToNumber(String(data.get("purchase-price") || "")),
          asIsValue: parseCurrencyToNumber(String(data.get("as-is-value") || "")),
          payoffAmount: parseCurrencyToNumber(String(data.get("payoff-amount") || "")),
          dscr: {
            monthlyIncome: parseCurrencyToNumber(String(data.get("monthly-income") || "")),
            monthlyExpenses: parseCurrencyToNumber(String(data.get("monthly-expenses") || "")),
          },
          fixAndFlip: {
            projectsCompleted36Mo: Number(String(data.get("projects-completed-36mo") || "0")),
            rehabBudget: parseCurrencyToNumber(String(data.get("rehab-budget") || "")),
            afterRepairValue: parseCurrencyToNumber(String(data.get("after-repair-value") || "")),
          },
          requestedLtvPercent: Number(String(data.get("requested-ltv") || "0")),
          personal,
        };

        const response = await fetch("https://n8n.axora.info/webhook/8204a19f-48ef-45f9-ab03-cf93a7590567", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload),
        });
        let json: any = null;
        try {
          json = await response.json();
        } catch {
          json = null;
        }
        // derive validation flag and errors
        const validationRaw = json?.Validation ?? json?.validation;
        const validationBool =
          validationRaw === true ||
          validationRaw === "true" ||
          validationRaw === 1 ||
          validationRaw === "1";
        setPricingValidation(validationBool);
        // normalize errors
        const errsRaw = json?.Errors ?? json?.errors ?? [];
        const errs: string[] = Array.isArray(errsRaw)
          ? errsRaw
              .map((e: any) => {
                if (!e) return null;
                if (typeof e === "string") return e;
                if (typeof e.message === "string") return e.message;
                if (typeof e.reason === "string") return e.reason;
                if (e.field) return String(e.field);
                return null;
              })
              .filter(Boolean)
          : [];
        setPricingErrors(errs as string[]);
        setPricingResult(json);
        setSubmitState("success");
        // Make the button reusable by resetting the label after a short delay
        setTimeout(() => setSubmitState("idle"), 1200);
      } catch (_err) {
        setSubmitState("idle");
      } finally {
        setIsSubmitting(false);
      }
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting) return;
      const stored = getStoredPersonal();
      if (stored) {
        // Already have personal info for this session; submit directly
        buildAndSendPayload(stored);
      } else {
        // Open modal to collect personal information first
        setIsPersonalModalOpen(true);
      }
    };

    const handleConfirmPersonal = async () => {
      if (isSubmitting) return;
      if (!isPersonalValid) return;
      const personal: PersonalInfo = {
        firstName: personalFirstName.trim(),
        lastName: personalLastName.trim(),
        email: personalEmail.trim(),
        phone: personalPhone.trim(),
      };
      setStoredPersonal(personal);
      setIsPersonalModalOpen(false);
      await buildAndSendPayload(personal);
    };

    return (
      <>
        <div className="text-default-foreground text-3xl leading-9 font-bold">
          Loan Details 👇
        </div>
        <div className="text-default-500 mt-1">
          Tell us about the property and your requested financing. We’ll use these details to generate
          instant pricing and show your best-fit terms right after you submit.
        </div>
        <Modal isOpen={isPersonalModalOpen} onOpenChange={setIsPersonalModalOpen}>
          <ModalContent>
            {() => (
              <>
                <ModalHeader>Instant Pricing</ModalHeader>
                <ModalBody>
                  <div className="text-default-500">
                    Really quick... enter your details below to get your terms instantly 🫡
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <Input
                      className="col-span-12 md:col-span-6"
                      label="First Name"
                      placeholder="Jane"
                      required
                      value={personalFirstName}
                      onChange={(e) => setPersonalFirstName(e.target.value)}
                      {...inputProps}
                    />
                    <Input
                      className="col-span-12 md:col-span-6"
                      label="Last Name"
                      placeholder="Doe"
                      required
                      value={personalLastName}
                      onChange={(e) => setPersonalLastName(e.target.value)}
                      {...inputProps}
                    />
                    <Input
                      className="col-span-12"
                      label="Email"
                      type="email"
                      placeholder="jane@domain.com"
                      required
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      {...inputProps}
                    />
                    <Input
                      className="col-span-12"
                      label="Phone"
                      type="tel"
                      placeholder="(xxx) xxx-xxxx"
                      inputMode="numeric"
                      maxLength={14}
                      required
                      value={personalPhone}
                      onChange={handlePersonalPhoneChange}
                      {...inputProps}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setIsPersonalModalOpen(false)} isDisabled={isSubmitting}>
                    Cancel
                  </Button>
                  <ButtonWithBorderGradient onClick={handleConfirmPersonal} isDisabled={isSubmitting || !isPersonalValid}>
                    Continue
                  </ButtonWithBorderGradient>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        <form
          ref={formRef}
          {...props}
          className={cn("flex grid grid-cols-12 flex-col gap-x-4 gap-y-4 py-8", className)}
          onSubmit={onSubmit}
        >
          <Select
            className="col-span-12 md:col-span-6"
            label={<Required text="Loan Type" />}
            name="loan-type"
            required
            selectedKeys={[loanType]}
            onChange={(e) => setLoanType((e.target as HTMLSelectElement).value as "DSCR" | "Fix & Flip")}
            {...selectProps}
          >
            <SelectItem key="DSCR">DSCR</SelectItem>
            <SelectItem key="Fix & Flip">Fix &amp; Flip</SelectItem>
          </Select>

          <Input
            className="col-span-12 md:col-span-6"
            label={<Required text="Mid FICO Score" />}
            name="mid-fico-score"
            placeholder="e.g., 740"
            required
            type="number"
            inputMode="numeric"
            min={300}
            max={850}
            step={1}
            onChange={clampInRange(300, 850)}
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-8"
            label={<Required text="Street" />}
            name="street"
            placeholder="123 Main St"
            required
            {...inputProps}
          />
          <Input
            className="col-span-12 md:col-span-4"
            label="Apt #"
            name="apt"
            placeholder="Apt 4B"
            {...inputProps}
          />
          <Input
            className="col-span-12 md:col-span-4"
            label={<Required text="City" />}
            name="city"
            placeholder="San Francisco"
            required
            {...inputProps}
          />
          <Select
            className="col-span-12 md:col-span-4"
            label={<Required text="State" />}
            name="state"
            placeholder="Select state"
            required
            {...selectProps}
          >
            {states.map((st) => (
              <SelectItem key={st.value}>{abbreviateUsState(st.title)}</SelectItem>
            ))}
          </Select>
          <Input
            className="col-span-12 md:col-span-4"
            label={<Required text="Zip Code" />}
            name="zip"
            placeholder="94105"
            type="text"
            inputMode="numeric"
            pattern="^[0-9]{5}$"
            maxLength={5}
            required
            value={zip}
            onChange={handleZipChange}
            {...inputProps}
          />

          <Select
            className="col-span-12 md:col-span-6"
            label={<Required text="Property Type" />}
            name="property-type"
            placeholder="Select property type"
            required
            {...selectProps}
          >
            <SelectItem key="Single Family">Single Family</SelectItem>
            <SelectItem key="Townhome/PUD">Townhome/PUD</SelectItem>
            <SelectItem key="Condominium">Condominium</SelectItem>
            <SelectItem key="Multifamily 2-4 Units">Multifamily 2-4 Units</SelectItem>
            <SelectItem key="Multifamily 5-8 Units">Multifamily 5-8 Units</SelectItem>
          </Select>

          <Select
            className="col-span-12 md:col-span-6"
            label={<Required text="Transaction Type" />}
            name="transaction-type"
            required
            selectedKeys={[transactionType]}
            onChange={(e) =>
              setTransactionType(
                (e.target as HTMLSelectElement).value as
                  | "Purchase"
                  | "Refinance Cash Out"
                  | "Refinance Rate/Term",
              )
            }
            {...selectProps}
          >
            <SelectItem key="Purchase">Purchase</SelectItem>
            <SelectItem key="Refinance Cash Out">Refinance Cash Out</SelectItem>
            <SelectItem key="Refinance Rate/Term">Refinance Rate/Term</SelectItem>
          </Select>

          {transactionType === "Purchase" && (
            <Input
              className="col-span-12 md:col-span-6"
              label={<Required text="Purchase Price" />}
              name="purchase-price"
              placeholder="0.00"
              type="text"
              inputMode="decimal"
              startContent={<span className="text-default-500">$</span>}
              required
              value={currencyValues["purchase-price"] ?? ""}
              onChange={handleCurrencyChange("purchase-price")}
              {...inputProps}
            />
          )}
          {(transactionType === "Refinance Cash Out" || transactionType === "Refinance Rate/Term") && (
            <Input
              className="col-span-12 md:col-span-6"
              label={<Required text="As-Is Value" />}
              name="as-is-value"
              placeholder="0.00"
              type="text"
              inputMode="decimal"
              startContent={<span className="text-default-500">$</span>}
              required
              value={currencyValues["as-is-value"] ?? ""}
              onChange={handleCurrencyChange("as-is-value")}
              {...inputProps}
            />
          )}
          {(transactionType === "Refinance Cash Out" || transactionType === "Refinance Rate/Term") && (
            <Input
              className="col-span-12 md:col-span-6"
              label={<Required text="Payoff Amount" />}
              name="payoff-amount"
              placeholder="0.00"
              type="text"
              inputMode="decimal"
              startContent={<span className="text-default-500">$</span>}
              required
              value={currencyValues["payoff-amount"] ?? ""}
              onChange={handleCurrencyChange("payoff-amount")}
              {...inputProps}
            />
          )}

          {loanType === "DSCR" && (
            <>
              <Input
                className="col-span-12 md:col-span-6"
                label={<Required text="Monthly Income" />}
                name="monthly-income"
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                startContent={<span className="text-default-500">$</span>}
                required
                value={currencyValues["monthly-income"] ?? ""}
                onChange={handleCurrencyChange("monthly-income")}
                {...inputProps}
              />
              <Input
                className="col-span-12 md:col-span-6"
                label={<Required text="Monthly Expenses" />}
                name="monthly-expenses"
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                startContent={<span className="text-default-500">$</span>}
                required
                value={currencyValues["monthly-expenses"] ?? ""}
                onChange={handleCurrencyChange("monthly-expenses")}
                {...inputProps}
              />
            </>
          )}

          {loanType === "Fix & Flip" && (
            <>
              <Input
                className="col-span-12 md:col-span-6"
                label={<Required text="Projects (Last 36 Months)" />}
                name="projects-completed-36mo"
                placeholder="e.g., 3"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                required
                onChange={clampNonNegative}
                {...inputProps}
              />
              <Input
                className="col-span-12 md:col-span-6"
                label={<Required text="Rehab Budget" />}
                name="rehab-budget"
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                startContent={<span className="text-default-500">$</span>}
                required
                value={currencyValues["rehab-budget"] ?? ""}
                onChange={handleCurrencyChange("rehab-budget")}
                {...inputProps}
              />
              <Input
                className="col-span-12 md:col-span-6"
                label={<Required text="After Repair Value" />}
                name="after-repair-value"
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                startContent={<span className="text-default-500">$</span>}
                required
                value={currencyValues["after-repair-value"] ?? ""}
                onChange={handleCurrencyChange("after-repair-value")}
                {...inputProps}
              />
            </>
          )}

          {loanType !== "Fix & Flip" && (
            <Input
              className="col-span-12 md:col-span-6"
              label={<Required text="Requested LTV" />}
              name="requested-ltv"
              placeholder="e.g., 75"
              type="number"
              min={0}
              max={requestedLtvMax}
              step="0.01"
              inputMode="decimal"
              endContent={<span className="text-default-500">%</span>}
              onChange={clampInRange(0, requestedLtvMax)}
              required
              {...inputProps}
            />
          )}

          <div className="col-span-12 mt-2 flex justify-start">
            <ButtonWithBorderGradient
              isDisabled={isSubmitting}
              className="text-medium font-medium"
              type="submit"
            >
              <LazyMotion features={domAnimation}>
                <AnimatePresence mode="wait" initial={false}>
                  {submitState === "idle" && (
                    <m.span
                      key="label"
                      initial={{opacity: 0, y: 6}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -6}}
                      transition={{duration: 0.2}}
                    >
                      Get instant pricing
                    </m.span>
                  )}
                  {submitState === "loading" && (
                    <m.div
                      key="loading"
                      className="flex items-center gap-2"
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      transition={{duration: 0.15}}
                    >
                      <span className="loading-spinner" />
                      <span>Submitting</span>
                    </m.div>
                  )}
                  {submitState === "success" && (
                    <m.div
                      key="success"
                      className="flex items-center gap-2"
                      initial={{scale: 0.9, opacity: 0}}
                      animate={{scale: 1, opacity: 1}}
                      exit={{opacity: 0}}
                      transition={{type: "spring", stiffness: 400, damping: 20}}
                    >
                      <m.svg width="20" height="20" viewBox="0 0 24 24">
                        <m.path
                          d="M5 13l4 4L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{pathLength: 0}}
                          animate={{pathLength: 1}}
                          transition={{duration: 0.5}}
                        />
                      </m.svg>
                      <m.span initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.15}}>
                        Sent!
                      </m.span>
                    </m.div>
                  )}
                </AnimatePresence>
              </LazyMotion>
            </ButtonWithBorderGradient>
          </div>
        </form>
        {/* Terms / Results display */}
        {pricingResult && submittedLoanType && (
          <div className="mt-6 space-y-4 w-full">
            {pricingValidation ? (
              <div className="rounded-large border border-default-200 p-4 w-full max-w-full">
                {submittedLoanType === "DSCR" ? (
                  <>
                    <div className="text-default-foreground text-xl font-semibold mb-2">
                      Interest Rate{" "}
                      <span className="text-secondary font-bold">
                        {formatPercent(
                          getValueByAliases(pricingResult, [
                            "interest rate",
                            "Interest Rate",
                            "interestRate",
                            "InterestRate",
                            "rate",
                            "Rate",
                          ]),
                        )}
                      </span>
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-default-600 group-open:text-default-800">
                        View full terms
                      </summary>
                      <div className="mt-3 text-default-600 overflow-x-auto">
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 break-words min-w-0">
                          {Object.entries(pricingResult)
                            .filter(
                              ([k]) =>
                                ![
                                  "interestRate",
                                  "InterestRate",
                                  "rate",
                                  "Rate",
                                  "Validation",
                                  "validation",
                                  "Errors",
                                  "errors",
                                ].includes(k),
                            )
                            .map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between gap-3 min-w-0">
                                <dt className="text-sm text-default-500">{k}</dt>
                                <dd className="text-sm text-default-800 break-words text-right">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-full">
                      <div className="rounded-medium bg-content2 p-3">
                        <div className="text-default-500 text-sm">Initial Loan Amount</div>
                        <div className="text-default-foreground text-lg font-semibold">
                          {formatCurrency(
                            getValueByAliases(pricingResult, [
                              "initial loan amount",
                              "Initial Loan Amount",
                              "initialLoanAmount",
                              "InitialLoanAmount",
                              "loanAmount",
                              "LoanAmount",
                            ]),
                          )}
                        </div>
                      </div>
                      <div className="rounded-medium bg-content2 p-3">
                        <div className="text-default-500 text-sm">Rehab Holdback</div>
                        <div className="text-default-foreground text-lg font-semibold">
                          {formatCurrency(
                            getValueByAliases(pricingResult, [
                              "rehab holdback",
                              "Rehab Holdback",
                              "rehabHoldback",
                              "RehabHoldback",
                              "holdback",
                              "Holdback",
                            ]),
                          )}
                        </div>
                      </div>
                      <div className="rounded-medium bg-content2 p-3">
                        <div className="text-default-500 text-sm">Interest Rate</div>
                        <div className="text-default-foreground text-lg font-semibold">
                          {formatPercent(
                            getValueByAliases(pricingResult, [
                              "interest rate",
                              "Interest Rate",
                              "interestRate",
                              "InterestRate",
                              "rate",
                              "Rate",
                            ]),
                          )}
                        </div>
                      </div>
                    </div>
                    <details className="group mt-3">
                      <summary className="cursor-pointer text-default-600 group-open:text-default-800">
                        View full terms
                      </summary>
                      <div className="mt-3 text-default-600 overflow-x-auto">
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 break-words min-w-0">
                          {Object.entries(pricingResult)
                            .filter(([k]) => ![
                              "initialLoanAmount","InitialLoanAmount","loanAmount","LoanAmount",
                              "rehabHoldback","RehabHoldback","holdback","Holdback",
                              "interestRate","InterestRate","rate","Rate",
                              "Validation","validation","Errors","errors"
                            ].includes(k))
                            .map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between gap-3 min-w-0">
                                <dt className="text-sm text-default-500">{k}</dt>
                                <dd className="text-sm text-default-800 break-words text-right">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </div>
                    </details>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-large border border-danger-200 bg-danger-50/10 p-4">
                <div className="text-danger-400 font-semibold mb-2">We couldn't price this request</div>
                {pricingErrors.length > 0 ? (
                  <ul className="list-disc pl-5 text-default-600 break-words">
                    {pricingErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-default-500">Please review your inputs and try again.</div>
                )}
              </div>
            )}
          </div>
        )}
        {pricingResult && (
          <div className="mt-8 flex flex-col items-center text-center gap-2">
            <div className="text-default-foreground text-2xl font-bold">What's next?</div>
            <div className="text-default-500 text-lg max-w-xl">
              Check your email from <span className="text-default-foreground font-medium">leads@brrrr.com</span> for the next steps to get your deal funded!
            </div>
          </div>
        )}
      </>
    );
  },
);

SignUpForm.displayName = "SignUpForm";

export default SignUpForm;
