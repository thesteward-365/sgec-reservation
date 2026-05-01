import * as React from "react"
import { Label as RadixLabel } from "radix-ui"
import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof RadixLabel.Root>) {
  return (
    <RadixLabel.Root
      data-slot="label"
      className={cn(
        "text-caption font-semibold text-foreground leading-[1.4]",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
}

export { Label }
