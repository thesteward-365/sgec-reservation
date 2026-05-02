"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRightIcon } from "@heroicons/react/24/outline"
import { WeeklyCalendar } from "@/components/ui/weekly-calendar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Floor = { id: number; name: string; order: number }
type Tag = { id: number; name: string }
type Place = {
  id: number
  name: string
  description: string | null
  floorId: number
  floorName: string | null
  tags: { id: number | null; name: string | null }[]
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseDateParam(str: string | null): Date | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const [y, mo, d] = str.split("-").map(Number)
  const date = new Date(y, mo - 1, d)
  return isNaN(date.getTime()) ? null : date
}

const CHIP =
  "inline-flex items-center font-medium leading-none rounded-pill px-3 py-[6px] text-caption transition-colors duration-120 ease-(--ease-standard) cursor-pointer select-none whitespace-nowrap"

export function ReserveView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [selectedDate, setSelectedDate] = useState<Date>(
    () => parseDateParam(searchParams.get("date")) ?? today
  )
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(
    () => (searchParams.get("floor") ? Number(searchParams.get("floor")) : null)
  )
  const [selectedTagId, setSelectedTagId] = useState<number | null>(
    () => (searchParams.get("tag") ? Number(searchParams.get("tag")) : null)
  )

  const [floors, setFloors] = useState<Floor[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(true)

  useEffect(() => {
    fetch("/api/floors").then((r) => r.json()).then(setFloors).catch(() => {})
    fetch("/api/tags").then((r) => r.json()).then(setTags).catch(() => {})
  }, [])

  useEffect(() => {
    setLoadingPlaces(true)
    const params = new URLSearchParams()
    if (selectedFloorId) params.set("floorId", String(selectedFloorId))
    if (selectedTagId) params.set("tagId", String(selectedTagId))
    fetch(`/api/places?${params}`)
      .then((r) => r.json())
      .then((data) => { setPlaces(data); setLoadingPlaces(false) })
      .catch(() => setLoadingPlaces(false))
  }, [selectedFloorId, selectedTagId])

  const pushUrl = useCallback(
    (date: Date, floorId: number | null, tagId: number | null) => {
      const params = new URLSearchParams()
      params.set("date", formatLocalDate(date))
      if (floorId) params.set("floor", String(floorId))
      if (tagId) params.set("tag", String(tagId))
      router.replace(`/reserve?${params}`, { scroll: false })
    },
    [router]
  )

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    pushUrl(date, selectedFloorId, selectedTagId)
  }

  function handleFloorToggle(id: number) {
    const next = selectedFloorId === id ? null : id
    setSelectedFloorId(next)
    pushUrl(selectedDate, next, selectedTagId)
  }

  function handleTagToggle(id: number) {
    const next = selectedTagId === id ? null : id
    setSelectedTagId(next)
    pushUrl(selectedDate, selectedFloorId, next)
  }

  return (
    <div className="flex flex-col">
      {/* sticky: 헤더 + 캘린더 + 필터 */}
      <div className="sticky top-0 z-10 bg-(--color-neutral-150)">
        <div className="px-5 pt-6 pb-2">
          <h1 className="text-title-2 font-bold text-foreground">예약하기</h1>
        </div>

        {/* 캘린더 카드 */}
        <div className="mx-5 mb-4 rounded-2xl bg-card shadow-(--shadow-1) px-2 py-3.5">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* 필터 */}
        {(floors.length > 0 || tags.length > 0) && (
          <div className="px-5 pb-4 flex flex-col gap-2.5">
            {floors.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {floors.map((floor) => (
                  <button
                    key={floor.id}
                    onClick={() => handleFloorToggle(floor.id)}
                    className={cn(
                      CHIP,
                      selectedFloorId === floor.id
                        ? "bg-(--color-fg-strong) text-white"
                        : "bg-neutral-300 text-foreground"
                    )}
                  >
                    {floor.name}
                  </button>
                ))}
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={cn(
                      CHIP,
                      selectedTagId === tag.id
                        ? "bg-(--color-fg-strong) text-white"
                        : "bg-neutral-300 text-foreground"
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 장소 목록 */}
      <div className="flex flex-col gap-2 px-5 py-3">
        {loadingPlaces ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : places.length === 0 ? (
          <p className="text-center text-body-sm text-muted-foreground py-16">
            등록된 장소가 없습니다.
          </p>
        ) : (
          places.map((place) => (
            <Link
              key={place.id}
              href={`/reserve/${place.id}?date=${formatLocalDate(selectedDate)}`}
            >
              <div className="flex items-center gap-3 px-4.5 py-4 rounded-2xl bg-card shadow-(--shadow-1)">
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-body-lg font-bold text-foreground">{place.name}</span>
                    {place.floorName && (
                      <span className="text-caption text-muted-foreground">{place.floorName}</span>
                    )}
                  </div>
                  {place.tags.filter((t) => t.name).length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {place.tags
                        .filter((t) => t.name)
                        .map((tag, idx) => (
                          <Badge key={idx} variant="outline">{tag.name}</Badge>
                        ))}
                    </div>
                  )}
                  {place.description && (
                    <p className="text-caption text-muted-foreground truncate">{place.description}</p>
                  )}
                </div>
                <ChevronRightIcon className="size-5 text-muted-foreground flex-none" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
