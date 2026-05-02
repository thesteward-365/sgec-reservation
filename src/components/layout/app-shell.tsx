import * as React from "react"
import { BottomNav } from "./bottom-nav"
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
        style={!hideNav ? { paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" } : undefined}
      >
        {children}
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}

export { AppShell }
