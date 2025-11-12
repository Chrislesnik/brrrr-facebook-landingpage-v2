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
import {loadGoogleMaps} from "./google-maps-loader";

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

    // Google Places state
    const [placePredictions, setPlacePredictions] = React.useState<any[]>([]);
    const [showPredictions, setShowPredictions] = React.useState<boolean>(false);
    const placesServiceRef = React.useRef<any | null>(null);
    const autocompleteServiceRef = React.useRef<any | null>(null);
    const sessionTokenRef = React.useRef<any | null>(null);
    const debounceTimerRef = React.useRef<number | null>(null);

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
      const digits = raw.replace(/\D/g, "").slice(0, 10);
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

    // Load Google Maps Places
    React.useEffect(() => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
      if (!apiKey) return;
      let isMounted = true;
      loadGoogleMaps(apiKey)
        .then((google) => {
          if (!isMounted) return;
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          placesServiceRef.current = new google.maps.places.PlacesService(document.createElement("div"));
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }, []);

    // Debounced fetch predictions
    const fetchPredictions = React.useCallback((value: string) => {
      if (!autocompleteServiceRef.current || !value.trim()) {
        setPlacePredictions([]);
        setShowPredictions(false);
        return;
      }
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          types: ["address"],
          sessionToken: sessionTokenRef.current || undefined,
        },
        (preds: any) => {
          setPlacePredictions(preds || []);
          setShowPredictions(Boolean(preds && preds.length));
        },
      );
    }, []);

    const onStreetInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const val = e.target.value;
      setStreetValue(val);
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => fetchPredictions(val), 180);
    };

    const selectPrediction = (prediction: any) => {
      const placesService = placesServiceRef.current;
      if (!placesService) return;
      placesService.getDetails(
        {
          placeId: prediction.place_id,
          sessionToken: sessionTokenRef.current || undefined,
          fields: ["address_components"],
        },
        (place: any) => {
          if (!place || !(place as any).address_components) {
            setStreetValue(prediction.description);
            setShowPredictions(false);
            return;
          }
          const components: any[] = (place as any).address_components || [];
          const getComponent = (type: string, short = true) => {
            const comp = components.find((c) => c.types.includes(type));
            return comp ? (short ? comp.short_name : comp.long_name) : "";
          };
          const streetNumber = getComponent("street_number");
          const route = getComponent("route", false);
          const city =
            getComponent("locality", false) ||
            getComponent("sublocality", false) ||
            getComponent("administrative_area_level_2", false);
          const stateAbbr = getComponent("administrative_area_level_1");
          const postal = getComponent("postal_code");

          const streetCombined = `${streetNumber} ${route}`.trim();
          setStreetValue(streetCombined || prediction.description);
          setCityValue(city);
          setZip(postal);
          if (stateAbbr) {
            const stateVal = findStateValueByAbbreviation(stateAbbr);
            if (stateVal) setSelectedStateKey(stateVal);
          }
          setShowPredictions(false);
          setPlacePredictions([]);
          if (sessionTokenRef.current) {
            sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
          }
        },
      );
    };

    // Close suggestions on outside click
    React.useEffect(() => {
      const onDocClick = (e: MouseEvent) => {
        const root = document.getElementById("simple-street-autocomplete-root");
        if (!root) return;
        if (!root.contains(e.target as Node)) {
          setShowPredictions(false);
        }
      };
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const canSubmit =
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      phone.replace(/\D/g, "").length === 10 &&
      bestFit.trim();

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting || !canSubmit) return;
      setIsSubmitting(true);
      try {
        const payload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: {
            street: streetValue.trim(),
            apt: apt.trim(),
            city: cityValue.trim(),
            state: selectedStateKey,
            zip,
          },
          transactionType: transactionType || "",
          bestFit: bestFit || "",
          notes: notes || "",
        };

        await fetch("https://n8n.axora.info/webhook-test/45693320-e8c0-46d4-af7c-8f64a73e46e1", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({variant: "simple", ...payload}),
        });
        setSubmitted(true);
      } catch {
        // ignore errors for now; could surface UI later
      } finally {
        setIsSubmitting(false);
      }
    };

    if (submitted) {
      return (
        <div className="w-full">
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
        className={"flex grid grid-cols-12 flex-col gap-x-4 gap-y-4 py-8 " + (className || "")}
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
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          {...inputProps}
        />
        <Input
          className="col-span-12 md:col-span-6"
          label={<Required text="Last Name" />}
          placeholder="Doe"
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
          maxLength={14}
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
            <div className="relative col-span-12 md:col-span-8" id="simple-street-autocomplete-root">
              <Input
                className="w-full"
                label={<Optional text="Street" />}
                name="street"
                placeholder="123 Main St"
                value={streetValue}
                onChange={onStreetInputChange}
                onFocus={() => setShowPredictions(placePredictions.length > 0)}
                {...inputProps}
              />
              {showPredictions && placePredictions.length > 0 && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-large border border-default-200 bg-background shadow-large max-h-72 overflow-auto left-0"
                  role="listbox"
                  aria-label="Address suggestions"
                >
                  {placePredictions.map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      onClick={() => selectPrediction(p)}
                      className="w-full text-left px-3 py-2 hover:bg-content3 focus:bg-content3 outline-none"
                    >
                      <div className="text-sm text-default-800">{p.structured_formatting.main_text}</div>
                      <div className="text-xs text-default-500">{p.structured_formatting.secondary_text}</div>
                    </button>
                  ))}
                  <div className="px-3 py-1 text-[10px] text-default-500">Powered by Google</div>
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
              label={<Optional text="City" />}
              name="city"
              placeholder="San Francisco"
              value={cityValue}
              onChange={(e) => setCityValue(e.target.value)}
              {...inputProps}
            />
            <Select
              className="col-span-12 md:col-span-4"
              label={<Optional text="State" />}
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
              label={<Optional text="Zip Code" />}
              name="zip"
              placeholder="94105"
              type="text"
              inputMode="numeric"
              pattern="^[0-9]{5}$"
              maxLength={5}
              value={zip}
              onChange={handleZipChange}
              {...inputProps}
            />

            {/* Optional Other Fields */}
            <Select
              className="col-span-12 md:col-span-6"
              label={<Optional text="Transaction Type" />}
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
            type="submit"
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


