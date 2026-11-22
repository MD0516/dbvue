import { forwardRef } from "react";
import { Mark, GapFrom, HasA11yProp, MergeClasses } from "./mark";
import type { DbvueIconProps } from "./types";

/**
 * dbvue logo mark only. Drop-in replacement for a lucide-react icon.
 *
 *   <DbvueIcon />                              brand colours, 24px
 *   <DbvueIcon size={32} />
 *   <DbvueIcon color="currentColor" />         single colour, follows text colour
 *   <DbvueIcon className="size-6 text-muted-foreground" color="currentColor" />
 */
const DbvueIcon = forwardRef<SVGSVGElement, DbvueIconProps>(
  (
    {
      color,
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth = false,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={MergeClasses("lucide", "lucide-dbvue", className)}
      {...(!children && !HasA11yProp(rest) && { "aria-hidden": "true" })}
      {...rest}
    >
      <Mark color={color} gap={GapFrom(size, strokeWidth, absoluteStrokeWidth)} />
      {children}
    </svg>
  ),
);

DbvueIcon.displayName = "DbvueIcon";

export { DbvueIcon };
export default DbvueIcon;
