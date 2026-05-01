"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { XMarkIcon } from "@heroicons/react/24/solid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [understood, setUnderstood] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("이미 가입된 전화번호입니다.", {
            action: { label: "로그인하기", onClick: () => router.push("/login") },
          })
        } else {
          toast.error(data.error ?? "회원가입에 실패했습니다.")
        }
        return
      }

      router.push("/pending")
    } catch {
      toast.error("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-14 pb-10">

      {/* 로고 헤더 — 가로 한 줄, 페이지 최상단 */}
      <div className="flex items-center gap-2.5 mb-12">
        <Image
          src="/logos/logo-default.svg"
          alt="샘깊은교회 로고"
          width={28}
          height={40}
          priority
        />
        <span className="text-body-sm font-bold text-foreground tracking-tight">
          샘깊은교회 문화사역
        </span>
      </div>

      {/* 인사말 */}
      <div className="mb-8">
        <h1 className="text-title-1 font-bold text-foreground">가입을 환영합니다.</h1>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* 이름 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">이름</Label>
          <div className="relative">
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className={cn(name && "pr-10")}
            />
            {name && (
              <button
                type="button"
                aria-label="이름 지우기"
                onClick={() => setName("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-5 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
              >
                <XMarkIcon className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* 전화번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">전화번호</Label>
          <div className="relative">
            <Input
              id="phone"
              type="tel"
              placeholder="010-0000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoComplete="tel"
              className={cn(phoneNumber && "pr-10")}
            />
            {phoneNumber && (
              <button
                type="button"
                aria-label="전화번호 지우기"
                onClick={() => setPhoneNumber("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-5 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
              >
                <XMarkIcon className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* 승인 대기 안내 동의 */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            required
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 size-4 rounded-sm accent-primary cursor-pointer shrink-0"
          />
          <span className="text-body-sm text-muted-foreground leading-snug">
            가입 후 관리자의 승인을 기다립니다.
          </span>
        </label>

        <Button type="submit" className="mt-2 w-full" disabled={loading || !understood}>
          {loading ? "가입 중..." : "가입하기"}
        </Button>
      </form>

      {/* 하단 링크 — 남는 공간이 있으면 하단으로 */}
      <p className="mt-auto pt-10 text-center text-body-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold">
          로그인하기
        </Link>
      </p>
    </div>
  )
}
