import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { isHalfHourRange } from '@/lib/services/reservation-slots';
import { ReservationService } from '@/lib/services/reservation-service';
import { ReservationRepository } from '@/lib/repositories/reservation-repository';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const reservationId = parseInt(id);
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { error: '유효하지 않은 예약 ID입니다.' },
        { status: 400 }
      );
    }

    await ReservationService.cancelReservation(reservationId, session.user);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/reservations/[id] error:', error);
    const status = error.message.includes('찾을 수 없거나') ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const reservationId = parseInt(id);
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { error: '유효하지 않은 예약 ID입니다.' },
        { status: 400 }
      );
    }

    const { placeId, startTime, endTime, purpose } = await request.json();
    const start = new Date(startTime);
    const end = new Date(endTime);
    const trimmedPurpose = purpose?.trim();
    const nextPlaceId = Number(placeId);

    // 유효성 검사
    if (!trimmedPurpose) {
      return NextResponse.json(
        { error: '사용 목적을 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json(
        { error: '유효하지 않은 시간입니다.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(nextPlaceId) || nextPlaceId <= 0) {
      return NextResponse.json(
        { error: '유효하지 않은 장소입니다.' },
        { status: 400 }
      );
    }

    if (!isHalfHourRange(start, end)) {
      return NextResponse.json(
        { error: '예약은 30분 단위로만 가능합니다.' },
        { status: 400 }
      );
    }

    // 장소 존재 여부 확인
    const place = await ReservationRepository.findPlaceById(nextPlaceId);
    if (!place) {
      return NextResponse.json(
        { error: '선택한 장소를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updated = await ReservationService.updateReservation(
      reservationId,
      session.user,
      {
        placeId: nextPlaceId,
        startTime: start,
        endTime: end,
        purpose: trimmedPurpose,
      }
    );

    const { googleEventId: _, ...response } = updated;
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('PATCH /api/reservations/[id] error:', error);
    let status = 500;
    if (error.message.includes('이미 예약이 있습니다')) status = 409;
    if (error.message.includes('찾을 수 없거나')) status = 404;
    if (error.message.includes('수정할 수 없습니다')) status = 400;

    return NextResponse.json({ error: error.message }, { status });
  }
}
