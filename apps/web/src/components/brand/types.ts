import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

/**
 * Same prop surface as lucide-react's `LucideProps`.
 *
 * - size: number or CSS length, sets width and height (default 24).
 * - color: when set, the logo renders as a single-colour mark in that colour.
 *   When omitted it uses the dbvue brand colours.
 * - strokeWidth: lucide's 24-grid stroke width. Here it sets the gap between
 *   the stacked discs in single-colour mode (default 2).
 * - absoluteStrokeWidth: keep that gap the same pixel width at every size.
 */
export interface DbvueIconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  size?: string | number;
  color?: string;
  strokeWidth?: string | number;
  absoluteStrokeWidth?: boolean;
}

/** Structurally identical to lucide-react's `LucideIcon`. */
export type DbvueIconComponent = ForwardRefExoticComponent<
  Omit<DbvueIconProps, "ref"> & RefAttributes<SVGSVGElement>
>;
