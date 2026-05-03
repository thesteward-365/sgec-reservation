import * as React from "react"
import { ConditionalNav } from "./conditional-nav"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  className?: string
  hideNav?: boolean
}

function AppShell({ children, className, hideNav = false }: AppShellProps) {
  return (
    <div className="flex justify-center min-h-dvh bg-(--color-neutral-150)">
      <div
        className={cn(
          "relative flex flex-col w-full max-w-107.5 min-h-dvh bg-(--color-neutral-150)",
          className
        )}
      >
        {children}
        {!hideNav && <ConditionalNav />}
      </div>
    </div>
  )
}

export { AppShell }
