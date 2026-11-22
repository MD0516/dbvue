import { useId } from "react";

/**
 * Internal: the three-disc mark on a 64 x 64 grid.
 *
 * Brand mode reads the dbvue design tokens from globals.css
 * (--primary, --engine-postgres, --engine-mysql, --engine-mongodb), so it
 * follows the `.dark` class automatically. The fallbacks are the light values.
 *
 * Single-colour mode paints every disc in `color` and cuts a thin gap between
 * discs with fill-only masks (no strokes, so it renders the same everywhere).
 */

const BODY = {
  l1: "M10 14v10a22 7 0 0 0 44 0V14z",
  l2: "M10 27v10a22 7 0 0 0 44 0V27z",
  l3: "M10 40v10a22 7 0 0 0 44 0V40z",
} as const;

const brand = {
  top: "var(--primary, #cf4318)",
  l1: "var(--engine-postgres, #4f5fd6)",
  l2: "var(--engine-mysql, #0e8a9a)",
  l3: "var(--engine-mongodb, #a23fa0)",
} as const;

function grown(cy: number, g: number) {
  const rx = 22 + g;
  const ry = 7 + g;
  return `M${10 - g} ${cy}a${rx} ${ry} 0 0 1 ${2 * rx} 0v10a${rx} ${ry} 0 0 1-${2 * rx} 0z`;
}

export function Mark({ color, gap }: { color?: string; gap: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  if (!color) {
    return (
      <>
        <path d={BODY.l3} style={{ fill: brand.l3 }} />
        <ellipse cx="32" cy="40" rx="22" ry="7" style={{ fill: brand.l3 }} />
        <path d={BODY.l2} style={{ fill: brand.l2 }} />
        <ellipse cx="32" cy="27" rx="22" ry="7" style={{ fill: brand.l2 }} />
        <path d={BODY.l1} style={{ fill: brand.l1 }} />
        <ellipse cx="32" cy="14" rx="22" ry="7" style={{ fill: brand.top }} />
      </>
    );
  }

  return (
    <>
      <defs>
        <mask id={`${uid}-b`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={grown(14, gap)} fill="#000" />
        </mask>
        <mask id={`${uid}-c`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={grown(27, gap)} fill="#000" />
        </mask>
      </defs>
      <g fill={color} mask={`url(#${uid}-c)`}>
        <path d={BODY.l3} />
        <ellipse cx="32" cy="40" rx="22" ry="7" />
      </g>
      <g fill={color} mask={`url(#${uid}-b)`}>
        <path d={BODY.l2} />
        <ellipse cx="32" cy="27" rx="22" ry="7" />
      </g>
      <g fill={color}>
        <path d={BODY.l1} />
        <ellipse cx="32" cy="14" rx="22" ry="7" />
      </g>
    </>
  );
}

/** lucide-style strokeWidth -> gap (in 64-grid units) between discs. */
export function GapFrom(
  size: string | number,
  strokeWidth: string | number,
  absoluteStrokeWidth: boolean,
) {
  const sw = Number(strokeWidth);
  const px = Number(size);
  const units24 =
    absoluteStrokeWidth && Number.isFinite(px) && px > 0 ? (sw * 24) / px : sw;
  return Math.max(0, units24 * 0.75);
}

export const MergeClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter((c, i, a) => Boolean(c) && a.indexOf(c) === i).join(" ").trim();

export const HasA11yProp = (props: Record<string, unknown>) => {
  for (const key in props) {
    if (key.startsWith("aria-") || key === "role" || key === "title") return true;
  }
  return false;
};
