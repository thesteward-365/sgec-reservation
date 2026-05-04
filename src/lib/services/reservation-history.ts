type ReservationSnapshot = {
  placeId: number;
  startTime: Date;
  endTime: Date;
  purpose: string;
};

export type ReservationHistoryChanges = Partial<{
  placeId: { from: number; to: number };
  startTime: { from: string; to: string };
  endTime: { from: string; to: string };
  purpose: { from: string; to: string };
}>;

export function buildReservationHistoryChanges(
  before: ReservationSnapshot,
  after: ReservationSnapshot
): ReservationHistoryChanges {
  const changes: ReservationHistoryChanges = {};

  if (before.placeId !== after.placeId) {
    changes.placeId = { from: before.placeId, to: after.placeId };
  }

  if (before.startTime.toISOString() !== after.startTime.toISOString()) {
    changes.startTime = {
      from: before.startTime.toISOString(),
      to: after.startTime.toISOString(),
    };
  }

  if (before.endTime.toISOString() !== after.endTime.toISOString()) {
    changes.endTime = {
      from: before.endTime.toISOString(),
      to: after.endTime.toISOString(),
    };
  }

  if (before.purpose !== after.purpose) {
    changes.purpose = { from: before.purpose, to: after.purpose };
  }

  return changes;
}

export function hasReservationHistoryChanges(
  changes: ReservationHistoryChanges
): boolean {
  return Object.keys(changes).length > 0;
}
