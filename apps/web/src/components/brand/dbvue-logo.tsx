import { forwardRef } from "react";
import { Mark, GapFrom, MergeClasses } from "./mark";
import type { DbvueIconProps } from "./types";

const WORDMARK =
  "M65.45 42.19C69.41 42.19 71.18 39.81 72.02 38.15H72.34V41.78H77.57V11.22H72.24V22.64H72.02C71.2 21.02 69.51 18.56 65.43 18.56C60.14 18.56 56 22.73 56 30.36C56 37.88 60.02 42.19 65.45 42.19ZM66.91 37.8C63.34 37.8 61.46 34.64 61.46 30.33C61.46 26.07 63.3 22.95 66.91 22.95C70.42 22.95 72.34 25.86 72.34 30.33C72.34 34.81 70.38 37.8 66.91 37.8ZM94.47 42.19C99.91 42.19 103.95 37.88 103.95 30.36C103.95 22.73 99.78 18.56 94.49 18.56C90.41 18.56 88.73 21.02 87.93 22.64H87.71V11.22H82.37V41.78H87.58V38.15H87.93C88.75 39.81 90.54 42.19 94.47 42.19ZM93.04 37.8C89.55 37.8 87.6 34.81 87.6 30.33C87.6 25.86 89.51 22.95 93.04 22.95C96.65 22.95 98.47 26.07 98.47 30.33C98.47 34.64 96.61 37.8 93.04 37.8ZM114.24 41.78H120.21L128.78 18.85H123.12L118.96 31.32C118.28 33.35 117.79 35.4 117.3 37.47C116.79 35.38 116.27 33.35 115.6 31.32L111.41 18.85H105.71ZM139.41 42.07C142.73 42.07 145.13 40.47 146.5 37.18L146.54 41.78H151.61V18.85H146.26V32.28C146.26 35.61 144.21 37.53 141.38 37.53C138.59 37.53 136.89 35.69 136.89 32.61V18.85H131.55V33.43C131.55 38.95 134.69 42.07 139.41 42.07ZM166.56 42.25C171.67 42.25 175.24 39.81 176.34 36.1L171.44 35.09C170.72 37.04 168.96 38.07 166.62 38.07C163.2 38.07 160.88 35.89 160.74 31.81H176.69V30.13C176.69 22.09 171.81 18.56 166.21 18.56C159.65 18.56 155.43 23.4 155.43 30.46C155.43 37.64 159.65 42.25 166.56 42.25ZM160.76 28.18C161 25.13 162.97 22.75 166.23 22.75C169.41 22.75 171.2 24.9 171.5 28.18Z";

/** Width / height of the lockup. */
const ASPECT = 176.69 / 50;

/**
 * dbvue logo with wordmark. Same props as lucide-react icons, except `size`
 * sets the HEIGHT and the width follows the lockup's aspect ratio.
 * The wordmark is outlined (Inter SemiBold), so no font has to load.
 *
 *   <DbvueLogo />                              brand mark, text follows currentColor
 *   <DbvueLogo size=32 className="text-foreground" />
 *   <DbvueLogo color="#fff" />                 everything in one colour
 *
 * Pass `width` and/or `height` directly to override the computed size.
 */
const DbvueLogo = forwardRef<SVGSVGElement, DbvueIconProps>(
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
  ) => {
    const numeric = Number(size);
    const width = Number.isFinite(numeric)
      ? Math.round(numeric * ASPECT * 100) / 100
      : "auto";

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={size}
        viewBox="0 0 176.69 50"
        fill="none"
        role="img"
        aria-label="dbvue"
        className={MergeClasses("lucide", "lucide-dbvue-logo", className)}
        {...rest}
      >
        <g transform="translate(-10 -7)">
          <Mark color={color} gap={GapFrom(size, strokeWidth, absoluteStrokeWidth)} />
        </g>
        <path d={WORDMARK} fill={color ?? "currentColor"} />
        {children}
      </svg>
    );
  },
);

DbvueLogo.displayName = "DbvueLogo";

export { DbvueLogo };
export default DbvueLogo;
