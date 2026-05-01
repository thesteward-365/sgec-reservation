"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ClipboardList, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/reserve", icon: CalendarDays, label: "예약하기" },
  { href: "/my-reservations", icon: ClipboardList, label: "나의 예약" },
  { href: "/settings", icon: Settings, label: "설정" },
] as const

function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border-subtle">
      <div className="mx-auto max-w-107.5 flex" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname?.startsWith(href) ?? false
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3",
                "transition-colors duration-120 ease-(--ease-standard)",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="text-overline font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export { BottomNav }
