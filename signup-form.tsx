"use client";

import type {InputProps} from "@heroui/react";

import React from "react";
import {Input, Textarea} from "@heroui/react";
import {cn} from "@heroui/react";

export type SignUpFormProps = React.HTMLAttributes<HTMLFormElement>;

const SignUpForm = React.forwardRef<HTMLFormElement, SignUpFormProps>(
  ({className, ...props}, ref) => {
    const [phone, setPhone] = React.useState("");

    const inputProps: Pick<InputProps, "labelPlacement" | "classNames"> = {
      labelPlacement: "outside",
      classNames: {
        label:
          "text-small font-medium text-default-700 group-data-[filled-within=true]:text-default-700",
      },
    };

    const formatPhone = React.useCallback((rawValue: string) => {
      const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 10);
      const area = digitsOnly.slice(0, 3);
      const prefix = digitsOnly.slice(3, 6);
      const line = digitsOnly.slice(6, 10);

      if (digitsOnly.length === 0) return "";
      if (digitsOnly.length <= 3) {
        // Show parentheses as soon as typing starts; close at 3 digits
        const close = digitsOnly.length === 3 ? ") " : "";
        return `(${area}${close}`;
      }
      if (digitsOnly.length <= 6) return `(${area}) ${prefix}`;
      return `(${area}) ${prefix}-${line}`;
    }, []);

    const handlePhoneChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value));
      },
      [formatPhone],
    );

    const handlePhoneKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const key = e.key;
        if (key !== "Backspace" && key !== "Delete") return;

        const input = e.currentTarget;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        const hasSelection = start !== end;

        if (hasSelection) return; // let default behavior when selecting

        const digits = phone.replace(/\D/g, "");

        // When cursor is at/near "(xxx) " boundary, deleting should remove area digits
        if (digits.length <= 3 && start <= 6 && phone.startsWith("(")) {
          e.preventDefault();
          const newDigits = digits.slice(0, -1);
          setPhone(formatPhone(newDigits));
        }
      },
      [phone, formatPhone],
    );

    const clampNonNegative: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const n = Number(e.target.value);
      if (Number.isNaN(n) || n < 0) {
        e.target.value = "0";
      }
    };

    return (
      <>
        <div className="text-default-foreground text-3xl leading-9 font-bold">
          Welcome to Vyral PEO 👋
        </div>
        <div className="text-medium text-default-500 py-2">
          Share a few details so we can tailor Vyral PEO services to your needs. After you submit,
          our AI agent will reach out to connect.
        </div>
        <form
          ref={ref}
          {...props}
          className={cn("flex grid grid-cols-12 flex-col gap-4 py-8", className)}
        >
          <Input
            className="col-span-12 md:col-span-6"
            label="First Name"
            name="first-name"
            placeholder="Type your first name here"
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-6"
            label="Last Name"
            name="last-name"
            placeholder="Type your last name here"
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-6"
            label="Email"
            name="email"
            placeholder="john.doe@gmail.com"
            type="email"
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-6"
            label="Phone Number"
            name="phone-number"
            placeholder="(555) 555-5555"
            type="tel"
            inputMode="numeric"
            maxLength={14}
            value={phone}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-6"
            label="Company Name"
            name="company-name"
            placeholder="Vyral LLC"
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-6"
            label="Role"
            name="role"
            placeholder="Founder, Operations, etc."
            {...inputProps}
          />

          <Input
            className="col-span-12 md:col-span-6"
            label="Employee Count"
            name="employee-count"
            placeholder="e.g., 10"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            onChange={clampNonNegative}
            {...inputProps}
          />

          <Textarea
            className="col-span-12"
            label="Additional Notes"
            name="additional-notes"
            placeholder="Anything else you'd like us to know?"
            labelPlacement="outside"
            classNames={{
              label:
                "text-small font-medium text-default-700 text-left group-data-[filled-within=true]:text-default-700",
            }}
          />

          
        </form>
      </>
    );
  },
);

SignUpForm.displayName = "SignUpForm";

export default SignUpForm;
