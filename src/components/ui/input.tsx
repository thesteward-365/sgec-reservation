import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full font-medium text-body text-foreground bg-background",
        "px-[14px] py-[11px] rounded-sm",
        "border border-border-subtle",
        "placeholder:text-muted-foreground",
        "outline-none transition-[border-color,box-shadow] duration-[120ms] ease-[var(--ease-standard)]",
        "focus-visible:border-primary focus-visible:shadow-[var(--shadow-focus)]",
        "aria-[invalid=true]:border-[var(--color-danger)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
