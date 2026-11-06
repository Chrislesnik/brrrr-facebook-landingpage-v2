"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: Date
  onChange: (date: Date) => void
  className?: string
  emptyOnMount?: boolean
}

interface DateParts {
  day: number
  month: number
  year: number
}

const DateInput = React.forwardRef<HTMLDivElement, Props>(function DateInput(
  { id, value, onChange, className, emptyOnMount, ...rest }: Props,
  ref
) {
  const [date, setDate] = React.useState<DateParts>(() => {
    const d = value
      ? new Date(value)
      : emptyOnMount
      ? new Date(NaN)
      : new Date()
    return {
      day: isNaN(d.getTime()) ? 0 : d.getDate(),
      month: isNaN(d.getTime()) ? 0 : d.getMonth() + 1, // JavaScript months are 0-indexed
      year: isNaN(d.getTime()) ? 0 : d.getFullYear(),
    }
  })

  const monthRef = useRef<HTMLInputElement | null>(null)
  const dayRef = useRef<HTMLInputElement | null>(null)
  const yearRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const d = value
      ? new Date(value)
      : emptyOnMount
      ? new Date(NaN)
      : new Date()
    setDate({
      day: isNaN(d.getTime()) ? 0 : d.getDate(),
      month: isNaN(d.getTime()) ? 0 : d.getMonth() + 1,
      year: isNaN(d.getTime()) ? 0 : d.getFullYear(),
    })
  }, [value, emptyOnMount])

  const validateDate = (
    field: keyof DateParts,
    value: number,
    strict: boolean = true
  ): boolean => {
    if (
      (field === "day" && (value < 1 || value > 31)) ||
      (field === "month" && (value < 1 || value > 12)) ||
      (field === "year" && (value < 1000 || value > 9999))
    ) {
      return false
    }

    // For non-strict validation (e.g., onBlur of a single field), do not
    // require other fields to be present/valid yet.
    if (!strict) {
      return true
    }

    // Validate the day of the month
    const newDate = { ...date, [field]: value }
    const d = new Date(newDate.year, newDate.month - 1, newDate.day)
    return (
      d.getFullYear() === newDate.year &&
      d.getMonth() + 1 === newDate.month &&
      d.getDate() === newDate.day
    )
  }

  const _handleInputChange =
    (field: keyof DateParts) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value ? Number(e.target.value) : ""
      const isValid =
        typeof newValue === "number" && validateDate(field, newValue)

      // If the new value is valid, update the date
      const newDate = { ...date, [field]: newValue }
      setDate(newDate)

      // only call onChange when the entry is valid
      if (isValid) {
        onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
      }
    }

  // Specialized month handler: enforce 1-12 and auto-advance when unambiguous
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = (e.target.value || "").replace(/[^0-9]/g, "").slice(0, 2)
    if (raw.length === 0) {
      setDate((prev) => ({ ...prev, month: 0 }))
      return
    }
    const first = Number(raw[0])
    if (raw.length === 1) {
      // If first digit is 2..9, treat as single-digit month and advance to day.
      // If 0 or 1, wait for second digit.
      setDate((prev) => ({ ...prev, month: first }))
      if (first >= 2) {
        commitIfComplete({ month: first })
        queueMicrotask(() => dayRef.current?.focus())
      }
      return
    }
    // Two digits entered → compute/clamp month and advance to day
    let mm = Number(raw)
    if (mm === 0) mm = 1
    if (mm > 12) mm = 12
    setDate((prev) => ({ ...prev, month: mm }))
    const newDate = { ...date, month: mm }
    if (validateDate("month", mm)) {
      onChange(
        new Date(
          newDate.year || new Date().getFullYear(),
          mm - 1,
          newDate.day || 1
        )
      )
    }
    queueMicrotask(() => dayRef.current?.focus())
  }

  const getMaxDayFor = (m: number, y: number) => {
    if (!m || m < 1 || m > 12) return 31
    const year = y || new Date().getFullYear()
    // new Date(year, m, 0) -> last day of month m
    return new Date(year, m, 0).getDate()
  }

  const commitIfComplete = (p: Partial<DateParts>) => {
    const mm = p.month ?? date.month
    const dd = p.day ?? date.day
    const yy = p.year ?? date.year
    if (!mm || !dd || !yy) return
    const d = new Date(yy, mm - 1, dd)
    if (isNaN(d.getTime())) return
    onChange(d)
  }

  // Day handler: simple numeric, clamp when 2 digits, move to year
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = (e.target.value || "").replace(/[^0-9]/g, "").slice(0, 2)
    const maxDay = getMaxDayFor(date.month, date.year)
    if (raw.length === 0) {
      setDate((prev) => ({ ...prev, day: 0 }))
      return
    }
    const first = Number(raw[0])
    if (raw.length === 1) {
      setDate((prev) => ({ ...prev, day: first }))
      return
    }
    // Two digits -> clamp and move to year
    let dd = Number(raw)
    if (dd < 1) dd = 1
    if (dd > maxDay) dd = maxDay
    setDate((prev) => ({ ...prev, day: dd }))
    commitIfComplete({ day: dd })
    queueMicrotask(() => yearRef.current?.focus())
  }

  // Year handler: numeric only, max 4; commit when 4 digits and valid
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = (e.target.value || "").replace(/[^0-9]/g, "").slice(0, 4)
    if (raw.length === 0) {
      setDate((prev) => ({ ...prev, year: 0 }))
      return
    }
    const yy = Number(raw)
    setDate((prev) => ({ ...prev, year: yy }))
    if (raw.length === 4) {
      commitIfComplete({ year: yy })
    }
  }

  const initialDate = useRef<DateParts>(date)

  const handleBlur =
    (field: keyof DateParts) =>
    (e: React.FocusEvent<HTMLInputElement>): void => {
      if (!e.target.value) {
        setDate(initialDate.current)
        return
      }

      const newValue = Number(e.target.value)
      // On blur, validate only the field's intrinsic range to avoid resetting
      // when other parts of the date are not filled in yet.
      const isValid = validateDate(field, newValue, false)

      if (!isValid) {
        setDate(initialDate.current)
      } else {
        // If the new value is valid, update the initial value
        initialDate.current = { ...date, [field]: newValue }
      }
    }

  const handleKeyDown =
    (field: keyof DateParts) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow command (or control) combinations
      if (e.metaKey || e.ctrlKey) {
        return
      }

      // Prevent non-numeric characters, excluding allowed keys
      if (
        !/^[0-9]$/.test(e.key) &&
        ![
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Delete",
          "Tab",
          "Backspace",
          "Enter",
        ].includes(e.key)
      ) {
        e.preventDefault()
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        let newDate = { ...date }

        if (field === "day") {
          if (date[field] === new Date(date.year, date.month, 0).getDate()) {
            newDate = { ...newDate, day: 1, month: (date.month % 12) + 1 }
            if (newDate.month === 1) newDate.year += 1
          } else {
            newDate.day += 1
          }
        }

        if (field === "month") {
          if (date[field] === 12) {
            newDate = { ...newDate, month: 1, year: date.year + 1 }
          } else {
            newDate.month += 1
          }
        }

        if (field === "year") {
          newDate.year += 1
        }

        setDate(newDate)
        onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        let newDate = { ...date }

        if (field === "day") {
          if (date[field] === 1) {
            newDate.month -= 1
            if (newDate.month === 0) {
              newDate.month = 12
              newDate.year -= 1
            }
            newDate.day = new Date(newDate.year, newDate.month, 0).getDate()
          } else {
            newDate.day -= 1
          }
        }

        if (field === "month") {
          if (date[field] === 1) {
            newDate = { ...newDate, month: 12, year: date.year - 1 }
          } else {
            newDate.month -= 1
          }
        }

        if (field === "year") {
          newDate.year -= 1
        }

        setDate(newDate)
        onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
      }

      if (e.key === "ArrowRight") {
        if (
          e.currentTarget.selectionStart === e.currentTarget.value.length ||
          (e.currentTarget.selectionStart === 0 &&
            e.currentTarget.selectionEnd === e.currentTarget.value.length)
        ) {
          e.preventDefault()
          if (field === "month") dayRef.current?.focus()
          if (field === "day") yearRef.current?.focus()
        }
      } else if (e.key === "ArrowLeft") {
        if (
          e.currentTarget.selectionStart === 0 ||
          (e.currentTarget.selectionStart === 0 &&
            e.currentTarget.selectionEnd === e.currentTarget.value.length)
        ) {
          e.preventDefault()
          if (field === "day") monthRef.current?.focus()
          if (field === "year") dayRef.current?.focus()
        }
      }
    }

  return (
    <div
      className={cn(
        "border-input flex h-9 w-full items-center rounded-md border bg-transparent px-3 text-base shadow-xs transition-colors md:text-sm",
        className
      )}
      {...rest}
      ref={ref}
    >
      <input
        type="text"
        id={id}
        name={id ? `${id}-month` : undefined}
        aria-label="Month"
        ref={monthRef}
        maxLength={2}
        inputMode="numeric"
        value={date.month ? date.month.toString() : ""}
        onChange={handleMonthChange}
        onKeyDown={handleKeyDown("month")}
        onFocus={(e) => {
          if (window.innerWidth > 1024) {
            e.target.select()
          }
        }}
        onBlur={handleBlur("month")}
        className="w-8 border-none bg-transparent p-0 text-center outline-hidden focus:ring-0"
        placeholder="mm"
      />
      <span className="-mx-px opacity-20">/</span>
      <input
        type="text"
        name={id ? `${id}-day` : undefined}
        aria-label="Day"
        ref={dayRef}
        max={31}
        maxLength={2}
        value={date.day ? date.day.toString() : ""}
        onChange={handleDayChange}
        onKeyDown={handleKeyDown("day")}
        onFocus={(e) => {
          if (window.innerWidth > 1024) {
            e.target.select()
          }
        }}
        onBlur={handleBlur("day")}
        className="w-7 border-none bg-transparent p-0 text-center outline-hidden focus:ring-0"
        placeholder="dd"
      />
      <span className="-mx-px opacity-20">/</span>
      <input
        type="text"
        name={id ? `${id}-year` : undefined}
        aria-label="Year"
        ref={yearRef}
        max={9999}
        maxLength={4}
        value={date.year ? date.year.toString() : ""}
        onChange={handleYearChange}
        onKeyDown={handleKeyDown("year")}
        onFocus={(e) => {
          if (window.innerWidth > 1024) {
            e.target.select()
          }
        }}
        onBlur={handleBlur("year")}
        className="w-12 border-none bg-transparent p-0 text-center outline-hidden focus:ring-0"
        placeholder="yyyy"
      />
    </div>
  )
})

DateInput.displayName = "DateInput"

export { DateInput }
