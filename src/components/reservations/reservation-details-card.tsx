import { cn } from '@/lib/utils';

type ReservationDetailRow = {
  label: string;
  value: string;
};

type Props = {
  rows: ReservationDetailRow[];
  tone?: 'surface' | 'subtle' | 'white';
};

export function ReservationDetailsCard({ rows, tone = 'surface' }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-3xl p-8',
        tone === 'surface' && 'bg-gray-50',
        tone === 'subtle' && 'bg-neutral-50',
        tone === 'white' && 'bg-white! shadow-(--shadow-1)'
      )}
    >
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-start justify-between">
          <span className="text-muted-foreground shrink-0 pt-0.5 font-medium">
            {label}
          </span>
          <span className="text-foreground text-right font-semibold">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
