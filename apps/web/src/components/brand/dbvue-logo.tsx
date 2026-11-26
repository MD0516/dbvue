/* eslint-disable @typescript-eslint/no-unused-vars */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

const isA11y = (p: Record<string, unknown>) =>
  Object.keys(p).some((k) => (k.startsWith("aria-") || k === "role" || k === "title") && p[k] != null);

export type DbvueLogoProps = Omit<LucideProps, "absoluteStrokeWidth">;

/**
 * dbvue mark (the stacked discs), with the same props as a lucide-react icon.
 * - size: px, default 24
 * - color: omit for brand colours; pass a colour or "currentColor" for a single-colour mark
 * - className, ref and any SVG prop work as on a lucide icon
 * - strokeWidth / nonScalingStroke are accepted and ignored (filled artwork)
 * - decorative (aria-hidden) unless you pass aria-*, role, title or children
 */
export const DbvueLogo = forwardRef<SVGSVGElement, DbvueLogoProps>(function DbvueLogo(
  { color, size = 24, width, height, strokeWidth: _s, nonScalingStroke: _n, className, children, ...rest },
  ref,
) {
  // deprecated lucide prop: never forward it to the DOM if it arrives through a LucideProps spread
  delete (rest as Record<string, unknown>).absoluteStrokeWidth;
  const named = Boolean(children) || isA11y(rest);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      viewBox="3 3 58 58"
      className={cn("lucide lucide-dbvue-logo", className)}
      {...(!named && { "aria-hidden": "true" })}
      {...rest}
    >
      {color ? (
        <g fill={color}>
          <ellipse cx="32" cy="14" rx="22" ry="7" />
          <path d="M10 17A22 7 0 0 0 54 17V26A22 7 0 0 1 10 26Z" />
          <path d="M10 29A22 7 0 0 0 54 29V38A22 7 0 0 1 10 38Z" />
          <path d="M10 41A22 7 0 0 0 54 41V50A22 7 0 0 1 10 50Z" />
        </g>
      ) : (
        <>
          <g className="fill-engine-mongodb">
            <path d="M10 40v10a22 7 0 0 0 44 0V40z" />
            <ellipse cx="32" cy="40" rx="22" ry="7" />
          </g>
          <g className="fill-engine-mysql">
            <path d="M10 27v10a22 7 0 0 0 44 0V27z" />
            <ellipse cx="32" cy="27" rx="22" ry="7" />
          </g>
          <g className="fill-engine-postgres">
            <path d="M10 14v10a22 7 0 0 0 44 0V14z" />
          </g>
          <ellipse cx="32" cy="14" rx="22" ry="7" className="fill-primary" />
        </>
      )}
      {children}
    </svg>
  );
});

export interface DbvueLogoWithTextProps extends Omit<ComponentPropsWithoutRef<"span">, "color"> {
  /** Mark height in px; the text scales with it. Default 24. */
  size?: number;
  /** Omit for brand colours ("db" = text colour, "vue" = primary). Pass a colour for one-colour. */
  color?: string;
}

const base = "inline-flex items-center font-semibold leading-none tracking-[-0.03em]";

function Wordmark({ color }: { color?: string }) {
  return (
    <span>
      db<span className={color ? undefined : "text-primary"}>vue</span>
    </span>
  );
}

/**
 * dbvue mark + "dbvue" as real text, in your app's font (font-family is inherited).
 * Renders a <span>, so `ref` is an HTMLSpanElement and other props go to the span.
 */
export const DbvueLogoWithText = forwardRef<HTMLSpanElement, DbvueLogoWithTextProps>(function DbvueLogoWithText(
  { size = 24, color, className, style, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(base, "lucide-dbvue-logo-with-text", className)}
      style={{ gap: size * 0.3, fontSize: size * 0.82, color, ...style }}
      {...rest}
    >
      <DbvueLogo size={size} color={color} />
      <Wordmark color={color} />
    </span>
  );
});

/**
 * Text-only "dbvue" wordmark, in your app's font (font-family is inherited).
 * - size: px, default 24 (font-size is size * 0.82)
 * - color: pass a colour for a one-colour wordmark
 */
export const DbvueText = forwardRef<HTMLSpanElement, DbvueLogoWithTextProps>(function DbvueText(
  { size = 24, color, className, style, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(base, "lucide-dbvue-text", className)}
      style={{ fontSize: size * 0.82, color, ...style }}
      {...rest}
    >
      <Wordmark color={color} />
    </span>
  );
});