type ReservationDetailRow = {
  label: string;
  value: string;
};

type Props = {
  rows: ReservationDetailRow[];
  tone?: 'subtle' | 'surface';
};

export function ReservationDetailsCard({
  rows,
  tone = 'subtle',
}: Props) {
  return (
    <div
      className={
        tone === 'surface'
          ? 'bg-card flex flex-col gap-3 rounded-3xl px-4 py-4 shadow-(--shadow-1)'
          : 'flex flex-col gap-3 rounded-3xl bg-neutral-100 px-4 py-4'
      }
    >
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className={
            tone === 'surface'
              ? 'flex items-start justify-between gap-3 rounded-2xl bg-neutral-50 px-3.5 py-3'
              : 'flex items-start justify-between gap-3 rounded-2xl px-3.5 py-2'
          }
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
