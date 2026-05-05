import { cn } from '@/lib/utils';

type ReservationDetailRow = {
  label: string;
  value: string;
};

type Props = {
  rows: ReservationDetailRow[];
  tone?: 'surface' | 'subtle';
};

export function ReservationDetailsCard({ rows, tone = 'surface' }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-3xl p-4',
        tone === 'surface' ? 'bg-card' : 'bg-neutral-50'
      )}
    >
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-start justify-between gap-3 py-3"
        >
          <span className="text-muted-foreground shrink-0 pt-0.5 text-[13px] font-medium">
            {label}
          </span>
          <span className="text-foreground text-right text-[14px] font-semibold">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
