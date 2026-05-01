import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sessionOptions, SessionData } from "@/lib/session"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function PendingPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.user) {
    redirect("/login")
  }

  if (session.user.status === "approved") {
    redirect("/reserve")
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-10 text-muted-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>

      <h1 className="text-title-2 font-bold text-foreground">승인 대기 중</h1>

      <div className="mt-3 flex flex-col gap-1">
        <p className="text-body text-muted-foreground">
          <span className="font-semibold text-foreground">{session.user.name}</span>님, 가입 신청이 완료되었습니다.
        </p>
        <p className="text-body text-muted-foreground">
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </p>
      </div>

      <div className="mt-10 w-full max-w-xs rounded-2xl border border-border-subtle bg-muted/40 px-5 py-4 text-left">
        <p className="text-caption font-semibold text-muted-foreground">가입 정보</p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-body-sm text-muted-foreground">이름</span>
            <span className="text-body-sm font-medium text-foreground">{session.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-body-sm text-muted-foreground">전화번호</span>
            <span className="text-body-sm font-medium text-foreground">{session.user.phoneNumber}</span>
          </div>
        </div>
      </div>

      <form action="/api/auth/logout" method="POST" className="mt-10 w-full max-w-xs">
        <Button type="submit" variant="secondary" className="w-full">
          로그아웃
        </Button>
      </form>
    </div>
  )
}
