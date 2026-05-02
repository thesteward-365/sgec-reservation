'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  PURPOSE_PRESETS,
  SLOT_MINUTES,
  ReservationSchedule,
  formatLocalDate,
  formatMinuteLabel,
  formatMinuteRange,
  getDateTimeForMinute,
  getEndOptions,
  getFreeRanges,
  getStartOptions,
  normalizeReservations,
  overlapsExistingRange,
  parseLocalDate,
} from '@/lib/services/reservation-slots'

type PlaceDetailViewProps = {
  place: { id: number; name: string; description: string | null; floorName: string | null }
  currentUser: { id: number; name: string }
  initialDate?: string
}

const SELECT_CLASSNAME =
  'w-full rounded-sm border border-border-subtle bg-background px-[14px] py-[11px] text-body font-medium text-foreground outline-none transition-[border-color,box-shadow] duration-120 ease-(--ease-standard) focus:border-primary focus:shadow-(--shadow-focus)'

function getInitialDate(value?: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return formatLocalDate(parseLocalDate(value) ?? today)
}

function formatDisplayDate(dateText: string) {
  const date = parseLocalDate(dateText)
  if (!date) return dateText

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function PlaceDetailView({ place, currentUser, initialDate }: PlaceDetailViewProps) {
  const [selectedDate, setSelectedDate] = useState(getInitialDate(initialDate))
  const [reservations, setReservations] = useState<ReservationSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingReservationId, setEditingReservationId] = useState<number | null>(null)
  const [startMinute, setStartMinute] = useState<number | null>(null)
  const [endMinute, setEndMinute] = useState<number | null>(null)
  const [purpose, setPurpose] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    async function loadReservations() {
      setLoading(true)

      try {
        const response = await fetch(
          `/api/reservations?placeId=${place.id}&date=${selectedDate}`,
          { cache: 'no-store' }
        )

        if (!response.ok) {
          throw new Error('예약 현황을 불러오지 못했습니다.')
        }

        const data = (await response.json()) as ReservationSchedule[]
        if (!cancelled) {
          setReservations(data)
          setEditingReservationId(null)
          setStartMinute(null)
          setEndMinute(null)
          setPurpose('')
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : '예약 현황을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReservations()

    return () => {
      cancelled = true
    }
  }, [place.id, selectedDate])

  const normalizedReservations = normalizeReservations(reservations)
  const ownReservations = normalizedReservations.filter(
    (reservation) => reservation.userId === currentUser.id
  )
  const freeRanges = getFreeRanges(normalizedReservations, editingReservationId)
  const startOptions = getStartOptions(normalizedReservations, editingReservationId)
  const endOptions =
    startMinute === null ? [] : getEndOptions(startMinute, normalizedReservations, editingReservationId)
  const hasInvalidRange =
    startMinute !== null &&
    endMinute !== null &&
    overlapsExistingRange(startMinute, endMinute, normalizedReservations, editingReservationId)

  function handleQuickRangeSelect(rangeStartMinute: number, rangeEndMinute: number) {
    setEditingReservationId(null)
    setStartMinute(rangeStartMinute)
    setEndMinute(rangeEndMinute)
  }

  function handleStartMinuteChange(nextStartMinute: number) {
    const nextEndOptions = getEndOptions(nextStartMinute, normalizedReservations, editingReservationId)
    setStartMinute(nextStartMinute)
    setEndMinute((currentEndMinute) => {
      if (currentEndMinute && nextEndOptions.includes(currentEndMinute)) {
        return currentEndMinute
      }

      return nextEndOptions[0] ?? null
    })
  }

  function handleEditReservation(reservationId: number) {
    const reservation = ownReservations.find((item) => item.id === reservationId)
    if (!reservation) return

    setEditingReservationId(reservation.id)
    setStartMinute(reservation.startMinute)
    setEndMinute(reservation.endMinute)
    setPurpose(reservation.purpose)
  }

  function handleResetEditor() {
    setEditingReservationId(null)
    setStartMinute(null)
    setEndMinute(null)
    setPurpose('')
  }

  function handleSubmit() {
    if (startMinute === null || endMinute === null || !purpose.trim()) {
      toast.error('시간과 사용 목적을 모두 입력해 주세요.')
      return
    }

    startTransition(async () => {
      const response = await fetch(
        editingReservationId ? `/api/reservations/${editingReservationId}` : '/api/reservations',
        {
          method: editingReservationId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId: place.id,
            startTime: getDateTimeForMinute(selectedDate, startMinute).toISOString(),
            endTime: getDateTimeForMinute(selectedDate, endMinute).toISOString(),
            purpose: purpose.trim(),
          }),
        }
      )

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(data.error ?? '예약 저장에 실패했습니다.')
        return
      }

      toast.success(editingReservationId ? '예약을 수정했습니다.' : '예약을 등록했습니다.')
      handleResetEditor()
      setLoading(true)
      const refreshed = await fetch(`/api/reservations?placeId=${place.id}&date=${selectedDate}`, {
        cache: 'no-store',
      })
      const refreshedData = (await refreshed.json()) as ReservationSchedule[]
      setReservations(refreshedData)
      setLoading(false)
    })
  }

  function handleDeleteReservation(reservationId: number) {
    if (!window.confirm('이 예약을 취소할까요?')) return

    startTransition(async () => {
      const response = await fetch(`/api/reservations/${reservationId}`, { method: 'DELETE' })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        toast.error(data.error ?? '예약 취소에 실패했습니다.')
        return
      }

      toast.success('예약을 취소했습니다.')
      if (editingReservationId === reservationId) {
        handleResetEditor()
      }
      setReservations((currentReservations) =>
        currentReservations.filter((reservation) => reservation.id !== reservationId)
      )
    })
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <div className="flex items-start gap-3">
        <Link
          href={`/reserve?date=${selectedDate}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-background"
        >
          <ArrowLeftIcon className="size-5 text-foreground" />
        </Link>
        <div className="min-w-0">
          <p className="text-caption text-muted-foreground">{place.floorName ?? '장소'}</p>
          <h1 className="text-title-2 font-bold text-foreground">{place.name}</h1>
          {place.description ? (
            <p className="mt-1 text-body-sm text-muted-foreground">{place.description}</p>
          ) : null}
        </div>
      </div>

      <Card className="gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-caption text-muted-foreground">예약 날짜</p>
            <p className="text-body font-semibold text-foreground">{formatDisplayDate(selectedDate)}</p>
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-auto min-w-[9.5rem]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {freeRanges.map((range) => (
            <button
              key={`${range.startMinute}-${range.endMinute}`}
              type="button"
              onClick={() => handleQuickRangeSelect(range.startMinute, range.endMinute)}
              className="rounded-pill border border-border-subtle px-3 py-2 text-overline font-semibold text-foreground transition-colors duration-120 ease-(--ease-standard) hover:bg-muted"
            >
              {formatMinuteRange(range.startMinute, range.endMinute)}
            </button>
          ))}
          {freeRanges.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">선택 가능한 빈 시간이 없습니다.</p>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader className="mb-0 px-0">
          <CardTitle>{editingReservationId ? '예약 수정' : '새 예약'}</CardTitle>
          <CardDescription>30분 단위로 선택할 수 있고, 중간에 다른 예약이 끼면 확장할 수 없습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-overline font-semibold text-muted-foreground">시작</span>
              <select
                value={startMinute ?? ''}
                onChange={(event) => handleStartMinuteChange(Number(event.target.value))}
                className={SELECT_CLASSNAME}
              >
                <option value="" disabled>
                  시작 시간 선택
                </option>
                {startOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {formatMinuteLabel(minute)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-overline font-semibold text-muted-foreground">종료</span>
              <select
                value={endMinute ?? ''}
                onChange={(event) => setEndMinute(Number(event.target.value))}
                className={SELECT_CLASSNAME}
                disabled={startMinute === null}
              >
                <option value="" disabled>
                  종료 시간 선택
                </option>
                {endOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {formatMinuteLabel(minute)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-overline font-semibold text-muted-foreground">사용 목적</span>
            <Input
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="예: 수요예배 리허설"
              maxLength={100}
            />
            <div className="flex flex-wrap gap-1.5">
              {PURPOSE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPurpose(preset)}
                  className={cn(
                    'rounded-pill border px-3 py-1.5 text-overline font-semibold transition-colors duration-120 ease-(--ease-standard)',
                    purpose === preset
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border-subtle bg-background text-foreground'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-muted/60 px-4 py-3 text-body-sm text-muted-foreground">
            {startMinute !== null && endMinute !== null
              ? `${formatMinuteRange(startMinute, endMinute)}에 ${purpose.trim() || '사용 목적'}으로 예약합니다.`
              : '빈 시간 버튼을 누르거나 시작/종료 시간을 직접 선택해 주세요.'}
          </div>
          {hasInvalidRange ? (
            <p className="text-body-sm font-medium text-destructive">선택한 시간은 기존 예약과 겹칩니다.</p>
          ) : null}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={isPending || hasInvalidRange || startMinute === null || endMinute === null}>
              {editingReservationId ? '예약 수정하기' : '예약 등록하기'}
            </Button>
            {(editingReservationId || startMinute !== null || purpose) && (
              <Button variant="secondary" onClick={handleResetEditor} disabled={isPending}>
                초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="p-5">
        <CardHeader className="mb-0 px-0">
          <CardTitle>예약 현황</CardTitle>
          <CardDescription>
            현재 날짜의 예약 {loading ? '불러오는 중' : `${normalizedReservations.length}건`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-0">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))
          ) : normalizedReservations.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">아직 등록된 예약이 없습니다.</p>
          ) : (
            normalizedReservations.map((reservation) => {
              const isOwnReservation = reservation.userId === currentUser.id

              return (
                <div
                  key={reservation.id}
                  className="rounded-2xl border border-border-subtle bg-background px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body font-semibold text-foreground">
                          {formatMinuteRange(reservation.startMinute, reservation.endMinute)}
                        </span>
                        {isOwnReservation ? <Badge>내 예약</Badge> : null}
                      </div>
                      <p className="text-body-sm text-foreground">
                        {reservation.userName ?? '이름 미상'} · {reservation.purpose}
                      </p>
                    </div>
                    {isOwnReservation ? (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleEditReservation(reservation.id)}>
                          수정
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteReservation(reservation.id)}>
                          취소
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
