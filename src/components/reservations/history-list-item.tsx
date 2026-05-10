'use client';

import { cn, formatTimeAgo } from '@/lib/utils';
import { fromDbDate } from '@/lib/db/db-utils';

export interface HistoryItem {
  id: number;
  reservationId: number;
  actionType: 'created' | 'updated' | 'cancelled';
  actorUserName: string;
  changes: string | any;
  createdAt: number | Date;
  placeName?: string | null;
}

interface Props {
  item: HistoryItem;
  onClick?: () => void;
  showPlaceName?: boolean;
}

function formatTime(iso: string | number | Date): string {
  try {
    const d = fromDbDate(iso);
    if (isNaN(d.getTime())) return '-';
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const hours = String(kst.getUTCHours()).padStart(2, '0');
    const minutes = String(kst.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

function formatDate(iso: string | number | Date): string {
  try {
    const d = fromDbDate(iso);
    if (isNaN(d.getTime())) return '-';
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const month = kst.getUTCMonth() + 1;
    const day = kst.getUTCDate();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][kst.getUTCDay()];
    return `${month}월 ${day}일 (${weekday})`;
  } catch {
    return '-';
  }
}

function isSameDay(d1: any, d2: any): boolean {
  try {
    const date1 = fromDbDate(d1);
    const date2 = fromDbDate(d2);
    const kst1 = new Date(date1.getTime() + 9 * 60 * 60 * 1000);
    const kst2 = new Date(date2.getTime() + 9 * 60 * 60 * 1000);
    return (
      kst1.getUTCFullYear() === kst2.getUTCFullYear() &&
      kst1.getUTCMonth() === kst2.getUTCMonth() &&
      kst1.getUTCDate() === kst2.getUTCDate()
    );
  } catch {
    return false;
  }
}

const getActionStyles = (type: string) => {
  switch (type) {
    case 'created': return 'bg-green-500';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-blue-500';
  }
};

const getActionLabel = (type: string) => {
  switch (type) {
    case 'created': return '생성';
    case 'cancelled': return '취소';
    default: return '수정';
  }
};

export function HistoryListItem({ item, onClick }: Props) {
  const changes = typeof item.changes === 'string' ? (item.changes ? JSON.parse(item.changes) : {}) : item.changes;
  
  const createdAtDate = fromDbDate(item.createdAt);

  const formatValue = (key: string, value: any) => {
    if (key === 'startTime' || key === 'endTime') {
      return formatTime(value);
    }
    return value || '-';
  };

  const labels: Record<string, string> = {
    startTime: '시작 시간',
    endTime: '종료 시간',
    purpose: '사용 목적',
    placeName: '장소',
    placeId: '장소',
    place_id: '장소',
    place: '장소',
    date: '날짜',
    userName: '예약자'
  };

  // Extract snapshot if available (for created/cancelled)
  const snapshot = actionTypeToSnapshot(item.actionType, changes);
  const displayPlaceName = item.placeName || snapshot?.placeName || '-';

  function actionTypeToSnapshot(type: string, changes: any) {
    if (type === 'created') return changes.created?.to || changes.snapshot;
    if (type === 'cancelled') return changes.snapshot;
    return null;
  }

  const dateChanged = item.actionType === 'updated' && changes?.startTime && !isSameDay(changes.startTime.from, changes.startTime.to);
  const startTimeActuallyChanged = item.actionType === 'updated' && changes?.startTime && formatTime(changes.startTime.from) !== formatTime(changes.startTime.to);
  const endTimeActuallyChanged = item.actionType === 'updated' && changes?.endTime && formatTime(changes.endTime.from) !== formatTime(changes.endTime.to);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-2xl bg-white p-4 shadow-(--shadow-1) transition-colors",
        onClick && "cursor-pointer active:bg-neutral-50"
      )}
    >
      {/* Header: [Type] [Actor]-[Place] [Time] */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 overflow-hidden text-body">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white shrink-0",
            getActionStyles(item.actionType)
          )}>
            {getActionLabel(item.actionType)}
          </span>
          <span className="font-bold truncate">
            {item.actorUserName}-{displayPlaceName}
          </span>
        </div>
        <span className="text-caption text-muted-foreground shrink-0 ml-2">
          {formatTimeAgo(createdAtDate)}
        </span>
      </div>

      <div className="space-y-2 border-t border-neutral-50 pt-3">
        {item.actionType === 'updated' && changes && Object.keys(changes).length > 0 ? (
          /* Updated: show only modified fields */
          <div className="space-y-1.5">
            {dateChanged && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground font-medium w-16 shrink-0">{labels.date}</span>
                <div className="flex flex-1 items-center gap-2 overflow-hidden text-[13px]">
                  <span className="line-through opacity-40 truncate">{formatDate(changes.startTime.from)}</span>
                  <span className="opacity-30">→</span>
                  <span className="font-semibold text-blue-600 truncate">{formatDate(changes.startTime.to)}</span>
                </div>
              </div>
            )}
            {Object.entries(changes).map(([key, value]: [string, any]) => {
              if (key === 'cancelled') return null;
              if (key === 'startTime' && !startTimeActuallyChanged) return null;
              if (key === 'endTime' && !endTimeActuallyChanged) return null;

              return (
                <div key={key} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-medium w-16 shrink-0">{labels[key] || key}</span>
                  <div className="flex flex-1 items-center gap-2 overflow-hidden text-[13px]">
                    <span className="line-through opacity-40 truncate">{formatValue(key, value.from)}</span>
                    <span className="opacity-30">→</span>
                    <span className="font-semibold text-blue-600 truncate">{formatValue(key, value.to)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Created/Cancelled/Fallback: show fields or '-' */
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium w-16 shrink-0">예약자</span>
              <span className="font-semibold">{item.actorUserName || '-'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium w-16 shrink-0">장소</span>
              <span className="font-semibold truncate">{displayPlaceName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium w-16 shrink-0">날짜</span>
              <span className="font-semibold">{snapshot?.startTime ? formatDate(snapshot.startTime) : '-'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium w-16 shrink-0">시간</span>
              <span className="font-semibold">
                {snapshot?.startTime ? formatTime(snapshot.startTime) : '-'} ~ {snapshot?.endTime ? formatTime(snapshot.endTime) : '-'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium w-16 shrink-0">사용 목적</span>
              <span className="font-semibold truncate">{snapshot?.purpose || '-'}</span>
            </div>
            {item.actionType === 'cancelled' && (
              <p className="text-caption font-bold text-red-500 mt-2">이 예약은 취소되었습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
