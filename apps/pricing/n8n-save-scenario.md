# Save a priced scenario

The pricing page saves a passing quote as soon as pricing comes back, before the visitor enters a name. Submitting the contact form then edits that scenario with their name and authorizes their email on the application. It runs in local dev and in production. The lead webhook is a separate call and stays off in dev.

The pricing API key stays in n8n. The first save creates the loan. A later passing quote updates that same scenario. The quote workflow must not save the rate.

## Quote workflow change

`POST /webhook/pricing-quote` prices the scenario and returns one choice per prepay. Do not save the rate.

```json
{
  "requestId": "echo, unused by the page",
  "quote_id": "uuid from the price",
  "options": [
    {
      "option_id": "uuid",
      "label": "5-year prepay",
      "ppp_years": 5,
      "program": "Program B",
      "pass": true,
      "recommended": true,
      "rate": 6.875,
      "loan_amount": 495000,
      "monthly_payment": 3200,
      "ltv": 75,
      "dscr": 1.25,
      "origination_fee": "1.5%"
    }
  ]
}
```

Include every prepay the program priced, in the order they should appear: 5-year, 3-year, 1-year, then No prepay (`ppp_years` null). Mark the one to select first with `recommended`. Set `pass` to false when that prepay does not qualify. A quote lasts 15 minutes.

## Save webhook

Set `VITE_PRICING_SAVE_URL` to this webhook, then restart the dev server.

The page posts this as soon as a program passes, before the visitor enters a name. It posts again when they calculate a new passing quote. A quote that does not pass does not call this webhook. Changing the prepay toggle does not post this body again.

When the visitor submits the contact form, the page posts again with `action` set to `authorize`. That call does not price, does not create a loan, and does not generate a term sheet.

`POST` body for the first save. `options` is the option objects from the quote, including each option's own `quote_id` and `ppp_years`. `loanId` is added only when this browser already has a loan, so the workflow updates that loan instead of creating another one.

```json
{
  "requestId": "client idempotency key",
  "quote_id": "from the latest quote, or null",
  "selected_option_id": "the option on screen",
  "options": [
    {
      "option_id": "uuid",
      "quote_id": "this option's price id",
      "label": "5-year prepay",
      "ppp_years": 5,
      "rate": 6.875
    }
  ],
  "inputs": {},
  "loanId": "present only when this browser already has a loan"
}
```

`POST` body when the visitor switches prepay after that loan exists. Do not price again and do not create a scenario. Select the scenario that was already created for that option, and return the application link for it.

```json
{
  "requestId": "a new id for this switch",
  "loanId": "loan uuid",
  "selected_option_id": "the option now on screen"
}
```

`POST` body after the contact form:

```json
{
  "requestId": "a new id for this authorization",
  "action": "authorize",
  "loanId": "loan uuid",
  "scenarioId": "scenario uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@domain.com"
}
```

`inputs` is the same object the quote webhook receives. `quote_id` and `option_id` are null when the quote did not return them. `loanId` and `scenarioId` are omitted on the first save.

If this `requestId` was already saved, return that same response. Do not create a second loan and do not update again.

## Create

When `action` is absent and `loanId` is absent:

1. Create one scenario per object in `options`, with `inputs`, on a new loan. Use that object's `quote_id` and `ppp_years`. Do not set a guarantor tag yet. Do not create a borrower record. The scenario for `selected_option_id` is the primary one.
2. Save each option's rate from `quote_id`. When `quote_id` is null, or the quote is expired or already used, price each scenario and save its passing option.
3. Generate a term sheet for each scenario. Use the default template.

## Update

When `action` is absent and `loanId` is present, do not create a loan:

1. Update that loan's scenarios for `options`. Leave any guarantor tag as it is.
2. Save each option's rate from `quote_id`. When `quote_id` is null, or the quote is expired or already used, price the scenario and save its passing option.
3. Generate a term sheet for each scenario. Use the default template. `selected_option_id` stays the primary scenario.

## Switch

When the body is only `requestId`, `loanId`, and `selected_option_id`, select that existing scenario. Do not price and do not create a scenario. Respond with a fresh term sheet link. Signed links expire, so the page requests one when Download term sheet is clicked and does not keep it.

## Authorize

When `action` is `authorize`, do not price, do not create a loan, and do not generate a term sheet.

1. Set that scenario's guarantor tag to one value, the full name: `["Jane Doe"]`.
2. Set the application's guarantors to one person, guarantor 1: that same name and `email`. Do not create a borrower record. A name that matches no borrower is added unlinked, with this email. That email is what the application portal accepts.

Respond `200`. The page does not need new links from this call.

Respond `200` with JSON for create and update:

```json
{
  "loanId": "loan uuid",
  "applicationUrl": "https://apply.pricingengine.pro/{loanId}",
  "selected_option_id": "the option on screen",
  "selected_scenario_id": "scenario uuid for the selected option",
  "scenarioId": "same scenario uuid",
  "termSheetUrl": "https://download-link",
  "scenarios": [
    {"option_id": "uuid", "scenarioId": "scenario uuid", "label": "5-year prepay", "ppp_years": 5, "termSheetUrl": "https://download-link"}
  ],
  "unsaved_option_ids": ["option ids that have no term sheet"]
}
```

`unsaved_option_ids` hides the term sheet button for those options. Omit it when every option was saved.

A switch responds `200` with:

```json
{
  "loanId": "loan uuid",
  "selected_scenario_id": "scenario uuid",
  "selected_option_id": "the option now on screen",
  "scenarioId": "scenario uuid",
  "applicationUrl": "https://apply.pricingengine.pro/{loanId}",
  "termSheetUrl": "https://download-link"
}
```

The application link opens in a new tab. The page opens `termSheetUrl` from the click that requested it and does not store that link.
