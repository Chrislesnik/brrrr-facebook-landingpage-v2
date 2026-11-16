/** Typed decisions from Jev (jev-latest) through the dev server. The key never reaches the browser. */

export type JevQuestion = {
  type: "choice" | "noul";
  instructions: string;
  criteria: Record<string, string>;
};

export type JevAnswer = {
  choice?: string;
  confidence?: number;
  noul?: number;
};

export async function askJev(state: string, questions: Record<string, JevQuestion>): Promise<Record<string, JevAnswer> | null> {
  try {
    const response = await fetch("/api/jev", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({state, questions}),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {answers?: Record<string, JevAnswer>};
    return json.answers ?? null;
  } catch {
    return null;
  }
}

/** Pick one of the field's options from a typed message. Null when Jev is unsure or unavailable. */
export async function assignOption(text: string, fieldLabel: string, options: {value: string; label: string}[]): Promise<string | null> {
  const criteria: Record<string, string> = {};
  for (const option of options) criteria[option.value] = option.label;
  const answers = await askJev(text, {
    assign: {
      type: "choice",
      instructions: `The borrower is answering "${fieldLabel}" by typing instead of tapping a choice. Pick the option their message means. Choose an option only when the message clearly refers to it.`,
      criteria,
    },
  });
  const choice = answers?.assign?.choice;
  if (!choice || !(choice in criteria)) return null;
  if ((answers?.assign?.confidence ?? 0) < 0.45) return null;
  return choice;
}

function firstNumber(text: string): number | null {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** A typed dollar amount, including "400k" or "1.2 million". Null when it is not an amount. */
export async function assignAmount(text: string, fieldLabel: string): Promise<string | null> {
  const answers = await askJev(text, {
    amount: {
      type: "noul",
      instructions: `Does this message state the ${fieldLabel} as a dollar amount?`,
      criteria: {
        true: "It states a dollar amount or a figure such as 400k, 400 thousand, or 1.2 million.",
        false: "It does not state a dollar amount.",
      },
    },
    scale: {
      type: "choice",
      instructions: "What scale is the number in the message?",
      criteria: {
        ones: "The digits are already the full dollar amount, such as 350000 or $350,000.",
        thousands: "The digits are thousands, such as 400k, 400 thousand, or 400 grand.",
        millions: "The digits are millions, such as 1.2 million or 1.2m.",
      },
    },
  });
  if ((answers?.amount?.noul ?? 0) < 0.6) return null;
  const base = firstNumber(text);
  if (base == null) return null;
  const scale = answers?.scale?.choice;
  const multiplier = scale === "millions" ? 1_000_000 : scale === "thousands" ? 1_000 : 1;
  return String(Math.round(base * multiplier * 100) / 100);
}

/** A typed whole number, such as a unit count or a FICO score. */
export async function assignCount(text: string, fieldLabel: string): Promise<string | null> {
  const answers = await askJev(text, {
    count: {
      type: "noul",
      instructions: `Does this message state the ${fieldLabel} as a whole number?`,
      criteria: {
        true: "It states a whole number for that question.",
        false: "It does not state a whole number.",
      },
    },
  });
  if ((answers?.count?.noul ?? 0) < 0.6) return null;
  const base = firstNumber(text);
  if (base == null) return null;
  return String(Math.trunc(base));
}
