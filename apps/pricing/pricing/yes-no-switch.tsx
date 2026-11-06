"use client"

import { Switch } from "@/components/ui/switch"

/**
 * Segmented Yes / No control from the pricing engine. The selected word is the
 * only one shown, and the knob sits on the right when the value is Yes.
 */
export function YesNoSwitch({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="relative inline-grid h-8 grid-cols-2 items-center text-sm font-medium">
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(!!next)}
        className="peer absolute inset-0 h-[inherit] w-auto rounded-md data-[state=unchecked]:bg-input/50 [&_span]:z-10 [&_span]:h-full [&_span]:w-1/2 [&_span]:rounded-sm [&_span]:shadow-none [&_span]:transition-transform [&_span]:duration-300 [&_span]:data-[state=checked]:translate-x-full [&_span]:data-[state=unchecked]:translate-x-0"
      />
      <span className="pointer-events-none relative ml-0.5 flex items-center justify-center px-2 text-center transition-transform duration-300 peer-data-[state=checked]:invisible peer-data-[state=unchecked]:translate-x-full">
        <span className="text-[10px] font-medium uppercase">No</span>
      </span>
      <span className="pointer-events-none relative mr-0.5 flex items-center justify-center px-2 text-center text-background transition-transform duration-300 peer-data-[state=checked]:-translate-x-full peer-data-[state=unchecked]:invisible">
        <span className="text-[10px] font-medium uppercase">Yes</span>
      </span>
    </div>
  )
}
