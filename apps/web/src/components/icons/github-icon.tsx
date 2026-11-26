import { createLucideIcon } from "lucide-react";

/**
 * GitHub (octocat) icon, built with lucide-react's own `createLucideIcon`, so it takes exactly the same props
 * as any lucide icon: size, color, strokeWidth, absoluteStrokeWidth / nonScalingStroke, className, ref, aria-*.
 * It is also assignable to the `LucideIcon` type.
 *
 *   <Github />
 *   <Github size={20} className="text-muted-foreground" strokeWidth={1.5} />
 */
export const Github = createLucideIcon("github", [
    [
        "path",
        {
            d: "M9 22v-3q0-2 1-3A7 6.5 0 0 1 5 5Q4 3 5 1q3 0 4 2q3.5-1 7 0q1-2 4-2q1 2 0 4a7 6.5 0 0 1-5 11q1 1 1 3v3m-7-3c-4 1-4-2-7-3",
            key: "dbvue-github-1",
        },
    ],
]);

export { Github as GithubIcon };