'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from './bottom-nav'

const NO_NAV_RE = /^\/reserve\/\d/

export function ConditionalNav() {
  const pathname = usePathname()
  if (NO_NAV_RE.test(pathname ?? '')) return null
  return (
    <>
      <div style={{ height: 'calc(4.5rem + env(safe-area-inset-bottom))' }} aria-hidden />
      <BottomNav />
    </>
  )
}
