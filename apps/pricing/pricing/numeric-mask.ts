/**
 * The digit-level rules behind {@link ../calc-input.tsx CalcInput}, which is the
 * currency control the deal Details tab and the pricing engine inputs both
 * render.
 *
 * Extracted so a second surface can type the same way without a second mask.
 * The document preview edits merge tag values inside an iframe, where a React
 * input cannot be mounted at all — it drives a contenteditable span from DOM
 * events instead, and reusing these two functions is what keeps `1234567` in a
 * term sheet and `1234567` in a deal input group identically.
 *
 * Pure: no React, no DOM.
 */

export interface NumericRawOptions {
	/**
	 * Digits kept after the decimal point. Two is what currency has always
	 * allowed, and the merge tag surface raises it because a tag's format spec
	 * can ask for up to six.
	 */
	maxDecimals?: number
	/**
	 * Whether a leading `-` survives. Off by default: every input this was
	 * written for is a `min: 0` amount, so a stray minus there is a typo rather
	 * than a sign.
	 */
	allowNegative?: boolean
}

/**
 * A user-typed amount as a bare numeric string: no grouping, no symbol, one
 * optional decimal point.
 *
 * Tolerant of intermediate states on purpose, because it runs on every
 * keystroke: a trailing `.` survives so `123.` can become `123.4`, and a lone
 * `-` survives so a negative can be typed sign-first. Both parse to nothing,
 * which callers already handle — the alternative is a mask that deletes the
 * character the user just typed.
 */
export function sanitizeNumericRaw(
	input: string,
	{ maxDecimals = 2, allowNegative = false }: NumericRawOptions = {},
): string {
	// `(` as well as `-`: an accounting negative is what a pasted spreadsheet
	// cell looks like, and it arrives here before anything has parsed it.
	const negative = allowNegative && /^\s*[-(]/.test(input)
	const sign = negative ? "-" : ""

	// Strip everything except digits and dots
	const only = input.replace(/[^0-9.]/g, "")
	if (only === "") return sign
	// Keep first dot only
	const firstDot = only.indexOf(".")
	const trailingDot = firstDot !== -1 && only.endsWith(".")
	let intPart = ""
	let decPart = ""
	if (firstDot === -1) {
		intPart = only
	} else {
		intPart = only.slice(0, firstDot)
		decPart = only.slice(firstDot + 1).replace(/\./g, "")
	}
	// Remove leading zeros in integer part (but keep single zero if decimals exist or if all zeros)
	intPart = intPart.replace(/^0+(?=\d)/, "")
	// A spec of "0 decimals" leaves no fractional part to keep, and no dot to
	// hold one open either.
	if (maxDecimals <= 0) return `${sign}${intPart}`
	if (decPart.length > maxDecimals) decPart = decPart.slice(0, maxDecimals)
	// Recombine
	if (decPart.length > 0) return `${sign}${intPart || "0"}.${decPart}`
	// Preserve a trailing '.' while typing (e.g., "123."), allow starting with "."
	if (trailingDot) return `${sign}${intPart || "0"}.`
	return `${sign}${intPart}`
}

/** Thousands separators into the integer part of a bare numeric string. */
export function formatWithCommas(raw: string): string {
	if (!raw) return ""
	const negative = raw.startsWith("-")
	const body = negative ? raw.slice(1) : raw
	const [i, d] = body.split(".")
	// Insert commas in integer part
	const withCommas = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	const grouped = d !== undefined ? `${withCommas}.${d}` : withCommas
	return `${negative ? "-" : ""}${grouped}`
}
