'use client';

import { cn, formatTimeAgo } from '@/lib/utils';

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
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--:--';
  }
}

function formatDate(iso: string | number | Date): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-월 -일';
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(d);
  } catch {
    return '-월 -일';
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

export function HistoryListItem({ item, onClick, showPlaceName }: Props) {
  const changes = typeof item.changes === 'string' ? (item.changes ? JSON.parse(item.changes) : {}) : item.changes;
  
  // Handle potentially incorrect timestamps (seconds vs ms)
  let createdAtDate: Date;
  if (item.createdAt instanceof Date) {
    createdAtDate = item.createdAt;
  } else {
    const raw = Number(item.createdAt);
    const ms = raw < 10000000000 ? raw * 1000 : raw;
    createdAtDate = new Date(ms);
  }

  const formatValue = (key: string, value: any) => {
    if (key === 'startTime' || key === 'endTime') {
      return formatTime(value);
    }
    return value;
  };

  const labels: Record<string, string> = {
    startTime: '시작 시간',
    endTime: '종료 시간',
    purpose: '사용 목적',
    placeName: '장소',
    date: '날짜'
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-2xl bg-white p-4 shadow-(--shadow-1) transition-colors",
        onClick && "cursor-pointer active:bg-neutral-50"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white",
            getActionStyles(item.actionType)
          )}>
            {getActionLabel(item.actionType)}
          </span>
          <span className="text-body font-bold">{item.actorUserName}</span>
          {showPlaceName && item.placeName && (
            <span className="text-caption text-muted-foreground truncate max-w-[120px]">
              · {item.placeName}
            </span>
          )}
        </div>
        <span className="text-caption text-muted-foreground">
          {formatTimeAgo(createdAtDate)}
        </span>
      </div>

      <div className="space-y-2 border-t border-neutral-50 pt-3">
        {item.actionType === 'updated' && changes && Object.keys(changes).length > 0 ? (
          Object.entries(changes).map(([key, value]: [string, any]) => {
            if (key === 'cancelled') return null;
            return (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground font-medium w-16 shrink-0">{labels[key] || key}</span>
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="line-through opacity-40 truncate">{formatValue(key, value.from)}</span>
                  <span className="opacity-30">→</span>
                  <span className="font-semibold text-blue-600 truncate">{formatValue(key, value.to)}</span>
                </div>
              </div>
            );
          })
        ) : item.actionType === 'created' ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium w-16 shrink-0">장소</span>
              <span className="font-semibold truncate">{item.placeName || '알 수 없음'}</span>
            </div>
            {changes?.startTime && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-medium w-16 shrink-0">날짜</span>
                  <span className="font-semibold">{formatDate(changes.startTime)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-medium w-16 shrink-0">시간</span>
                  <span className="font-semibold">{formatTime(changes.startTime)} ~ {formatTime(changes.endTime)}</span>
                </div>
              </>
            )}
            {changes?.purpose && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground font-medium w-16 shrink-0">목적</span>
                <span className="font-semibold truncate">{changes.purpose}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium text-red-600">예약을 취소했습니다.</p>
        )}
      </div>
    </div>
  );
}
