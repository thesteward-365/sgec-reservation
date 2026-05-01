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
    <div className="flex justify-center min-h-dvh bg-background">
      <div
        className={cn(
          "relative w-full max-w-[430px] min-h-dvh bg-background",
          !hideNav && "pb-[72px]",
          className
        )}
      >
        {children}
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}

export { AppShell }
