import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button cursor-pointer inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-white border border-destructive/30 hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",

        // --- Solid status variants (using your --success / --warning / --info) ---
        success:
          "bg-success text-white hover:bg-success/85 focus-visible:border-success/40 focus-visible:ring-success/20 dark:text-background dark:hover:bg-success/80",
        warning:
          "bg-warning text-white hover:bg-warning/85 focus-visible:border-warning/40 focus-visible:ring-warning/20 dark:text-background dark:hover:bg-warning/80",
        info:
          "bg-info text-white hover:bg-info/85 focus-visible:border-info/40 focus-visible:ring-info/20 dark:text-background dark:hover:bg-info/80",

        // --- Soft status variants (tinted background, matching shadcn's destructive style) ---
        "success-soft":
          "bg-success/10 text-success hover:bg-success/20 focus-visible:border-success/40 focus-visible:ring-success/20 dark:bg-success/20 dark:hover:bg-success/30 dark:focus-visible:ring-success/40",
        "warning-soft":
          "bg-warning/10 text-warning hover:bg-warning/20 focus-visible:border-warning/40 focus-visible:ring-warning/20 dark:bg-warning/20 dark:hover:bg-warning/30 dark:focus-visible:ring-warning/40",
        "info-soft":
          "bg-info/10 text-info hover:bg-info/20 focus-visible:border-info/40 focus-visible:ring-info/20 dark:bg-info/20 dark:hover:bg-info/30 dark:focus-visible:ring-info/40",

        // --- Engine badge-style variants (for DB engine chips) ---
        postgres:
          "bg-engine-postgres/10 text-engine-postgres hover:bg-engine-postgres/20 dark:bg-engine-postgres/20 dark:hover:bg-engine-postgres/30",
        mysql:
          "bg-engine-mysql/10 text-engine-mysql hover:bg-engine-mysql/20 dark:bg-engine-mysql/20 dark:hover:bg-engine-mysql/30",
        mongodb:
          "bg-engine-mongodb/10 text-engine-mongodb hover:bg-engine-mongodb/20 dark:bg-engine-mongodb/20 dark:hover:bg-engine-mongodb/30",
        sqlite:
          "bg-engine-sqlite/10 text-engine-sqlite hover:bg-engine-sqlite/20 dark:bg-engine-sqlite/20 dark:hover:bg-engine-sqlite/30",
        redis:
          "bg-engine-redis/10 text-engine-redis hover:bg-engine-redis/20 dark:bg-engine-redis/20 dark:hover:bg-engine-redis/30",

        // --- Utility variants ---
        unstyled: "",
        "ghost-destructive":
          "text-destructive hover:bg-destructive/10 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/40",
      },
      size: {
        // Base (matches shadcn default) — 32px
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",

        // Extra small — 24px, tight padding, 12px text
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",

        // Small — 28px
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",

        // Large — 36px, more horizontal padding
        lg: "h-9 gap-1.5 px-3 text-[0.925rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",

        // Extra large — 40px, for hero / primary CTAs
        xl: "h-10 gap-2 px-4 text-[0.95rem] has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-5",

        // Icon-only (square) — mirrors the text sizes above
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-xl": "size-10 [&_svg:not([class*='size-'])]:size-5",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Neutral icon button (your original)
        default:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",

        // Toolbar / nav — subtle, no color shift
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",

        // Primary accent — for the "active" item in a rail/toolbar
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90",

        // Status tints — use these to color-code actions (success = run, warning = caution, info = info)
        success:
          "text-success hover:bg-success/10 hover:text-success dark:hover:bg-success/20",
        warning:
          "text-warning hover:bg-warning/10 hover:text-warning dark:hover:bg-warning/20",
        info:
          "text-info hover:bg-info/10 hover:text-info dark:hover:bg-info/20",
        destructive:
          "text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20",

        // Engine tints — for DB-engine action buttons (refresh, query, etc.)
        postgres:
          "text-engine-postgres hover:bg-engine-postgres/10 dark:hover:bg-engine-postgres/20",
        mysql:
          "text-engine-mysql hover:bg-engine-mysql/10 dark:hover:bg-engine-mysql/20",
        mongodb:
          "text-engine-mongodb hover:bg-engine-mongodb/10 dark:hover:bg-engine-mongodb/20",
        sqlite:
          "text-engine-sqlite hover:bg-engine-sqlite/10 dark:hover:bg-engine-sqlite/20",
        redis:
          "text-engine-redis hover:bg-engine-redis/10 dark:hover:bg-engine-redis/20",

        // Grid/toolbar specific — uses your grid tokens so it matches the data grid chrome
        grid:
          "text-grid-header-foreground hover:bg-grid-row-hover hover:text-foreground",

        // Outline — bordered icon button (sits next to inputs/selects)
        outline:
          "border border-border bg-background text-foreground hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50",

        // Danger outline — for disconnect / drop
        "outline-destructive":
          "border border-destructive/30 text-destructive hover:bg-destructive/10 dark:border-destructive/40 dark:hover:bg-destructive/20",
      },
      size: {
        xs: "size-6 [&_svg:not([class*='size-'])]:size-3",
        sm: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        default: "size-9 [&_svg:not([class*='size-'])]:size-4",
        lg: "size-10 [&_svg:not([class*='size-'])]:size-5",
        // "square" variant that inherits rounded from base
      },
      shape: {
        default: "rounded-md",
        square: "rounded-none",
        pill: "rounded-full",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
);

function IconButton({
  className,
  variant = "default",
  size = "default",
  shape = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof iconButtonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="icon-button"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={cn(iconButtonVariants({ variant, size, shape, className }))}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants, iconButtonVariants, IconButton }
