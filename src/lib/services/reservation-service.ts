import { db, fromDbDate } from '@/lib/db';
import { ReservationRepository } from '../repositories/reservation-repository';
import { UserRepository } from '../repositories/user-repository';
import {
  buildReservationHistoryChanges,
  hasReservationHistoryChanges,
} from './reservation-history';
import {
  updateGoogleEvent,
  deleteGoogleEvent,
} from '@/lib/calendar/calendar-service';
import { PlaceRepository } from '../repositories/place-repository';

export interface ReservationActor {
  id: number;
  name: string;
  role: string;
}

export interface ReservationData {
  placeId: number;
  startTime: Date;
  endTime: Date;
  purpose: string;
}

function buildReservationHistorySnapshot(data: {
  placeId: number;
  placeName?: string | null;
  userName?: string | null;
  startTime: Date;
  endTime: Date;
  purpose: string;
}) {
  return {
    placeId: data.placeId,
    placeName: data.placeName ?? null,
    userName: data.userName ?? null,
    startTime: data.startTime,
    endTime: data.endTime,
    purpose: data.purpose,
  };
}

export class ReservationService {
  /**
   * 새로운 예약을 생성합니다.
   */
  static async createReservation(
    actor: ReservationActor,
    data: ReservationData
  ) {
    // 겹침 확인
    const conflicts = await ReservationRepository.findConflicts(
      data.placeId,
      data.startTime,
      data.endTime
    );
    if (conflicts.length > 0) {
      throw new Error('해당 시간에 이미 예약이 있습니다.');
    }

    const place = await PlaceRepository.findById(data.placeId);

    const result = await db.transaction(async (tx) => {
      const reservation = await ReservationRepository.create(
        {
          userId: actor.id,
          ...data,
        },
        tx
      );

      const historyData = {
        reservationId: reservation.id,
        actorUserId: actor.id,
        actorUserName: actor.name,
        actionType: 'created' as const,
        changes: JSON.stringify({
          created: { to: data },
          snapshot: buildReservationHistorySnapshot({
            ...data,
            placeName: place?.name,
            userName: actor.name,
          }),
        }),
      };

      await ReservationRepository.createHistory(historyData, tx);
      return reservation;
    });

    // Google Calendar 비동기 업데이트
    updateGoogleEvent(result.id).catch(() => {});

    return result;
  }

  /**
   * 예약을 수정합니다.
   */
  static async updateReservation(
    reservationId: number,
    actor: ReservationActor,
    data: ReservationData
  ) {
    const isAdmin = actor.role === 'admin';

    // 기존 예약 조회 및 권한 확인
    const current = isAdmin
      ? await ReservationRepository.findById(reservationId)
      : await ReservationRepository.findByIdAndUser(reservationId, actor.id);

    if (!current) {
      throw new Error('예약을 찾을 수 없거나 권한이 없습니다.');
    }

    if (fromDbDate(current.endTime) < new Date()) {
      throw new Error('지난 예약은 수정할 수 없습니다.');
    }

    // 겹침 확인 (자기 자신 제외)
    const conflicts = await ReservationRepository.findConflicts(
      data.placeId,
      data.startTime,
      data.endTime,
      reservationId
    );
    if (conflicts.length > 0) {
      throw new Error('해당 시간에 이미 예약이 있습니다.');
    }

    // 변경 사항 계산
    const changes = buildReservationHistoryChanges(
      {
        placeId: current.placeId,
        startTime: fromDbDate(current.startTime),
        endTime: fromDbDate(current.endTime),
        purpose: current.purpose,
      },
      {
        placeId: data.placeId,
        startTime: data.startTime,
        endTime: data.endTime,
        purpose: data.purpose,
      }
    );

    if (!hasReservationHistoryChanges(changes)) {
      return current;
    }

    const result = await db.transaction(async (tx) => {
      const updated = await ReservationRepository.update(
        reservationId,
        data,
        tx
      );
      await ReservationRepository.createHistory(
        {
          reservationId,
          actorUserId: actor.id,
          actorUserName: actor.name,
          actionType: 'updated',
          changes: JSON.stringify(changes),
        },
        tx
      );
      return updated;
    });

    // Google Calendar 비동기 업데이트
    updateGoogleEvent(reservationId).catch(() => {});

    return result;
  }

  /**
   * 예약을 취소합니다.
   */
  static async cancelReservation(
    reservationId: number,
    actor: ReservationActor
  ) {
    const isAdmin = actor.role === 'admin';

    // 기존 예약 조회 및 권한 확인
    const current = isAdmin
      ? await ReservationRepository.findById(reservationId)
      : await ReservationRepository.findByIdAndUser(reservationId, actor.id);

    if (!current) {
      throw new Error('예약을 찾을 수 없거나 권한이 없습니다.');
    }

    if (current.status === 'cancelled') {
      throw new Error('이미 취소된 예약입니다.');
    }

    const place = await PlaceRepository.findById(current.placeId);
    const reservationUser = await UserRepository.findById(current.userId);

    const result = await db.transaction(async (tx) => {
      const updated = await ReservationRepository.update(
        reservationId,
        { status: 'cancelled' },
        tx
      );
      await ReservationRepository.createHistory(
        {
          reservationId,
          actorUserId: actor.id,
          actorUserName: actor.name,
          actionType: 'cancelled',
          changes: JSON.stringify({
            cancelled: { from: 'active', to: 'cancelled' },
            snapshot: buildReservationHistorySnapshot({
              placeId: current.placeId,
              placeName: place?.name,
              userName: reservationUser?.name,
              startTime: fromDbDate(current.startTime),
              endTime: fromDbDate(current.endTime),
              purpose: current.purpose,
            }),
          }),
          googleEventId: current.googleEventId,
        },
        tx
      );
      return updated;
    });

    // Google Calendar 이벤트 삭제
    if (current.googleEventId) {
      deleteGoogleEvent(current.googleEventId).catch(() => {});
    }

    return result;
  }
}
