import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface ShineButtonProps extends Omit<ButtonProps, "children"> {
  /** The label, above the light. */
  children?: ReactNode;
  /**
   * How long one sweep of light takes to cross the button, in milliseconds.
   *
   * @default 700
   */
  duration?: number;
  /**
   * The light's color, any CSS color. By default it's the label's color at
   * a little over a third of its strength, which reads on every variant.
   */
  shineColor?: string;
}

/**
 * The light: the button's own `::before`, a skewed gradient parked out of
 * sight. It sits under the label (the button is `isolate`, the band
 * `-z-10`) and the button clips it. Being CSS on the host, the button keeps
 * a single child, so `asChild` and `render` links work on every base.
 */
const BAND =
  "relative isolate overflow-hidden [--shine-button-color:color-mix(in_oklch,currentColor_40%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:-translate-x-full before:skew-x-[-20deg] before:bg-[linear-gradient(90deg,transparent_25%,var(--shine-button-color)_50%,transparent_75%)] before:opacity-0 before:content-[''] motion-safe:before:opacity-100 motion-reduce:before:translate-x-0 motion-reduce:before:transition-opacity motion-reduce:before:duration-300 rtl:before:translate-x-full rtl:before:skew-x-[20deg] rtl:before:[animation-direction:reverse] motion-reduce:rtl:before:translate-x-0";

/**
 * Hover, keyboard focus or a press sends the light across, once; with
 * reduced motion they fade it in where it stands.
 */
const SWEEPS =
  "hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100 data-pressed:before:opacity-100 motion-safe:hover:before:animate-shine-button motion-safe:focus-visible:before:animate-shine-button motion-safe:active:before:animate-shine-button motion-safe:data-pressed:before:animate-shine-button";

/**
 * A Button that a diagonal band of light sweeps across, once, when the
 * pointer arrives, it takes keyboard focus or it's pressed. The band is a
 * skewed gradient on the button's `::before`, moved by the `shine-button`
 * keyframes, which run while the hover lasts and end out of sight, so it
 * only ever sweeps one way; leave and come back and it sweeps again. With
 * reduced motion the band stands in the middle and fades in instead.
 *
 * @cssvar --shine-button-color The light's color.
 * @cssvar --shine-button-duration One sweep across the button (`700ms`).
 */
export const ShineButton = (props: ShineButtonProps) => {
  const { duration, shineColor, className, ...rest } = props;
  return (
    <Button
      className={cn(BAND, SWEEPS, className)}
      // CSS variables only, before the rest: a `style` of your own (a
      // function on React Aria) replaces them and the CSS defaults apply.
      style={
        {
          "--shine-button-color": shineColor,
          "--shine-button-duration":
            duration === undefined ? undefined : `${duration}ms`,
        } as CSSProperties
      }
      {...rest}
    />
  );
};
