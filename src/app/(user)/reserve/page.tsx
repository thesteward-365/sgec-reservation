import { Suspense } from "react"
import { ReserveView } from "./_components/reserve-view"

function ReserveSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-6 pb-3">
        <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-16 mx-3 rounded-md bg-muted animate-pulse" />
      <div className="h-px bg-border-subtle mx-5 mt-2 mb-3" />
      <div className="flex gap-2 px-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-12 rounded-pill bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-px bg-border-subtle mx-5 mt-3" />
      <div className="flex flex-col gap-3 px-5 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function ReservePage() {
  return (
    <Suspense fallback={<ReserveSkeleton />}>
      <ReserveView />
    </Suspense>
  )
}
