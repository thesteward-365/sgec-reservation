import { Suspense } from "react"
import { cookies } from "next/headers"
import { getIronSession } from "iron-session"
import { sessionOptions, SessionData } from "@/lib/session"
import { ReserveView } from "./_components/reserve-view"

function ReserveSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-muted animate-pulse" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="px-5 pt-2 pb-4">
        <div className="h-14 w-48 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="mx-5 mb-4 h-24 rounded-2xl bg-muted animate-pulse" />
      <div className="flex flex-col gap-2 px-5 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}

async function ReservePageInner() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  const userName = session.user?.name
  return <ReserveView userName={userName} />
}

export default function ReservePage() {
  return (
    <Suspense fallback={<ReserveSkeleton />}>
      <ReservePageInner />
    </Suspense>
  )
}
