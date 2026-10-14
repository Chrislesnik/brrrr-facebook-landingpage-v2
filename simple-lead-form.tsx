"use client";

import type {InputProps, SelectProps} from "@heroui/react";

import React from "react";
import {
  Input,
  Select,
  SelectItem,
  Radio,
  RadioGroup,
  Textarea,
  Button,
} from "@heroui/react";
import states from "./states";
import {ButtonWithBorderGradient} from "./button-with-border-gradient";
import type {SelectedAddress} from "./use-address-autocomplete";
import {useAddressAutocomplete} from "./use-address-autocomplete";
import {trackMetaEvent} from "./meta-pixel";

export type SimpleLeadFormProps = React.HTMLAttributes<HTMLFormElement>;

const SimpleLeadForm = React.forwardRef<HTMLFormElement, SimpleLeadFormProps>(
  ({className, ...props}, ref) => {
    const formRef = React.useRef<HTMLFormElement>(null);

    // Required fields
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [phone, setPhone] = React.useState("");

    // Optional address fields (with Places)
    const [streetValue, setStreetValue] = React.useState<string>("");
    const [cityValue, setCityValue] = React.useState<string>("");
    const [selectedStateKey, setSelectedStateKey] = React.useState<string>("");
    const [zip, setZip] = React.useState("");
    const [apt, setApt] = React.useState("");

    // Optional others
    const [transactionType, setTransactionType] = React.useState<string>("");
    const [bestFit, setBestFit] = React.useState<string>("");
    const [notes, setNotes] = React.useState<string>("");

    // UI / submit
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const leadTrackedRef = React.useRef(false);

    // Fire plain Lead only — financial-category "core setup" restrictions
    // block custom parameters and URL query data from being processed by Meta.
    React.useEffect(() => {
      if (!submitted || leadTrackedRef.current) return;
      leadTrackedRef.current = true;
      trackMetaEvent("Lead");
    }, [submitted]);

    // Bring the thank-you message into view — on mobile the visitor submits from the bottom
    // of a long form.
    React.useEffect(() => {
      if (!submitted) return;
      window.scrollTo({top: 0});
    }, [submitted]);

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

    // Required label helper
    const Required = ({text}: {text: string}) => (
      <span>
        {text} <span className="text-danger-500">*</span>
      </span>
    );
    const Optional = ({text}: {text: string}) => (
      <span>
        {text} <i className="text-default-500 font-normal italic">(optional)</i>
      </span>
    );
    const radioOrangeClassNames = {
      // ensure the selected radio control/dot uses the brand orange
      control:
        "data-[selected=true]:bg-[var(--color-primary)] data-[selected=true]:border-[var(--color-primary)] " +
        "group-data-[hover=true]:border-[var(--color-primary)]",
      base: "data-[selected=true]:border-[var(--color-primary)]",
    };

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
      const key = raw.toLowerCase();
      return STATE_ABBR[key] ?? raw;
    };
    const findStateValueByAbbreviation = (abbr: string): string | null => {
      const upper = (abbr || "").toUpperCase();
      for (const st of states) {
        if (abbreviateUsState(st.title).toUpperCase() === upper) return st.value;
      }
      return null;
    };

    // Phone formatting: (xxx) xxx-xxxx
    const formatUsPhone = (raw: string): string => {
      let digits = raw.replace(/\D/g, "");
      // Browser autofill and pastes can include the +1 country code
      if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
      digits = digits.slice(0, 10);
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 6);
      const c = digits.slice(6, 10);
      if (!digits) return "";
      if (digits.length <= 3) return `(${a}`;
      if (digits.length <= 6) return `(${a}) ${b}`;
      return `(${a}) ${b}-${c}`;
    };
    const handlePhoneChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      setPhone(formatUsPhone(e.target.value));
    };

    const handleZipChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
      setZip(digits);
    };

    // Google Places address suggestions — fill the fields from the picked address,
    // keeping what the visitor typed wherever Google has no value
    const handleAddressSelect = (address: SelectedAddress) => {
      setStreetValue(address.street);
      if (address.apt) setApt(address.apt);
      if (address.city) setCityValue(address.city);
      if (address.zip) setZip(address.zip);
      if (address.stateAbbr) {
        const stateVal = findStateValueByAbbreviation(address.stateAbbr);
        if (stateVal) setSelectedStateKey(stateVal);
      }
    };
    const addressAutocomplete = useAddressAutocomplete(handleAddressSelect);

    const onStreetInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      setStreetValue(e.target.value);
      addressAutocomplete.onInputChange(e.target.value);
    };

    // Deal details (all but Apt #) are required once the visitor says they have a deal
    const needsDealInfo = bestFit === "I have a deal";
    const dealInfoComplete =
      !needsDealInfo ||
      Boolean(
        streetValue.trim() &&
          cityValue.trim() &&
          selectedStateKey &&
          zip.length === 5 &&
          transactionType,
      );

    const canSubmit =
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      phone.replace(/\D/g, "").length === 10 &&
      bestFit.trim() &&
      dealInfoComplete;

    const submitLead = async () => {
      if (isSubmitting || !canSubmit) return;
      setIsSubmitting(true);
      try {
        const stateAbbrUpper =
          selectedStateKey
            ? (abbreviateUsState(
                (states.find((st) => st.value === selectedStateKey)?.title) || "",
              ) || "").toUpperCase()
            : "";
        const payload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: {
            street: streetValue.trim(),
            apt: apt.trim(),
            city: cityValue.trim(),
            state: stateAbbrUpper,
            zip,
          },
          transactionType: transactionType || "",
          bestFit: bestFit || "",
          notes: notes || "",
        };

        await fetch("https://n8n.axora.info/webhook/45693320-e8c0-46d4-af7c-8f64a73e46e1", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({variant: "simple", ...payload}),
        });
        setSubmitted(true);
      } catch {
        // Still show thanks + fire Lead if the network call fails —
        // the conversion happened from the user's perspective.
        setSubmitted(true);
      } finally {
        setIsSubmitting(false);
      }
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await submitLead();
    };

    if (submitted) {
      return (
        <div className="w-full pb-8">
          <div className="text-default-foreground text-3xl leading-9 font-bold">Thanks! 🎉</div>
          <div className="text-default-500 mt-1">
            We received your request. Our team will reach out shortly.
          </div>
        </div>
      );
    }

    return (
      <form
        ref={ref || formRef}
        {...props}
        className={"flex grid grid-cols-12 flex-col gap-x-4 gap-y-4 pt-2 pb-8 md:py-8 " + (className || "")}
        onSubmit={onSubmit}
      >
        <div className="text-default-foreground text-3xl leading-9 font-bold col-span-12">
          Quick Contact 👇
        </div>
        <div className="text-default-500 col-span-12 -mt-2">
          Tell us a little about your deal and our team will get back to you ASAP.
        </div>
        {/* Required */}
        <Input
          className="col-span-12 md:col-span-6"
          label={<Required text="First Name" />}
          placeholder="Jane"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          {...inputProps}
        />
        <Input
          className="col-span-12 md:col-span-6"
          label={<Required text="Last Name" />}
          placeholder="Doe"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          {...inputProps}
        />
        <Input
          className="col-span-12 md:col-span-6"
          label={<Required text="Email" />}
          type="email"
          placeholder="jane@domain.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...inputProps}
        />
        <Input
          className="col-span-12 md:col-span-6"
          label={<Required text="Phone" />}
          type="tel"
          placeholder="(xxx) xxx-xxxx"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          value={phone}
          onChange={handlePhoneChange}
          {...inputProps}
        />
        {/* Best fit radio moved directly under required contact info */}
        <div className="col-span-12">
          <div className="mb-2 text-small font-medium text-default-700">
            <Required text="Select the best fit option" />
          </div>
          <RadioGroup
            orientation="horizontal"
            value={bestFit}
            onValueChange={setBestFit}
            name="best-fit"
            aria-required="true"
          >
            <Radio classNames={radioOrangeClassNames} value="I have a deal">I have a deal</Radio>
            <Radio classNames={radioOrangeClassNames} value="Looking for general info">Looking for general info</Radio>
          </RadioGroup>
        </div>

        {/* Deal-specific fields: only show when bestFit is "I have a deal" */}
        {bestFit === "I have a deal" && (
          <>
            <div className="relative col-span-12 md:col-span-8" ref={addressAutocomplete.rootRef}>
              <Input
                className="w-full"
                label={<Required text="Street" />}
                name="street"
                placeholder="123 Main St"
                required
                // Chrome's saved-address popup would cover the Google suggestions
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={addressAutocomplete.open}
                aria-controls={addressAutocomplete.listboxId}
                aria-activedescendant={
                  addressAutocomplete.activeIndex >= 0
                    ? addressAutocomplete.optionId(addressAutocomplete.activeIndex)
                    : undefined
                }
                value={streetValue}
                onChange={onStreetInputChange}
                onKeyDown={addressAutocomplete.onKeyDown}
                onFocus={addressAutocomplete.onFocus}
                {...inputProps}
              />
              {addressAutocomplete.open && (
                <div className="suggestions-in absolute z-50 mt-1 w-full rounded-large bg-content1 shadow-medium p-1 max-h-72 overflow-auto left-0">
                  <div
                    id={addressAutocomplete.listboxId}
                    role="listbox"
                    aria-label="Address suggestions"
                    className="flex flex-col gap-0.5"
                  >
                    {addressAutocomplete.suggestions.map((s, i) => (
                      <button
                        key={s.placeId}
                        id={addressAutocomplete.optionId(i)}
                        type="button"
                        role="option"
                        aria-selected={i === addressAutocomplete.activeIndex}
                        tabIndex={-1}
                        onClick={() => void addressAutocomplete.select(s)}
                        className={
                          "w-full text-left rounded-small px-2 py-1.5 outline-none transition-colors hover:bg-default-100" +
                          (i === addressAutocomplete.activeIndex ? " bg-default-100" : "")
                        }
                      >
                        <div className="text-sm text-default-800">{s.mainText}</div>
                        <div className="text-xs text-default-500">{s.secondaryText}</div>
                      </button>
                    ))}
                  </div>
                  <div className="px-2 pt-1 pb-0.5 text-[10px] text-default-500">Powered by Google</div>
                </div>
              )}
            </div>
            <Input
              className="col-span-12 md:col-span-4"
              label={<Optional text="Apt #" />}
              name="apt"
              placeholder="Apt 4B"
              value={apt}
              onChange={(e) => setApt(e.target.value)}
              {...inputProps}
            />
            <Input
              className="col-span-12 md:col-span-4"
              label={<Required text="City" />}
              name="city"
              placeholder="San Francisco"
              required
              value={cityValue}
              onChange={(e) => setCityValue(e.target.value)}
              {...inputProps}
            />
            <Select
              className="col-span-12 md:col-span-4"
              label={<Required text="State" />}
              name="state"
              placeholder="Select state"
              selectedKeys={selectedStateKey ? [selectedStateKey] : []}
              onChange={(e) => setSelectedStateKey((e.target as HTMLSelectElement).value)}
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
              required
              type="text"
              inputMode="numeric"
              pattern="^[0-9]{5}$"
              maxLength={5}
              value={zip}
              onChange={handleZipChange}
              {...inputProps}
            />

            <Select
              className="col-span-12 md:col-span-6"
              label={<Required text="Transaction Type" />}
              name="transaction-type"
              placeholder="Select transaction type"
              selectedKeys={transactionType ? [transactionType] : []}
              onChange={(e) => setTransactionType((e.target as HTMLSelectElement).value)}
              {...selectProps}
            >
              <SelectItem key="Purchase">Purchase</SelectItem>
              <SelectItem key="Refinance Cash Out">Refinance Cash Out</SelectItem>
              <SelectItem key="Refinance Rate/Term">Refinance Rate/Term</SelectItem>
            </Select>
          </>
        )}

        

        <Textarea
          className="col-span-12"
          label={<Optional text="Additional notes" />}
          placeholder="Anything else you'd like to share..."
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          {...inputProps}
        />

        <div className="col-span-12 mt-2 flex justify-start">
          <ButtonWithBorderGradient
            isDisabled={isSubmitting || !canSubmit}
            className="text-medium font-medium"
            type="button"
            // HeroUI/React Aria can block native form submit — call handler directly
            onPress={() => {
              void submitLead();
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </ButtonWithBorderGradient>
        </div>
      </form>
    );
  },
);

SimpleLeadForm.displayName = "SimpleLeadForm";

export default SimpleLeadForm;


