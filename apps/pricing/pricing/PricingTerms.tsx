import {useState} from "react";

import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ShineButton} from "@/components/ui/shine-button";
import {
  readQuoteInputs,
  readQuoteSession,
  writePricingLead,
  type PricingLead,
} from "./quote-session";
import {authorizeApplicant} from "./scenario-save";

const LEAD_URL = "https://n8n.axora.info/webhook/brrrr-v2-lead-c13b477f-afea-4521-851a-37bdc22e2266";

type FieldName = "firstName" | "lastName" | "email" | "phone";

function formatUsPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${area}`;
  if (digits.length <= 6) return `(${area}) ${prefix}`;
  return `(${area}) ${prefix}-${line}`;
}

function problemsOf(lead: PricingLead): Partial<Record<FieldName, string>> {
  const problems: Partial<Record<FieldName, string>> = {};
  if (!lead.firstName.trim()) problems.firstName = "Enter your first name.";
  if (!lead.lastName.trim()) problems.lastName = "Enter your last name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) problems.email = "Enter a valid email.";
  if (lead.phone.replace(/\D/g, "").length !== 10) problems.phone = "Enter a 10-digit phone number.";
  return problems;
}

function trackLead() {
  if (import.meta.env.DEV) return;
  const fbq = (window as unknown as {fbq?: (action: string, event: string) => void}).fbq;
  try {
    fbq?.("track", "Lead");
  } catch {
    /* pixel blocked */
  }
}

function sendLead(lead: PricingLead) {
  if (import.meta.env.DEV) return;
  const session = readQuoteSession();
  const scenario = readQuoteInputs()?.values;
  const payload = {
    variant: "pricing",
    firstName: lead.firstName.trim(),
    lastName: lead.lastName.trim(),
    email: lead.email.trim(),
    phone: lead.phone.trim(),
    loanType: scenario?.loan_type ?? "",
    address: {
      street: scenario?.address_street ?? "",
      apt: scenario?.address_apt ?? "",
      city: scenario?.address_city ?? "",
      state: scenario?.address_state ?? "",
      zip: scenario?.address_zip ?? "",
    },
    quote: session.status === "ready" ? session.result : null,
  };
  void fetch(LEAD_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  }).catch(() => {
    /* the terms still open if the lead webhook is down */
  });
}

export default function PricingTerms(props: {onEdit: () => void; onSaved: (lead: PricingLead) => void; open: boolean}) {
  const [lead, setLead] = useState<PricingLead>({firstName: "", lastName: "", email: "", phone: ""});
  const [problems, setProblems] = useState<Partial<Record<FieldName, string>>>({});
  const [sending, setSending] = useState(false);

  const setField = (field: FieldName, value: string) => {
    setLead((current) => ({...current, [field]: value}));
  };

  if (!props.open) return null;

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        showCloseButton={false}
        size="md"
      >
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (sending) return;
            const next = problemsOf(lead);
            setProblems(next);
            const first = (Object.keys(next) as FieldName[])[0];
            if (first) {
              document.getElementById(`lead-${first}`)?.focus();
              return;
            }
            const saved = {
              firstName: lead.firstName.trim(),
              lastName: lead.lastName.trim(),
              email: lead.email.trim(),
              phone: lead.phone.trim(),
            };
            setSending(true);
            writePricingLead(saved);
            trackLead();
            sendLead(saved);
            authorizeApplicant(saved);
            props.onSaved(saved);
          }}
        >
          <DialogHeader>
            <DialogTitle>Your terms are ready 🎉</DialogTitle>
            <DialogDescription>Enter your details to view your rate and leverage 👇</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <LeadField
              autoComplete="given-name"
              error={problems.firstName}
              id="lead-firstName"
              label="First Name"
              onChange={(value) => setField("firstName", value)}
              placeholder="Jane"
              value={lead.firstName}
            />
            <LeadField
              autoComplete="family-name"
              error={problems.lastName}
              id="lead-lastName"
              label="Last Name"
              onChange={(value) => setField("lastName", value)}
              placeholder="Doe"
              value={lead.lastName}
            />
            <LeadField
              autoComplete="email"
              error={problems.email}
              id="lead-email"
              label="Email"
              onChange={(value) => setField("email", value)}
              placeholder="jane@domain.com"
              type="email"
              value={lead.email}
            />
            <LeadField
              autoComplete="tel"
              error={problems.phone}
              id="lead-phone"
              inputMode="tel"
              label="Phone Number"
              onChange={(value) => setField("phone", formatUsPhone(value))}
              placeholder="(xxx) xxx-xxxx"
              type="tel"
              value={lead.phone}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col">
            <Button className="w-full" onClick={props.onEdit} size="xl" type="button" variant="outline">
              Edit scenario ✏️
            </Button>
            <ShineButton className="w-full" isLoading={sending} size="xl" type="submit">
              See my terms ✨
            </ShineButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeadField(props: {
  autoComplete: string;
  error?: string;
  id: string;
  inputMode?: "tel";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={props.id}>
        {props.label}
        <span className="pricing-error"> *</span>
      </Label>
      <Input
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${props.id}-error` : undefined}
        autoComplete={props.autoComplete}
        className="h-10 px-3 py-0 text-left text-sm leading-[38px]"
        id={props.id}
        inputMode={props.inputMode}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        required
        type={props.type ?? "text"}
        value={props.value}
      />
      {props.error ? (
        <p className="pricing-error text-xs" id={`${props.id}-error`}>
          {props.error}
        </p>
      ) : null}
    </div>
  );
}
