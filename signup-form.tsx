"use client";

import type {InputProps} from "@heroui/react";

import React from "react";
import {Input, Textarea} from "@heroui/react";
import {cn} from "@heroui/react";
import {ButtonWithBorderGradient} from "./button-with-border-gradient";
import {LazyMotion, domAnimation, m, AnimatePresence} from "framer-motion";

export type SignUpFormProps = React.HTMLAttributes<HTMLFormElement>;

const SignUpForm = React.forwardRef<HTMLFormElement, SignUpFormProps>(
  ({className, ...props}, ref) => {
    const [phone, setPhone] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submitState, setSubmitState] = React.useState<"idle" | "loading" | "success">("idle");

    const inputProps: Pick<InputProps, "labelPlacement" | "classNames"> = {
      labelPlacement: "outside",
      classNames: {
        label:
          "text-small font-medium text-default-700 group-data-[filled-within=true]:text-default-700",
      },
    };

    const formatPhone = React.useCallback((rawValue: string) => {
      const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 15); // 10 for phone + up to 5 for ext
      const area = digitsOnly.slice(0, 3);
      const prefix = digitsOnly.slice(3, 6);
      const line = digitsOnly.slice(6, 10);
      const ext = digitsOnly.slice(10, 15);

      if (digitsOnly.length === 0) return "";
      if (digitsOnly.length <= 3) {
        // Show parentheses as soon as typing starts; close at 3 digits
        const close = digitsOnly.length === 3 ? ") " : "";
        return `(${area}${close}`;
      }
      if (digitsOnly.length <= 6) return `(${area}) ${prefix}`;
      // Base phone
      let formatted = `(${area}) ${prefix}-${line}`;
      // Extension (show label once base phone is complete)
      if (digitsOnly.length >= 10) {
        formatted += ` Ext.${ext ? ` ${ext}` : ""}`;
      }
      return formatted;
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

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSubmitState("loading");
      try {
        const form = e.currentTarget;
        const data = new FormData(form);
        const payload = {
          firstName: String(data.get("first-name") || "").trim(),
          lastName: String(data.get("last-name") || "").trim(),
          email: String(data.get("email") || "").trim(),
          phoneNumber: String(data.get("phone-number") || "").trim(),
          companyName: String(data.get("company-name") || "").trim(),
          role: String(data.get("role") || "").trim(),
          employeeCount: Number(String(data.get("employee-count") || "0")),
          additionalNotes: String(data.get("additional-notes") || "").trim(),
        };

        await fetch("https://n8n.axora.info/webhook/de472dda-7707-4d02-a58b-85bca0cafaed", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload),
        });
        setSubmitState("success");
      } catch (_err) {
        // intentionally silent
        setSubmitState("idle");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <>
        <div className="text-default-foreground text-3xl leading-9 font-bold">
          Welcome to BRRRR Loans 👋
        </div>
        <div className="text-medium text-default-500 py-2">
          Share a few details so we can tailor BRRRR Loans services to your needs. After you submit,
          our AI agent will reach out to connect.
        </div>
        <form
          ref={ref}
          {...props}
          className={cn("flex grid grid-cols-12 flex-col gap-4 py-8", className)}
          onSubmit={onSubmit}
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
            placeholder="(555) 555-5555 Ext. 1234"
            type="tel"
            inputMode="numeric"
            maxLength={26}
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

          <div className="col-span-12 mt-2 flex justify-start">
            <ButtonWithBorderGradient
              isDisabled={isSubmitting || submitState === "success"}
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
                      Connect with us
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
      </>
    );
  },
);

SignUpForm.displayName = "SignUpForm";

export default SignUpForm;
