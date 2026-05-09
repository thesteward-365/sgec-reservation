"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDaysIcon as CalendarDaysOutline,
  ClipboardDocumentListIcon as ClipboardOutline,
  Cog6ToothIcon as CogOutline,
} from "@heroicons/react/24/outline"
import {
  CalendarDaysIcon as CalendarDaysSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  Cog6ToothIcon as CogSolid,
} from "@heroicons/react/24/solid"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    href: "/reserve",
    OutlineIcon: CalendarDaysOutline,
    SolidIcon: CalendarDaysSolid,
    label: "예약하기",
  },
  {
    href: "/my-reservations",
    OutlineIcon: ClipboardOutline,
    SolidIcon: ClipboardSolid,
    label: "예약 현황",
  },
  {
    href: "/settings",
    OutlineIcon: CogOutline,
    SolidIcon: CogSolid,
    label: "설정",
  },
] as const

function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-107.5 bg-card"
      style={{ boxShadow: "0 -1px 0 var(--color-border-subtle)" }}
    >
      <div
        className="mx-auto flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map(({ href, OutlineIcon, SolidIcon, label }) => {
          const isActive = pathname?.startsWith(href) ?? false
          const Icon = isActive ? SolidIcon : OutlineIcon

          return (
            <Link key={href} href={href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center gap-1 py-3",
                  "transition-colors duration-120 ease-(--ease-standard)",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon width={22} height={22} />
                <span className={cn("text-overline", isActive ? "font-bold" : "font-semibold")}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export { BottomNav }
