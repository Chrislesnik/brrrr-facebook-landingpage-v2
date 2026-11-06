import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { formatWithCommas, sanitizeNumericRaw } from "./numeric-mask"

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
	id?: string
	value: string
	onValueChange: (next: string) => void
	className?: string
	highlighted?: boolean
}

function isSafeExpression(expression: string): boolean {
	// Only allow digits, decimal points, operators, whitespace, and parentheses
	if (!/^[0-9+\-*/().\s]*$/.test(expression)) return false
	// Basic parentheses balance check
	let depth = 0
	for (const ch of expression) {
		if (ch === "(") depth++
		else if (ch === ")") {
			depth--
			if (depth < 0) return false
		}
	}
	return depth === 0 && expression.trim().length > 0
}

// Normalize a user-typed currency string to a raw numeric string without commas,
// with an optional single decimal point and at most two fractional digits.
const sanitizeCurrencyRaw = (input: string): string => sanitizeNumericRaw(input)

export function CalcInput({ id, value, onValueChange, className, highlighted, ...rest }: Props) {
	const [calcMode, setCalcMode] = React.useState<boolean>(false)
	const [expr, setExpr] = React.useState<string>("")

	// Sync exit of calc mode if external value changes while not in calc mode
	React.useEffect(() => {
		if (!calcMode) setExpr("")
	}, [value, calcMode])

	function resolveExpression() {
		const trimmed = expr.trim()
		if (!isSafeExpression(trimmed)) return
		try {
			const result = Function(`"use strict"; return (${trimmed});`)()
			if (typeof result === "number" && Number.isFinite(result)) {
				// Store as raw currency with max 2 decimals
				const normalized = sanitizeCurrencyRaw(String(result))
				onValueChange(normalized)
				setCalcMode(false)
				setExpr("")
			}
		} catch {
			// silently ignore invalid expressions
		}
	}

	return (
		<div
			data-calc-active={calcMode ? "true" : undefined}
			className={cn("calc-input-ring w-full", calcMode && "rounded-md")}
		>
			<Input
				id={id}
				value={calcMode ? `=${expr}` : formatWithCommas(value)}
				onChange={(e) => {
					if (!calcMode) {
						const raw = sanitizeCurrencyRaw(e.target.value)
						onValueChange(raw)
						return
					}
					const v = e.target.value
					if (!v.startsWith("=")) {
						setCalcMode(false)
						setExpr("")
						const raw = sanitizeCurrencyRaw(v)
						onValueChange(raw)
					} else {
						setExpr(v.slice(1))
					}
				}}
				onKeyDown={(e) => {
					if (!calcMode && e.key === "=") {
						e.preventDefault()
						setCalcMode(true)
						setExpr("")
						return
					}
					if (calcMode && (e.key === "Enter" || e.key === "Return")) {
						e.preventDefault()
						resolveExpression()
					}
					if (calcMode && e.key === "Escape") {
						e.preventDefault()
						setCalcMode(false)
						setExpr("")
					}
				}}
				onBlur={() => {
					if (calcMode) return
					if (!value) return
					const num = Number(value)
					if (!Number.isNaN(num) && Number.isFinite(num)) {
						const fixed = num.toFixed(2)
						onValueChange(sanitizeCurrencyRaw(fixed))
					}
				}}
				className={cn(
					calcMode ? "border-transparent focus-visible:ring-0 focus-visible:border-transparent" : "",
					!calcMode && !highlighted ? "focus-visible:ring-0 focus-visible:border-neutral-400" : "",
					!calcMode && highlighted ? "ring-1 ring-warning border-warning" : "",
					className,
				)}
				inputMode="decimal"
				pattern="^[0-9]*\\.?[0-9]{0,2}$"
				aria-label="Currency amount"
				{...rest}
			/>
		</div>
	)
}


