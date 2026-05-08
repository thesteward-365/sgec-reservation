import { db, fromDbDate, isPostgres } from '@/lib/db';
import { ReservationRepository } from '../repositories/reservation-repository';
import {
  buildReservationHistoryChanges,
  hasReservationHistoryChanges,
} from './reservation-history';
import { updateGoogleEvent, deleteGoogleEvent } from '@/lib/calendar/calendar-service';
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

export class ReservationService {
  /**
   * 새로운 예약을 생성합니다.
   */
  static async createReservation(actor: ReservationActor, data: ReservationData) {
    // 겹침 확인
    const conflicts = await ReservationRepository.findConflicts(data.placeId, data.startTime, data.endTime);
    if (conflicts.length > 0) {
      throw new Error('해당 시간에 이미 예약이 있습니다.');
    }

    const place = await PlaceRepository.findById(data.placeId);

    const performTransaction = (tx: any) => {
      const reservation = ReservationRepository.create({
        userId: actor.id,
        ...data,
      }, tx);

      const historyData = {
        reservationId: isPostgres ? 0 : reservation.id, // Will fix ID for postgres in then()
        actorUserId: actor.id,
        actorUserName: actor.name,
        actionType: 'created' as const,
        changes: JSON.stringify({ 
          created: { to: data },
          snapshot: {
            ...data,
            placeName: place?.name
          }
        }),
      };

      if (isPostgres) {
        return (reservation as Promise<any>).then((res) => {
          historyData.reservationId = res.id;
          return ReservationRepository.createHistory(historyData, tx).then(() => res);
        });
      } else {
        ReservationRepository.createHistory({
          ...historyData,
          reservationId: reservation.id
        }, tx);
        return reservation;
      }
    };

    const result = isPostgres 
      ? await db.transaction(async (tx) => await performTransaction(tx))
      : db.transaction((tx) => performTransaction(tx));

    // Google Calendar 비동기 업데이트
    updateGoogleEvent(result.id).catch(() => {});

    return result;
  }

  /**
   * 예약을 수정합니다.
   */
  static async updateReservation(reservationId: number, actor: ReservationActor, data: ReservationData) {
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
    const conflicts = await ReservationRepository.findConflicts(data.placeId, data.startTime, data.endTime, reservationId);
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

    const performTransaction = (tx: any) => {
      const updated = ReservationRepository.update(reservationId, data, tx);
      const history = ReservationRepository.createHistory({
        reservationId,
        actorUserId: actor.id,
        actorUserName: actor.name,
        actionType: 'updated',
        changes: JSON.stringify(changes),
      }, tx);

      if (isPostgres) {
        return Promise.all([updated, history]).then(([res]) => res);
      } else {
        return updated;
      }
    };

    const result = isPostgres
      ? await db.transaction(async (tx) => await performTransaction(tx))
      : db.transaction((tx) => performTransaction(tx));

    // Google Calendar 비동기 업데이트
    updateGoogleEvent(reservationId).catch(() => {});

    return result;
  }

  /**
   * 예약을 취소합니다.
   */
  static async cancelReservation(reservationId: number, actor: ReservationActor) {
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

    const performTransaction = (tx: any) => {
      const updated = ReservationRepository.update(reservationId, { status: 'cancelled' }, tx);
      const history = ReservationRepository.createHistory({
        reservationId,
        actorUserId: actor.id,
        actorUserName: actor.name,
        actionType: 'cancelled',
        changes: JSON.stringify({ 
          cancelled: { from: 'active', to: 'cancelled' },
          snapshot: {
            placeId: current.placeId,
            placeName: place?.name,
            startTime: fromDbDate(current.startTime),
            endTime: fromDbDate(current.endTime),
            purpose: current.purpose,
          }
        }),
        googleEventId: current.googleEventId,
      }, tx);

      if (isPostgres) {
        return Promise.all([updated, history]).then(([res]) => res);
      } else {
        return updated;
      }
    };

    const result = isPostgres
      ? await db.transaction(async (tx) => await performTransaction(tx))
      : db.transaction((tx) => performTransaction(tx));

    // Google Calendar 이벤트 삭제
    if (current.googleEventId) {
      deleteGoogleEvent(current.googleEventId).catch(() => {});
    }

    return result;
  }
}
