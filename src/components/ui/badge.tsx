import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-semibold leading-none tracking-[0.012em] rounded-pill",
  {
    variants: {
      variant: {
        solid: "text-white px-[10px] py-[6px] text-overline",
        subtle: "px-[10px] py-[6px] text-overline",
        outline: "bg-background text-foreground border border-border-subtle px-[10px] py-[5px] text-overline",
      },
      color: {
        blue: "",
        green: "",
        red: "",
        orange: "",
        violet: "",
        neutral: "",
      },
    },
    compoundVariants: [
      { variant: "solid", color: "blue", className: "bg-primary" },
      { variant: "solid", color: "green", className: "bg-[var(--color-success)]" },
      { variant: "solid", color: "red", className: "bg-[var(--color-danger)]" },
      { variant: "solid", color: "orange", className: "bg-[var(--color-warning)]" },
      { variant: "solid", color: "neutral", className: "bg-[var(--color-fg)]" },
      { variant: "subtle", color: "blue", className: "bg-accent text-accent-foreground" },
      { variant: "subtle", color: "green", className: "bg-[var(--color-success-subtle)] text-[var(--color-success)]" },
      { variant: "subtle", color: "red", className: "bg-[var(--color-danger-subtle)] text-[var(--color-red-800)]" },
      { variant: "subtle", color: "orange", className: "bg-[var(--color-warning-subtle)] text-[var(--color-orange-800)]" },
      { variant: "subtle", color: "violet", className: "bg-[var(--color-info-subtle)] text-[var(--color-violet-700)]" },
    ],
    defaultVariants: {
      variant: "subtle",
      color: "blue",
    },
  }
)

function Badge({
  className,
  variant,
  color,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, color }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
